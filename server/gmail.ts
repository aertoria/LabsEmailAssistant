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
  // Authentication middleware
  const authMiddleware = async (req: Request, res: Response, next: Function) => {
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
      const maxEmails = 200; // Maximum emails to fetch as requested
      
      // Only process first 4 pages (200 emails total)
      if (page > 4) {
        return res.status(200).json({
          messages: [],
          nextPageToken: null,
          totalCount: maxEmails,
          maxReached: true
        });
      }
      
      console.log(`Fetching Gmail messages, page ${page} (max ${maxEmails} emails total)`);
      const gmail = await getGmailClient(req.user);
      
      // Get messages list
      const response = await gmail.users.messages.list({
        userId: "me",
        maxResults: pageSize,
        pageToken: page > 1 ? req.query.pageToken as string : undefined,
      });

      // Get details for each message
      const messages = [];
      
      if (response.data.messages && response.data.messages.length > 0) {
        for (const message of response.data.messages) {
          const fullMessage = await gmail.users.messages.get({
            userId: "me",
            id: message.id as string,
            format: "metadata",
            metadataHeaders: ["From", "Subject", "Date"],
          });

          const headers = fullMessage.data.payload?.headers || [];
          
          const fromHeader = headers.find(h => h.name === "From");
          const subjectHeader = headers.find(h => h.name === "Subject");
          const dateHeader = headers.find(h => h.name === "Date");
          
          messages.push({
            id: fullMessage.data.id,
            threadId: fullMessage.data.threadId,
            snippet: fullMessage.data.snippet,
            from: fromHeader?.value || "Unknown Sender",
            subject: subjectHeader?.value || "(No Subject)",
            receivedAt: dateHeader?.value ? new Date(dateHeader.value).toISOString() : new Date().toISOString(),
            isRead: !(fullMessage.data.labelIds?.includes("UNREAD")),
            isStarred: fullMessage.data.labelIds?.includes("STARRED") || false,
            labelIds: fullMessage.data.labelIds || [],
          });
        }
      }

      // Determine if we've reached maximum emails (200)
      const totalFetched = page * pageSize;
      const reachedMax = totalFetched >= maxEmails;
      
      res.status(200).json({
        messages,
        nextPageToken: reachedMax ? null : response.data.nextPageToken,
        totalCount: Math.min(response.data.resultSizeEstimate || 200, maxEmails),
        maxReached: reachedMax,
        page: page,
        maxPages: Math.ceil(maxEmails / pageSize)
      });
    } catch (error) {
      console.error("Gmail messages error:", error);
      res.status(500).json({
        message: "Failed to fetch messages",
      });
    }
  });

  // Get message
  app.get("/api/gmail/messages/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const gmail = await getGmailClient(req.user);
      
      const response = await gmail.users.messages.get({
        userId: "me",
        id,
        format: "full",
      });

      // Process message to extract content
      const message = response.data;
      const headers = message.payload?.headers || [];
      
      const fromHeader = headers.find(h => h.name === "From");
      const toHeader = headers.find(h => h.name === "To");
      const subjectHeader = headers.find(h => h.name === "Subject");
      const dateHeader = headers.find(h => h.name === "Date");
      
      // Extract message body
      const extractBody = (payload: any): string => {
        if (payload.body && payload.body.data) {
          return Buffer.from(payload.body.data, 'base64').toString('utf-8');
        }
        
        if (payload.parts) {
          for (const part of payload.parts) {
            if (part.mimeType === 'text/html') {
              return Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
          }
          
          for (const part of payload.parts) {
            if (part.mimeType === 'text/plain') {
              return Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
          }
        }
        
        return '';
      };

      const formattedMessage = {
        id: message.id,
        threadId: message.threadId,
        from: fromHeader?.value || "Unknown Sender",
        to: toHeader?.value || "Unknown Recipient",
        subject: subjectHeader?.value || "(No Subject)",
        date: dateHeader?.value ? new Date(dateHeader.value).toISOString() : null,
        body: extractBody(message.payload),
        snippet: message.snippet,
        labelIds: message.labelIds,
        isUnread: message.labelIds?.includes("UNREAD") || false,
        isStarred: message.labelIds?.includes("STARRED") || false,
      };

      res.status(200).json(formattedMessage);
    } catch (error) {
      console.error("Gmail message error:", error);
      res.status(500).json({
        message: "Failed to fetch message",
      });
    }
  });

  // Star/unstar message
  app.post("/api/gmail/messages/:id/star", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { star } = req.body;
      
      if (typeof star !== 'boolean') {
        return res.status(400).json({
          message: "Star status must be a boolean",
        });
      }
      
      const gmail = await getGmailClient(req.user);
      
      if (star) {
        // Add STARRED label
        await gmail.users.messages.modify({
          userId: "me",
          id,
          requestBody: {
            addLabelIds: ["STARRED"],
          },
        });
      } else {
        // Remove STARRED label
        await gmail.users.messages.modify({
          userId: "me",
          id,
          requestBody: {
            removeLabelIds: ["STARRED"],
          },
        });
      }

      res.status(200).json({
        message: `Message ${star ? "starred" : "unstarred"} successfully`,
      });
    } catch (error) {
      console.error("Star message error:", error);
      res.status(500).json({
        message: "Failed to update star status",
      });
    }
  });

  // Get labels
  app.get("/api/gmail/labels", authMiddleware, async (req: Request, res: Response) => {
    try {
      const gmail = await getGmailClient(req.user);
      
      const response = await gmail.users.labels.list({
        userId: "me",
      });

      // Filter to show only user-created labels, not system ones
      const userLabels = response.data.labels?.filter(
        label => label.type === 'user' && label.id?.startsWith('Label_')
      ) || [];
      
      // Map to simplified format with color info
      const formattedLabels = userLabels.map(label => ({
        id: label.id,
        name: label.name,
        color: '#3B82F6', // Default color, in a real app we'd store/retrieve actual colors
      }));

      res.status(200).json(formattedLabels);
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
      const syncStatus = {
        isActive: Math.random() > 0.7, // Randomly active for demo purposes
        progress: 65,
        total: 1245,
        processed: 812,
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
