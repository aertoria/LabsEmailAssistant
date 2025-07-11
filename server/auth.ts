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
  if (!tokens) return null;
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

// Setup authentication routes
export function setupAuth(app: Express, storage: IStorage) {
  const oauth2Client = createOAuth2Client();
  
  // Debug: Log Google Client ID
  console.log("Backend Google Client ID:", process.env.GOOGLE_CLIENT_ID);

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

      // Create a fresh OAuth client for this exchange
      const tempClient = createOAuth2Client();

      // Exchange the code for tokens
      const { tokens } = await tempClient.getToken(code);

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
    } catch (err: any) {
      console.error("Error during Google authentication:", err);
      
      // Extract detailed error information for debugging
      const errorResponse = {
        message: err.message || "Authentication failed",
        error: err.response?.data?.error || err.code || "unknown_error",
        error_description: err.response?.data?.error_description || err.response?.statusText || "Unknown error occurred",
        status: err.response?.status || err.status || 500,
        details: {
          config: err.config?.url ? { url: err.config.url, method: err.config.method } : undefined,
          response: err.response?.data || undefined,
          timestamp: new Date().toISOString()
        }
      };
      
      return res.status(errorResponse.status).json(errorResponse);
    }
  });

  // One Platform authentication endpoint - placed before auth middleware
  app.post("/api/auth/one-platform", async (req: Request, res: Response) => {
    console.log("✓ One Platform endpoint hit successfully!");
    
    try {
      // Execute the exact curl command
      const response = await fetch('https://cc.sandbox.googleapis.com/v1/auth:initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const responseText = await response.text();
      let curlResponse;
      
      try {
        curlResponse = JSON.parse(responseText);
      } catch (e) {
        // If response is not JSON, return the raw text
        curlResponse = {
          raw_response: responseText,
          status_code: response.status,
          status_text: response.statusText
        };
      }
      
      console.log("One Platform API response:", curlResponse);
      res.json(curlResponse);
      
    } catch (error) {
      console.error("Error executing curl command:", error);
      res.json({
        error: "Failed to execute curl command",
        message: error instanceof Error ? error.message : "Unknown error",
        curl_command: "curl -s -X POST https://cc.sandbox.googleapis.com/v1/auth:initiate"
      });
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
      '/api/auth/one-platform',
      '/api/auth/logout',
    ];

    console.log(`Auth middleware: ${req.method} ${req.path}, isPublic: ${publicPaths.includes(req.path)}`);

    if (publicPaths.includes(req.path)) {
      return next();
    }

    // Check for Demo Mode header (used in VM environments), also check hostname
    const isDemoMode = req.headers['x-demo-mode'] === 'true' || 
                      req.hostname?.includes('replit.app') || 
                      req.hostname?.includes('replit.dev');
    
    if (isDemoMode) {
      console.log(`Demo mode detected (${req.hostname}), using castives@gmail.com`);
      // For demo mode, use a hardcoded user (typically one that's already in the database)
      const user = await storage.getUserByUsername('castives@gmail.com');
      if (user) {
        req.user = user;
        return next();
      }
    }

    try {
      const auth = authFromSession(req);
      if (!auth) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const oauth2 = google.oauth2({ version: 'v2', auth });
      const { data } = await oauth2.userinfo.get();
      
      if (!data.email) {
        return res.status(401).json({ message: "Invalid user info" });
      }

      const user = await storage.getUserByUsername(data.email);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      req.user = user;
      next();
    } catch (err) {
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
    // Check for Demo Mode header (used in VM environments), also check hostname
    const isDemoMode = req.headers['x-demo-mode'] === 'true' || 
                      req.hostname?.includes('replit.app') || 
                      req.hostname?.includes('replit.dev');
    
    if (isDemoMode) {
      console.log(`Demo mode detected in auth/status (${req.hostname}), using castives@gmail.com`);
      // For demo mode, use a hardcoded user (typically one that's already in the database)
      const user = await storage.getUserByUsername('castives@gmail.com');
      if (user) {
        return res.status(200).json({
          authenticated: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            googleId: user.googleId,
          },
          demoMode: true
        });
      }
    }
    
    if (!req.session.userId) {
      return res.status(200).json({
        authenticated: false,
      });
    }

    try {
      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        return res.status(200).json({
          authenticated: false,
        });
      }

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
    // Check for Demo Mode header (used in VM environments), also check hostname
    const isDemoMode = req.headers['x-demo-mode'] === 'true' || 
                    req.hostname?.includes('replit.app') || 
                    req.hostname?.includes('replit.dev');
    
    if (isDemoMode) {
      console.log(`Demo mode detected in logout (${req.hostname}), skipping session destroy`);
      return res.status(200).json({
        message: "Successfully logged out (demo mode)",
      });
    }

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
