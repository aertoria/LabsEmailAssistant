import { Express, Request, Response } from "express";
import { IStorage } from "./storage";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { googleAuthUserSchema } from "@shared/schema";

// Create OAuth client
const createOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.REDIRECT_URI || `${process.env.APP_URL || ""}/api/auth/callback`
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
      req.session.userId = user.id;

      // Get OAuth tokens
      const oauth2Client = createOAuth2Client();
      
      // Return the user data
      res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        message: "Successfully authenticated with Google",
      });
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

      // Store tokens (in a real app, these would be encrypted)
      // Update user with access and refresh tokens
      // This would be handled by a proper updateUser method in a real app

      res.redirect("/dashboard");
    } catch (error) {
      console.error("OAuth callback error:", error);
      res.status(500).json({
        message: "Failed to exchange authorization code",
      });
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
