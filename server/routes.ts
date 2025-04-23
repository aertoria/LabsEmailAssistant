import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import { setupAuth } from "./auth";
import { setupGmail } from "./gmail";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "mail-sync-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
  );

  // Setup authentication routes
  setupAuth(app, storage);

  // Setup Gmail API routes
  setupGmail(app, storage);

  const httpServer = createServer(app);

  return httpServer;
}
