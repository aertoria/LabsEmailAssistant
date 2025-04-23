import { pgTable, text, serial, integer, boolean, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  googleId: text("google_id"),
  email: text("email"),
  name: text("name"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  historyId: text("history_id"),
});

export const emails = pgTable("emails", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  messageId: text("message_id").notNull().unique(),
  threadId: text("thread_id").notNull(),
  from: text("from").notNull(),
  to: text("to").notNull(),
  subject: text("subject"),
  snippet: text("snippet"),
  bodyHtml: text("body_html"),
  bodyText: text("body_text"),
  receivedAt: timestamp("received_at"),
  isRead: boolean("is_read").default(false),
  isStarred: boolean("is_starred").default(false),
  labelIds: json("label_ids").$type<string[]>(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const googleAuthUserSchema = z.object({
  code: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type GoogleAuthUser = z.infer<typeof googleAuthUserSchema>;
export type User = typeof users.$inferSelect;
export type Email = typeof emails.$inferSelect;
