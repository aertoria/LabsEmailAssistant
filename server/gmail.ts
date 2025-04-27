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

// Helper function to extract email body content
const extractBodyContent = (part: any): string => {
  if (part.mimeType === 'text/html' && part.body?.data) {
    return Buffer.from(part.body.data, 'base64').toString('utf-8');
  } else if (part.mimeType === 'text/plain' && part.body?.data) {
    const plainText = Buffer.from(part.body.data, 'base64').toString('utf-8');
    return `<div style="white-space: pre-wrap;">${plainText}</div>`;
  } else if (part.parts) {
    // Recursively search for HTML or plain text parts
    for (const subPart of part.parts) {
      const content = extractBodyContent(subPart);
      if (content) return content;
    }
  }
  return '';
};

// Helper function to format file sizes
const formatSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

// Setup Gmail API routes
export function setupGmail(app: Express, storage: IStorage) {
  // Authentication middleware - requires real session authentication
  const authMiddleware = async (req: Request, res: Response, next: Function) => {
    // Check for real authenticated session with a user
    if (req.session.userId) {
      try {
        const user = await storage.getUser(req.session.userId);
        
        if (user) {
          console.log(`[AUTH] Authenticated user: ${user.email}`);
          req.user = user;
          return next();
        }
      } catch (error) {
        console.error("Auth middleware error:", error);
      }
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

  // Get Gmail client with token refresh handling
  const getGmailClient = async (user: any) => {
    try {
      if (!user.accessToken || !user.refreshToken) {
        throw new Error("Auth token error: Missing access or refresh token");
      }
      
      const oauth2Client = createOAuth2Client();
      
      // Set credentials from stored tokens
      oauth2Client.setCredentials({
        access_token: user.accessToken,
        refresh_token: user.refreshToken,
        expiry_date: user.expiryDate ? new Date(user.expiryDate).getTime() : undefined
      });

      // Create Gmail client
      const gmail = google.gmail({ version: "v1", auth: oauth2Client });
      
      // Set up a token refresh handler
      oauth2Client.on('tokens', async (tokens) => {
        try {
          console.log('Token refresh occurred, updating stored tokens');
          // Only update if we have an access token
          if (tokens.access_token) {
            // Update user with refreshed tokens in a way that doesn't depend on req
            // We'll use the storage instance that was passed to setupGmail
            const storage = app.locals.storage;
            if (storage && typeof storage.updateUserTokens === 'function') {
              await storage.updateUserTokens(
                user.id,
                tokens.access_token,
                tokens.refresh_token || user.refreshToken, // Keep existing refresh token if not provided
                tokens.expiry_date ? new Date(tokens.expiry_date) : undefined
              );
              console.log(`Updated tokens for user ${user.id} after refresh`);
            }
          }
        } catch (refreshError) {
          console.error('Error saving refreshed tokens:', refreshError);
        }
      });
      
      return gmail;
    } catch (error: any) {
      console.error("Error creating Gmail client:", error);
      
      // Check for specific token errors
      if (error.message && (
        error.message.includes('invalid_grant') || 
        error.message.includes('invalid_token') ||
        error.message.includes('token expired') ||
        error.message.includes('Missing access or refresh token')
      )) {
        throw new Error(`Auth token error: ${error.message}`);
      }
      
      throw error;
    }
  };
  
  // Fetch emails from Gmail API with limit of 100 emails or emails from the last day
  const fetchLimitedEmails = async (user: any, page: number = 1, pageSize: number = 50) => {
    try {
      const gmail = await getGmailClient(user);
      
      // Calculate date for "last day" filter (24 hours ago)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      // Format date for Gmail query: YYYY/MM/DD
      const formattedDate = `${oneDayAgo.getFullYear()}/${oneDayAgo.getMonth() + 1}/${oneDayAgo.getDate()}`;
      
      // Get emails using after: query parameter for last day
      // OR limit to maxResults: 100 total emails
      const query = `after:${formattedDate}`;
      
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 10, // Max emails to return (reduced from 100 to 10)
        q: query,
        pageToken: page > 1 ? `page${page - 1}` : undefined
      });
      
      // Return limited emails list
      return {
        messages: response.data.messages || [],
        nextPageToken: response.data.nextPageToken,
        resultSizeEstimate: response.data.resultSizeEstimate || 0
      };
    } catch (error) {
      console.error('Error fetching emails from Gmail API:', error);
      throw error;
    }
  };

  // List messages - limited to 10 emails or from the last day
  app.get("/api/gmail/messages", authMiddleware, async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = 50;
      
      console.log(`Fetching page ${page} of emails from Gmail API (limited to 10 or last day)`);
      
      try {
        // Use our function to fetch limited emails from Gmail API
        const gmailData = await fetchLimitedEmails(req.user, page, pageSize);
        
        // Fetch details for each message to get real email content
        const formattedMessages = await Promise.all(
          gmailData.messages.map(async (msg: any) => {
            try {
              // Get Gmail client with proper error handling
              const gmail = await getGmailClient(req.user);
              
              // Fetch the full message details for each message ID
              const messageDetail = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id,
                format: 'full' // Get full message details
              });
              
              const data = messageDetail.data;
              const headers = data.payload?.headers || [];
              
              // Define header type
              interface MessageHeader {
                name: string;
                value: string;
              }
              
              // Extract email metadata from headers
              const subject = headers.find((h: MessageHeader) => h.name === 'Subject')?.value || 'No Subject';
              const from = headers.find((h: MessageHeader) => h.name === 'From')?.value || 'Unknown Sender';
              const date = headers.find((h: MessageHeader) => h.name === 'Date')?.value;
              
              // Check if the message has been read
              const isUnread = data.labelIds?.includes('UNREAD') || false;
              const isStarred = data.labelIds?.includes('STARRED') || false;
              
              // Format the date
              const receivedDate = date ? new Date(date).toISOString() : new Date().toISOString();
              
              return {
                id: msg.id,
                threadId: msg.threadId,
                from: from,
                subject: subject,
                snippet: data.snippet || 'No preview available',
                receivedAt: receivedDate,
                isRead: !isUnread,
                isStarred: isStarred
              };
            } catch (error) {
              console.error(`Error fetching details for message ${msg.id}:`, error);
              // Return a fallback if we can't get details
              return {
                id: msg.id,
                threadId: msg.threadId,
                from: "Gmail Message",
                subject: "Could not retrieve details",
                snippet: "Error loading email content...",
                receivedAt: new Date().toISOString(),
                isRead: true,
                isStarred: false
              };
            }
          })
        );
        
        return res.status(200).json({
          messages: formattedMessages,
          nextPageToken: gmailData.nextPageToken || null,
          totalCount: gmailData.resultSizeEstimate || formattedMessages.length,
          maxReached: false,
          page: page
        });
      } catch (tokenError: any) {
        // Handle token errors specifically
        if (tokenError.message && (
          tokenError.message.includes('invalid_grant') || 
          tokenError.message.includes('invalid_token') ||
          tokenError.message.includes('token expired') ||
          tokenError.message.includes('Auth token error')
        )) {
          console.error("Gmail token error - user needs to re-authenticate:", tokenError.message);
          
          // Clear user session to force re-authentication
          if (req.session) {
            req.session.destroy((err) => {
              if (err) console.error("Error destroying session:", err);
            });
          }
          
          // Return 401 to trigger re-authentication on the client
          return res.status(401).json({
            message: "Authentication expired, please sign in again",
            error: "token_expired"
          });
        }
        
        // Re-throw other errors to be caught by the outer catch
        throw tokenError;
      }
    } catch (error: any) {
      console.error("Gmail messages error:", error);
      res.status(500).json({
        message: "Failed to fetch messages",
        error: error.message || String(error)
      });
    }
  });

  // Get message details from Gmail API
  app.get("/api/gmail/messages/:id", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      console.log(`Fetching real message from Gmail API for ID: ${id}`);
      
      try {
        // Get Gmail client
        const gmail = await getGmailClient(req.user);
        
        // Fetch full message details including body
        const messageDetail = await gmail.users.messages.get({
          userId: 'me',
          id: id,
          format: 'full'
        });
        
        const data = messageDetail.data;
        const headers = data.payload?.headers || [];
        
        // Define header type
        interface MessageHeader {
          name: string;
          value: string;
        }
        
        // Extract email metadata from headers - type-safe implementation
        const subject = headers.find(h => h.name === 'Subject')?.value ?? 'No Subject';
        const from = headers.find(h => h.name === 'From')?.value ?? 'Unknown Sender';
        const to = headers.find(h => h.name === 'To')?.value ?? '';
        const date = headers.find(h => h.name === 'Date')?.value;
        
        // Check if the message has been read
        const isUnread = data.labelIds?.includes('UNREAD') || false;
        const isStarred = data.labelIds?.includes('STARRED') || false;
        
        // Extract body content (HTML if available, otherwise plain text)
        let bodyContent = '';
        
        // Extract body from message payload
        if (data.payload) {
          // Helper function to extract recursively but not defined inline to avoid strict mode issues
          const extractedContent = extractBodyContent(data.payload);
          bodyContent = extractedContent || 'No message content available';
        }
        
        // Format the date
        const receivedDate = date ? new Date(date).toISOString() : new Date().toISOString();
        
        // Build complete message object
        const formattedMessage = {
          id: id,
          threadId: data.threadId,
          from: from,
          to: to,
          subject: subject,
          date: receivedDate,
          body: bodyContent,
          snippet: data.snippet || '',
          labelIds: data.labelIds || [],
          isUnread: isUnread,
          isStarred: isStarred,
        };

        res.status(200).json(formattedMessage);
      } catch (tokenError: any) {
        // Handle token errors specifically
        if (tokenError.message && (
          tokenError.message.includes('invalid_grant') || 
          tokenError.message.includes('invalid_token') ||
          tokenError.message.includes('token expired') ||
          tokenError.message.includes('Auth token error')
        )) {
          console.error("Gmail token error - user needs to re-authenticate:", tokenError.message);
          
          // Clear user session to force re-authentication
          if (req.session) {
            req.session.destroy((err) => {
              if (err) console.error("Error destroying session:", err);
            });
          }
          
          // Return 401 to trigger re-authentication on the client
          return res.status(401).json({
            message: "Authentication expired, please sign in again",
            error: "token_expired"
          });
        }
        
        throw tokenError;
      }
    } catch (error: any) {
      console.error("Gmail message error:", error);
      res.status(500).json({
        message: "Failed to fetch message from Gmail API",
        error: error.message || String(error)
      });
    }
  });

  // Star/unstar message - use Gmail API
  app.post("/api/gmail/messages/:id/star", authMiddleware, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { star } = req.body;
      
      if (typeof star !== 'boolean') {
        return res.status(400).json({
          message: "Star status must be a boolean",
        });
      }
      
      console.log(`Setting starred status for message ${id} to ${star} using Gmail API`);
      
      // Get Gmail client
      const gmail = await getGmailClient(req.user);
      
      // Get message details to check the current labels
      const message = await gmail.users.messages.get({
        userId: 'me',
        id: id
      });
      
      const currentLabels = message.data.labelIds || [];
      
      // Prepare the label modification request
      if (star) {
        // Add STARRED label if not already present
        if (!currentLabels.includes('STARRED')) {
          await gmail.users.messages.modify({
            userId: 'me',
            id: id,
            requestBody: {
              addLabelIds: ['STARRED']
            }
          });
        }
      } else {
        // Remove STARRED label if present
        if (currentLabels.includes('STARRED')) {
          await gmail.users.messages.modify({
            userId: 'me',
            id: id,
            requestBody: {
              removeLabelIds: ['STARRED']
            }
          });
        }
      }
      
      res.status(200).json({
        message: `Message ${star ? "starred" : "unstarred"} successfully with Gmail API`,
        id: id,
        isStarred: star
      });
    } catch (error: any) {
      console.error("Star message error:", error);
      res.status(500).json({
        message: "Failed to update star status in Gmail API",
        error: error.message || String(error)
      });
    }
  });

  // Get real Gmail labels
  app.get("/api/gmail/labels", authMiddleware, async (req: Request, res: Response) => {
    try {
      console.log("Fetching real labels from Gmail API");
      
      // Get Gmail client
      const gmail = await getGmailClient(req.user);
      
      // Fetch the user's labels from Gmail API
      const response = await gmail.users.labels.list({
        userId: 'me'
      });
      
      // Format and map the labels
      const labels = response.data.labels?.map(label => {
        // Set default color for labels without color
        const defaultColor = '#4285F4'; // Google blue
        
        return {
          id: label.id,
          name: label.name,
          color: label.color?.backgroundColor || defaultColor,
          textColor: label.color?.textColor || '#FFFFFF',
          type: label.type || 'user'
        };
      }) || [];
      
      res.status(200).json(labels);
    } catch (error: any) {
      console.error("Gmail labels error:", error);
      res.status(500).json({
        message: "Failed to fetch labels from Gmail API",
        error: error.message || String(error)
      });
    }
  });

  // Get real Gmail sync status
  app.get("/api/gmail/sync/status", authMiddleware, async (req: Request, res: Response) => {
    try {
      // Get Gmail client
      const gmail = await getGmailClient(req.user);
      
      // Use the Gmail API to get the total message count
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 1,
      });
      
      // Get the actual count of messages we're showing (limited to 10)
      const total = Math.min(10, response.data.resultSizeEstimate || 10);
      
      // Use a real sync status based on API responses
      const syncStatus = {
        isActive: false, // Not actively syncing since we fetch directly
        progress: 100, // Always complete since we're fetching directly
        total: total,
        processed: total,
      };

      res.status(200).json(syncStatus);
    } catch (error: any) {
      console.error("Gmail sync status error:", error);
      res.status(500).json({
        message: "Failed to fetch sync status from Gmail API",
        error: error.message || String(error)
      });
    }
  });

  // Get storage info from Gmail profile
  app.get("/api/gmail/storage", authMiddleware, async (req: Request, res: Response) => {
    try {
      // Get Gmail client
      const gmail = await getGmailClient(req.user);
      
      // Get the user profile which contains storage information
      const profile = await gmail.users.getProfile({
        userId: 'me'
      });
      
      // Google accounts typically have 15GB shared storage
      const totalBytes = 15 * 1024 * 1024 * 1024; // 15GB in bytes
      
      // Get storage usage - Gmail API doesn't expose this directly
      // so we'll use a reasonable estimate 
      const usedBytes = 1 * 1024 * 1024 * 1024; // 1GB as an estimate
      
      // Calculate percentage
      const percentUsed = Math.round((usedBytes / totalBytes) * 100);
      
      // Use the globally defined formatSize helper function
      
      const storageInfo = {
        totalBytes: totalBytes,
        usedBytes: usedBytes,
        percentUsed: percentUsed,
        usedFormatted: formatSize(usedBytes),
        totalFormatted: "15 GB",
      };

      res.status(200).json(storageInfo);
    } catch (error: any) {
      console.error("Gmail storage info error:", error);
      res.status(500).json({
        message: "Failed to fetch storage information from Gmail API",
        error: error.message || String(error)
      });
    }
  });
}
