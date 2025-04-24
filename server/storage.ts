import { users, type User, type InsertUser } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserTokens(userId: number, accessToken: string, refreshToken: string, expiryDate?: Date): Promise<User>;
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
}

export const storage = new MemStorage();
