import { Express, Request, Response } from "express";
import { IStorage } from "./storage";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { User } from "@shared/schema";

// Extend the Express Request type to include our user property
declare global {
  namespace Express {
    interface Request {
      user?: User;
      session: {
        userId?: number;
        destroy: (callback: (err: Error) => void) => void;
      } & Record<string, any>;
    }
  }
}

// Create OAuth client
const createOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.REDIRECT_URI || `${process.env.APP_URL || ""}/api/auth/callback`
  );
};

// Setup Gmail API routes
export function setupGmail(app: Express, storage: IStorage) {
  // Authentication middleware - supports both session and demo mode
  const authMiddleware = async (req: Request, res: Response, next: Function) => {
    // Check for demo mode header or query parameter
    const isDemoMode = 
      req.headers['x-demo-mode'] === 'true' || 
      req.query.demo === 'true';
    
    if (isDemoMode) {
      console.log("Using demo mode authentication");
      // Create a demo user for the request
      req.user = {
        id: 999,
        username: "demo.user",
        email: "demo.user@example.com",
        name: "Demo User",
        accessToken: "demo-token",
        refreshToken: "demo-refresh-token",
        tokenExpiry: null,
        password: "",
        googleId: null,
        historyId: null
      };
      return next();
    }
    
    // Regular session-based authentication
    if (!req.session.userId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    try {
      const user = await storage.getUser(req.session.userId);
      
      if (!user) {
        return res.status(401).json({
          message: "User not found",
        });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error("Auth middleware error:", error);
      res.status(500).json({
        message: "Authentication error",
      });
    }
  };

  // Get Gmail client
  const getGmailClient = async (user: any) => {
    const oauth2Client = createOAuth2Client();
    
    // Set credentials from stored tokens
    oauth2Client.setCredentials({
      access_token: user.accessToken,
      refresh_token: user.refreshToken,
    });

    return google.gmail({ version: "v1", auth: oauth2Client });
  };

  // List messages - limit to 200 emails
  app.get("/api/gmail/messages", authMiddleware, async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = 50;
      
      console.log(`Fetching page ${page} of emails from mock service`);
      
      // Use our new storage method to get consistent mock emails
      const { messages, totalCount } = await storage.getMockEmails(page, pageSize);
      
      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / pageSize);
      const hasNextPage = page < totalPages;
      
      res.status(200).json({
        messages,
        nextPageToken: hasNextPage ? `page${page + 1}` : null,
        totalCount,
        maxReached: page >= 4,
        page: page,
        maxPages: totalPages
      });
    } catch (error) {
      console.error("Gmail messages error:", error);
      res.status(500).json({
        message: "Failed to fetch messages",
      });
    }
  });

  // Get message - provide sample data
  app.get("/api/gmail/messages/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      console.log(`Providing sample data for message ID: ${id}`);
      
      // Generate a deterministic sample message based on the ID
      const messageIdNum = parseInt(id.replace('msg-', '')) || 1;
      
      // Generate consistent sender based on ID
      const senderOptions = [
        'John Smith <john.smith@gmail.com>',
        'Jane Doe <jane.doe@yahoo.com>',
        'Support Team <support@example.org>',
        'Notifications <notifications@company.com>',
        'Marketing <marketing@example.com>',
        'Your Bank <alerts@bank.com>',
        'Calendar <calendar@notifications.com>'
      ];
      
      const sender = senderOptions[messageIdNum % senderOptions.length];
      
      // Sample recipients
      const recipients = [
        'you@gmail.com', 
        'team@yourcompany.com',
        'family@groups.com'
      ];
      
      // Generate consistent subject based on ID
      const subjectOptions = [
        'Important: Project Update',
        'Your monthly statement is ready',
        'Meeting invitation for next week',
        'Follow-up on our conversation',
        'Action required: Verify your account',
        'Your order has shipped',
        'Weekend promotion: Special offers'
      ];
      const subject = subjectOptions[messageIdNum % subjectOptions.length];
      
      // Sample HTML body with inline styles for better email appearance
      const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-bottom: 3px solid #4285f4;">
          <h2 style="color: #202124; margin: 0;">${subject}</h2>
        </div>
        <div style="padding: 20px; color: #202124;">
          <p>Hello,</p>
          <p>This is a sample email message generated for the Gmail clone application. This demonstrates how emails would look in a real application.</p>
          <p>The ID of this message is <strong>${id}</strong>, and it would normally contain personalized content based on the actual email.</p>
          <p>In a real application, this would be fetched from the Gmail API, but for demonstration purposes, we're generating sample content.</p>
          <p>Thanks for trying out our application!</p>
          <p style="margin-top: 30px;">Regards,<br>${sender.split('<')[0].trim()}</p>
        </div>
        <div style="background-color: #f8f9fa; padding: 15px; font-size: 12px; color: #5f6368; border-top: 1px solid #dadce0;">
          <p style="margin: 0;">This is an automatically generated email for demonstration purposes only.</p>
        </div>
      </div>
      `;
      
      // Generate a date within the last month
      const date = new Date();
      date.setDate(date.getDate() - (messageIdNum % 30));
      
      // Determine if read/starred based on ID
      const isUnread = messageIdNum % 3 === 0;
      const isStarred = messageIdNum % 5 === 0;
      
      const formattedMessage = {
        id: id,
        threadId: `thread-${Math.ceil(messageIdNum / 3)}`,
        from: sender,
        to: recipients[messageIdNum % recipients.length],
        subject: subject,
        date: date.toISOString(),
        body: htmlBody,
        snippet: `This is a sample email message generated for the Gmail clone application. This demonstrates how emails would look in a real application...`,
        labelIds: [
          isUnread ? 'UNREAD' : 'INBOX',
          isStarred ? 'STARRED' : '',
          messageIdNum % 7 === 0 ? 'IMPORTANT' : '',
          messageIdNum % 11 === 0 ? 'CATEGORY_PERSONAL' : '',
          messageIdNum % 13 === 0 ? 'CATEGORY_SOCIAL' : ''
        ].filter(Boolean),
        isUnread: isUnread,
        isStarred: isStarred,
      };

      res.status(200).json(formattedMessage);
    } catch (error) {
      console.error("Gmail message error:", error);
      res.status(500).json({
        message: "Failed to fetch message",
      });
    }
  });

  // Star/unstar message - handle with local logic only
  app.post("/api/gmail/messages/:id/star", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { star } = req.body;
      
      if (typeof star !== 'boolean') {
        return res.status(400).json({
          message: "Star status must be a boolean",
        });
      }
      
      console.log(`Setting starred status for message ${id} to ${star}`);
      
      // In a real app, this would update the message in the Gmail API
      // For demo purposes, we simply return success without actually changing anything
      
      res.status(200).json({
        message: `Message ${star ? "starred" : "unstarred"} successfully`,
        id: id,
        isStarred: star
      });
    } catch (error) {
      console.error("Star message error:", error);
      res.status(500).json({
        message: "Failed to update star status",
      });
    }
  });

  // Get labels - provide sample data
  app.get("/api/gmail/labels", authMiddleware, async (req: Request, res: Response) => {
    try {
      console.log("Providing sample labels data");
      
      // Sample labels with different colors
      const labels = [
        {
          id: 'Label_1',
          name: 'Work',
          color: '#D50000' // Red
        },
        {
          id: 'Label_2',
          name: 'Personal',
          color: '#3B82F6' // Blue
        },
        {
          id: 'Label_3',
          name: 'Family',
          color: '#33B679' // Green
        },
        {
          id: 'Label_4',
          name: 'Projects',
          color: '#FF6D00' // Orange
        },
        {
          id: 'Label_5',
          name: 'Finance',
          color: '#8E24AA' // Purple
        },
        {
          id: 'Label_6',
          name: 'Travel',
          color: '#0B8043' // Dark Green
        }
      ];
      
      res.status(200).json(labels);
    } catch (error) {
      console.error("Gmail labels error:", error);
      res.status(500).json({
        message: "Failed to fetch labels",
      });
    }
  });

  // Get sync status
  app.get("/api/gmail/sync/status", authMiddleware, async (req: Request, res: Response) => {
    try {
      // In a real app, this would track actual sync progress
      // Limiting to 100 emails as requested by the user
      const total = 100;
      const processed = Math.floor(total * 0.65); // 65% complete
      
      const syncStatus = {
        isActive: Math.random() > 0.7, // Randomly active for demo purposes
        progress: 65,
        total: total,
        processed: processed,
      };

      res.status(200).json(syncStatus);
    } catch (error) {
      console.error("Sync status error:", error);
      res.status(500).json({
        message: "Failed to fetch sync status",
      });
    }
  });

  // Get storage info
  app.get("/api/gmail/storage", authMiddleware, async (req: Request, res: Response) => {
    try {
      // In a real app, this would come from Gmail API quotas or profile info
      const storageInfo = {
        totalBytes: 15 * 1024 * 1024 * 1024, // 15 GB in bytes
        usedBytes: 2.25 * 1024 * 1024 * 1024, // 2.25 GB in bytes
        percentUsed: 15,
        usedFormatted: "2.25 GB",
        totalFormatted: "15 GB",
      };

      res.status(200).json(storageInfo);
    } catch (error) {
      console.error("Storage info error:", error);
      res.status(500).json({
        message: "Failed to fetch storage information",
      });
    }
  });
}
