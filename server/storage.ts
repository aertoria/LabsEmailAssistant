import { users, type User, type InsertUser } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserTokens(userId: number, accessToken: string, refreshToken: string, expiryDate?: Date): Promise<User>;
  getMockEmails(page: number, pageSize: number): Promise<{messages: any[], totalCount: number}>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: any): Promise<User> {
    const id = this.currentId++;
    
    // Create a complete user object with all required fields
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      googleId: insertUser.googleId || null,
      email: insertUser.email || null,
      name: insertUser.name || null,
      accessToken: insertUser.accessToken || null,
      refreshToken: insertUser.refreshToken || null,
      tokenExpiry: insertUser.tokenExpiry || null,
      historyId: insertUser.historyId || null
    };
    
    this.users.set(id, user);
    return user;
  }
  
  async updateUserTokens(userId: number, accessToken: string, refreshToken: string, expiryDate?: Date): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Update user with tokens
    const updatedUser: User = {
      ...user,
      accessToken,
      refreshToken,
      tokenExpiry: expiryDate || null,
    };
    
    // Save updated user
    this.users.set(userId, updatedUser);
    
    return updatedUser;
  }
  
  // Implementation of mock emails
  async getMockEmails(page: number = 1, pageSize: number = 50): Promise<{messages: any[], totalCount: number}> {
    // Generate exactly 100 mock emails (limiting to 100 as requested)
    const totalEmails = 100;
    const start = (page - 1) * pageSize;
    const end = Math.min(start + pageSize, totalEmails);
    
    // Generate some common senders
    const senders = [
      "LinkedIn <notifications@linkedin.com>",
      "Twitter <info@twitter.com>",
      "GitHub <noreply@github.com>",
      "Google Cloud <cloud-noreply@google.com>",
      "Amazon.com <shipment-tracking@amazon.com>",
      "Netflix <info@netflix.com>",
      "Spotify <no-reply@spotify.com>",
      "Slack <feedback@slack.com>",
      "Airbnb <automated@airbnb.com>",
      "Uber <uber.us@uber.com>",
      "Alice Smith <alice.smith@example.com>",
      "Bob Johnson <bob@example.org>",
      "Carol Williams <carol.williams@example.net>",
      "David Brown <david.brown@example.co>",
      "Eva Jones <eva@example.io>"
    ];
    
    // Generate some common subjects
    const subjectPrefixes = [
      "Weekly update: ",
      "Your invoice for ",
      "Action required: ",
      "Invitation to ",
      "Confirmation of ",
      "Updates to your account - ",
      "New message from ",
      "Reminder: ",
      "Thank you for ",
      "Important notice: ",
      "Your receipt from ",
      "Notification: ",
      "Changes to your subscription - ",
      "Welcome to "
    ];
    
    const subjectContent = [
      "project status",
      "upcoming event",
      "account activity",
      "your recent purchase",
      "the team meeting",
      "your membership",
      "payment confirmation",
      "system maintenance",
      "security alert",
      "password reset",
      "new features",
      "service update",
      "customer feedback",
      "order #12345",
      "your appointment"
    ];
    
    // Generate some sample labels
    const labelSets = [
      ["INBOX"],
      ["INBOX", "IMPORTANT"],
      ["INBOX", "CATEGORY_PERSONAL"],
      ["INBOX", "CATEGORY_SOCIAL"],
      ["INBOX", "CATEGORY_PROMOTIONS"],
      ["INBOX", "CATEGORY_UPDATES"],
      ["INBOX", "CATEGORY_FORUMS"],
      ["INBOX", "STARRED"],
      ["SPAM"],
      ["TRASH"],
      ["DRAFT"],
      ["SENT"]
    ];
    
    // Create email objects for the requested range
    const messages = [];
    
    for (let i = start; i < end; i++) {
      const dayOffset = 200 - i; // Older emails for higher indices
      const date = new Date();
      date.setDate(date.getDate() - (dayOffset % (i % 10 === 0 ? 1 : 28))); // Mix of recent and older emails
      
      // Create the email object
      messages.push({
        id: `mock-email-${i + 1}`,
        threadId: `thread-${Math.floor(i / 3) + 1}`, // Group some emails into threads
        from: senders[i % senders.length],
        subject: `${subjectPrefixes[i % subjectPrefixes.length]}${subjectContent[i % subjectContent.length]}`,
        snippet: `This is a sample email snippet for email #${i + 1}. It gives a preview of the email content without showing the full message.`,
        receivedAt: date.toISOString(),
        isRead: Math.random() > 0.3, // 70% of emails are read
        isStarred: Math.random() > 0.8, // 20% of emails are starred
        labelIds: labelSets[i % labelSets.length]
      });
    }
    
    return {
      messages,
      totalCount: totalEmails
    };
  }
}

export const storage = new MemStorage();
