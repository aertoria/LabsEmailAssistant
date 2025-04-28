import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add CSP headers
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    // In development, allow eval and Google domains
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self' 'unsafe-inline' 'unsafe-eval' ws: wss:; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com; " +
      "connect-src 'self' ws: wss: https://accounts.google.com https://oauth2.googleapis.com; " +
      "frame-src 'self' https://accounts.google.com; " +
      "img-src 'self' data: https://*.googleusercontent.com;"
    );
  } else {
    // In production, use a more restrictive CSP but still allow Google domains
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com; " +
      "style-src 'self' 'unsafe-inline'; " +
      "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com; " +
      "frame-src 'self' https://accounts.google.com; " +
      "img-src 'self' data: https://*.googleusercontent.com;"
    );
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on port from env or default to 3000
  // This serves both the API and the client.
  const port = Number(process.env.PORT) || 3000;
  server.listen({
    port,
    host: "0.0.0.0",
    // reusePort causes ENOTSUP on macOS for IPv4; disable for local dev
    // reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();