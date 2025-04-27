import { Express, Request, Response } from "express";
import { IStorage } from "./storage";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { googleAuthUserSchema } from "@shared/schema";

// Create OAuth client
const createOAuth2Client = () => {
  // Get origin for redirect URI
  let redirectUri = process.env.REDIRECT_URI;
  if (!redirectUri) {
    // Must exactly match what's configured in Google Cloud Console
    // The error indicates we need to use a specific redirect URI
    redirectUri = "https://workspace.castives.repl.co/api/auth/callback";
  }
  
  console.log('Creating OAuth2 client with redirect URI:', redirectUri);
  
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
};

// Setup authentication routes
export function setupAuth(app: Express, storage: IStorage) {
  // Google authentication route
  app.post("/api/auth/google", async (req: Request, res: Response) => {
    try {
      console.log('Google auth endpoint called with body:', JSON.stringify(req.body, null, 2));
      const { credential } = req.body;
      
      if (!credential) {
        console.log('Missing credential in request');
        return res.status(400).json({
          message: "Missing credential",
        });
      }

      console.log('Attempting to verify Google token with client ID:', 
                 process.env.GOOGLE_CLIENT_ID ? 'Client ID exists' : 'Missing Client ID');
                 
      // Verify the Google ID token and get user info
      let payload;
      try {
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID
        });
        
        payload = ticket.getPayload();
        if (!payload || !payload.email) {
          console.log('Invalid credential - missing payload or email');
          return res.status(400).json({
            message: "Invalid credential - missing required user information",
          });
        }
        
        console.log('Successfully verified token for email:', payload.email);
      } catch (verifyError) {
        console.error('Error verifying Google token:', verifyError);
        return res.status(401).json({
          message: "Failed to verify Google credential. The token may be invalid or expired.",
        });
      }

      // Get or create user
      let user = await storage.getUserByUsername(payload.email);
      
      if (!user) {
        // Create a new user
        user = await storage.createUser({
          username: payload.email,
          password: "", // Not used with Google auth
          googleId: payload.sub,
          email: payload.email,
          name: payload.name,
        });
      } else {
        // Update existing user with Google info
        // This would be handled by a proper updateUser method in a real app
      }

      // Set user in session
      if (!req.session) {
        req.session = {} as any;
      }
      req.session.userId = user.id;

      try {
        // Exchange the Google ID token for access and refresh tokens
        const oauth2Client = createOAuth2Client();
        
        // Get user info via the Google People API to request scopes needed for Gmail
        // Note: We need to exchange the ID token for a proper OAuth token with scopes
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
        
        // Return the auth URL to the client for redirection
        return res.status(200).json({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            googleId: user.googleId || payload.sub,
            needsGmailAuth: true, // Flag to indicate the user needs to complete Gmail auth
          },
          authUrl: authUrl,
          message: "User authenticated, but needs Gmail authorization"
        });
        
      } catch (tokenError) {
        console.error('Error generating auth URL:', tokenError);
        return res.status(500).json({
          message: "Failed to generate Gmail authorization URL",
        });
      }
    } catch (error) {
      console.error("Google auth error:", error);
      res.status(500).json({
        message: "Authentication failed",
      });
    }
  });

  // OAuth callback
  app.get("/api/auth/callback", async (req: Request, res: Response) => {
    const { code } = req.query;
    
    if (!code || typeof code !== "string") {
      return res.status(400).json({
        message: "Missing authorization code",
      });
    }

    try {
      const oauth2Client = createOAuth2Client();
      
      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      
      if (!req.session.userId) {
        return res.status(401).json({
          message: "User not authenticated",
        });
      }

      // Get user from session
      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        return res.status(401).json({
          message: "User not found",
        });
      }

      console.log("Received tokens from Google OAuth:", { 
        accessTokenExists: !!tokens.access_token,
        refreshTokenExists: !!tokens.refresh_token,
        expiryDate: tokens.expiry_date 
      });

      // Store tokens in the database
      try {
        // Update expiry date format
        const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : undefined;
        
        // Update user with the real tokens
        await storage.updateUserTokens(
          user.id,
          tokens.access_token || '',
          tokens.refresh_token || '',
          expiryDate
        );
        
        console.log(`Successfully stored Google OAuth tokens for user ${user.id}`);
        
        // Verify tokens immediately by making a simple API call
        try {
          const testOAuth2Client = new google.auth.OAuth2();
          testOAuth2Client.setCredentials(tokens);
          
          // Create Gmail client
          const gmail = google.gmail({
            version: 'v1',
            auth: testOAuth2Client
          });
          
          // Make a simple test call to verify tokens work
          await gmail.users.getProfile({ userId: 'me' });
          console.log(`Verified Gmail access for user ${user.id}`);
        } catch (verifyError) {
          console.error('Failed to verify Gmail access with tokens:', verifyError);
          // Continue anyway, since we want to allow the user to proceed
        }
      } catch (tokenError) {
        console.error("Error storing OAuth tokens:", tokenError);
        // Just log the error but continue - don't fail the whole callback
      }

      // Redirect to frontend OAuth callback handler to complete client-side process
      res.redirect("/auth/callback?success=true");
    } catch (error) {
      console.error("OAuth callback error:", error);
      res.redirect("/auth/callback?error=true");
    }
  });

  // Auth status check
  app.get("/api/auth/status", async (req: Request, res: Response) => {
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
