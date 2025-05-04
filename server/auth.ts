import { Express, Request, Response, NextFunction } from "express";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { IStorage } from "./storage";
import { User } from "@shared/schema";

// Create OAuth client
const createOAuth2Client = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  // When exchanging the one-time code (PKCE flow) we use the special value
  // "postmessage" as redirect_uri. For the classic redirect flow we also
  // support GOOGLE_REDIRECT_URI env.
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "postmessage";

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

// Helper to load creds from session
function authFromSession(req: Request) {
  const { tokens } = req.session as any;
  if (!tokens) {
    console.log(`No tokens found in session for request to ${req.path}`);
    if (req.session.userId) {
      console.log(`Session has userId ${req.session.userId} but no tokens`);
    }
    return null;
  }
  console.log(`Found tokens in session for request to ${req.path}`);
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

// Setup authentication routes
export function setupAuth(app: Express, storage: IStorage) {
  const oauth2Client = createOAuth2Client();

  // Kick-off login
  app.get("/api/auth", (req: Request, res: Response) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ]
    });
    res.redirect(url);
  });

  // OAuth callback
  app.get("/api/auth/callback", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.query;
      if (!code) throw new Error('No code in query');

      const { tokens } = await oauth2Client.getToken(code as string);
      
      // Store tokens in session
      (req.session as any).tokens = tokens;

      // Get user info
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const { data } = await oauth2.userinfo.get();
      
      if (!data.email) {
        throw new Error('No email found in user info');
      }

      // Store or update user in database
      const user = await storage.getUserByUsername(data.email);
      if (user) {
        await storage.updateUserTokens(
          user.id,
          tokens.access_token!,
          tokens.refresh_token!,
          tokens.expiry_date ? new Date(tokens.expiry_date) : undefined
        );
      } else {
        await storage.createUser({
          username: data.email,
          password: '', // Not used with Google auth
          googleId: data.id,
          name: data.name || '',
          email: data.email
        });
      }

      res.redirect('/dashboard');
    } catch (err) {
      next(err);
    }
  });

  // New endpoint: exchange authorization code (PKCE flow)
  // This is called by the front-end after GIS returns a code
  app.post("/api/auth/google", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = req.body as { code?: string };
      if (!code) {
        return res.status(400).json({ message: "No code provided" });
      }
      
      console.log("Received auth code, preparing to exchange for tokens");
      console.log("Using redirect URI:", process.env.GOOGLE_REDIRECT_URI || "postmessage");

      // Create a fresh OAuth client for this exchange
      const tempClient = createOAuth2Client();

      // Exchange the code for tokens
      console.log("Exchanging code for tokens...");
      let tokens;
      try {
        const tokenResponse = await tempClient.getToken(code);
        tokens = tokenResponse.tokens;
        console.log("Token exchange successful");
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error("Token exchange error:", error);
        return res.status(400).json({ message: "Failed to exchange code for tokens", error: errorMessage });
      }

      // Set credentials on the client so we can query userinfo
      tempClient.setCredentials(tokens);

      // Retrieve the user's profile
      const oauth2 = google.oauth2({ version: "v2", auth: tempClient });
      const { data } = await oauth2.userinfo.get();
      
      if (!data.email) {
        return res.status(400).json({ message: "Failed to obtain user email" });
      }

      // Upsert user in DB
      let user = await storage.getUserByUsername(data.email);
      if (user) {
        user = await storage.updateUserTokens(
          user.id,
          tokens.access_token!,
          tokens.refresh_token || (user.refreshToken as string) || '', // Use existing refresh token if not provided
          tokens.expiry_date ? new Date(tokens.expiry_date) : undefined
        );
      } else {
        // Create new user with tokens
        const newUser = {
          username: data.email,
          password: "", // not used
          googleId: data.id,
          name: data.name || "",
          email: data.email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || '',
          tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null
        };
        
        user = await storage.createUser(newUser);
        
        if (!user.accessToken) {
          // If tokens weren't saved during creation, update them separately
          user = await storage.updateUserTokens(
            user.id,
            tokens.access_token!,
            tokens.refresh_token || '',
            tokens.expiry_date ? new Date(tokens.expiry_date) : undefined
          );
        }
      }

      // IMPORTANT: This needs to happen before saving tokens, to ensure proper session saving
      // Set user ID in session to establish logged-in state
      req.session.userId = user.id;
      
      // Save the session explicitly to ensure it's written before we proceed
      await new Promise<void>((resolve, reject) => {
        req.session.save((err: Error | null) => {
          if (err) {
            console.error("Error saving session:", err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
      
      // After session is saved, store tokens
      (req.session as any).tokens = tokens;
      
      // Double-check session was properly saved by forcing another save
      await new Promise<void>((resolve) => {
        req.session.save(() => resolve());
      });
      
      console.log(`User ${user.id} (${user.email}) successfully authenticated and session established`);

      return res.status(200).json({ user });
    } catch (err) {
      console.error("Error during Google authentication:", err);
      next(err);
    }
  });

  // Auth middleware (applies only to /api routes)
  app.use('/api', async (req: Request, res: Response, next: NextFunction) => {
    // Allow unauthenticated access to public auth endpoints
    const publicPaths = [
      '/api/auth/status',
      '/api/auth/google',
      '/api/auth',
      '/api/auth/callback',
    ];

    if (publicPaths.includes(req.path)) {
      return next();
    }

    console.log(`Checking auth for restricted endpoint: ${req.path}`);
    console.log(`Session data: userId=${req.session.userId}, sessionID=${req.session.id}`);

    if (!req.session || !req.session.userId) {
      console.log(`No session or userId found for ${req.path}`);
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // First, check if we can get the user from storage directly
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        console.log(`User ${req.session.userId} not found in storage`);
        return res.status(401).json({ message: "User not found" });
      }

      // Then verify the token if needed
      const auth = authFromSession(req);
      if (!auth) {
        console.log(`No auth tokens for user ${user.id} (${user.email})`);
        // For now, try to continue with the user if found, even without tokens
        req.user = user;
        return next();
      }

      // Validate with Google API
      try {
        const oauth2 = google.oauth2({ version: 'v2', auth });
        const { data } = await oauth2.userinfo.get();
        
        if (!data.email) {
          console.log('No email found in Google API response');
          return res.status(401).json({ message: "Invalid user info" });
        }

        // Verify email matches
        if (data.email !== user.email) {
          console.log(`Email mismatch: Session user ${user.email}, Google API returned ${data.email}`);
          return res.status(401).json({ message: "User identity mismatch" });
        }

        console.log(`User ${user.id} (${user.email}) authenticated successfully`);
        req.user = user;
        next();
      } catch (googleErr) {
        console.error('Google API error:', googleErr);
        // Still try to continue with the user if we found one
        console.log(`Continuing with user ${user.id} despite Google API error`);
        req.user = user;
        next();
      }
    } catch (err) {
      console.error('Auth middleware error:', err);
      next(err);
    }
  });

  // Error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    res.status(500).json({ message: err.message });
  });

  // Auth status check
  app.get("/api/auth/status", async (req: Request, res: Response) => {
    console.log(`Auth status check - Session ID: ${req.session.id}`);
    console.log(`Session data: userId=${req.session.userId}, has tokens: ${Boolean((req.session as any).tokens)}`);
    
    if (!req.session.userId) {
      console.log("No userId in session, returning not authenticated");
      return res.status(200).json({
        authenticated: false,
      });
    }

    try {
      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        console.log(`User ${req.session.userId} not found in storage`);
        return res.status(200).json({
          authenticated: false,
        });
      }

      console.log(`User ${user.id} (${user.email}) found, returning authenticated status`);
      res.status(200).json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          googleId: user.googleId, // Important: Include googleId so frontend can identify real Google users
        },
      });
    } catch (error) {
      console.error("Auth status error:", error);
      res.status(500).json({
        message: "Failed to check authentication status",
      });
    }
  });

  // Endpoint to get Gmail auth URL for re-authorization
  app.get("/api/auth/gmail-auth-url", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({
        message: "User not authenticated",
      });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        return res.status(401).json({
          message: "User not found",
        });
      }
      
      // Generate authorization URL
      const oauth2Client = createOAuth2Client();
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.modify',
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email'
        ],
        // Force approval prompt to get a refresh token every time
        prompt: 'consent' 
      });
      
      console.log(`Generated Gmail auth URL for user ${user.id}`);
      return res.status(200).json({ authUrl });
    } catch (error) {
      console.error("Error generating Gmail auth URL:", error);
      return res.status(500).json({
        message: "Failed to generate Gmail authorization URL",
      });
    }
  });
  
  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          message: "Failed to logout",
        });
      }
      
      res.status(200).json({
        message: "Successfully logged out",
      });
    });
  });
}
