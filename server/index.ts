import dotenv from 'dotenv';

// Load environment variables from .env file only in development
// Vercel provides environment variables automatically via process.env
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  dotenv.config();
}

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { checkDatabaseHealth, initializeDatabase } from "./db";
import { initializeOpenAI } from "./services/openai";
import { setupSimpleAuth } from "./auth-simple";
import path from "path";
import fs from "fs";

const app = express();

// Export app for Vercel serverless function use
export { app };

// Security and performance middleware
app.use(express.json({ 
  limit: process.env.MAX_REQUEST_SIZE || '50mb',
  strict: true
}));

// CORS middleware for OAuth and API calls
app.use((req, res, next) => {
  // Allow Supabase domains for OAuth
  const allowedOrigins = [
    'https://accounts.google.com',
    'https://ronbobkftucgcffiqtgu.supabase.co',
    process.env.FRONTEND_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
  ].filter(Boolean);

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // CSP headers to allow Supabase domains
  res.header(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "connect-src 'self' https://*.supabase.co https://accounts.google.com; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:;"
  );
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});
app.use(express.urlencoded({ 
  extended: false, 
  limit: process.env.MAX_REQUEST_SIZE || '50mb' 
}));

// Security headers for production
if (process.env.NODE_ENV === 'production' && process.env.SECURITY_HEADERS_ENABLED === 'true') {
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https: blob:; " +
      "connect-src 'self' https://api.openai.com https://api.anthropic.com https://*.supabase.co wss://*.supabase.co; " +
      "frame-src https://accounts.google.com https://*.supabase.co;"
    );
    next();
  });
}

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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
  // Initialize services after dotenv is loaded
  // In serverless environments, we allow graceful degradation instead of fatal errors
  let databaseAvailable = false;
  let supabaseAvailable = false;
  
  try {
    await initializeDatabase();
    console.log('✅ Database initialized successfully');
    databaseAvailable = true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.error('⚠️ Server will start with database unavailable - some features may be limited');
    console.error('💡 Check your DATABASE_URL in .env file and ensure database is accessible');
    
    // In serverless environments, don't exit - allow graceful degradation
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      console.error('🔄 Continuing server startup in production/serverless mode...');
    } else {
      console.error('🚨 Exiting in development mode - database is required');
      process.exit(1);
    }
  }
  
  try {
    setupSimpleAuth(app);
    console.log('✅ Simple Auth initialized successfully');
    supabaseAvailable = true;
  } catch (error) {
    console.error('❌ Simple Auth initialization failed:', error.message);
    console.error('⚠️ Server will start with authentication unavailable');
    
    // In serverless environments, don't exit - allow graceful degradation
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      console.error('🔄 Continuing server startup in production/serverless mode...');
    } else {
      console.error('🚨 Exiting in development mode - Auth is required');
      process.exit(1);
    }
  }
  
  // Log service availability status for debugging
  console.log('🔍 Service Status:', {
    database: databaseAvailable ? 'Available' : 'Unavailable',
    auth: supabaseAvailable ? 'Available' : 'Unavailable',
    environment: process.env.NODE_ENV,
    isVercel: !!process.env.VERCEL
  });
  
  await initializeOpenAI();
  
  const server = await registerRoutes(app);

  // Health check endpoint for monitoring
  app.get('/api/health', async (req, res) => {
    try {
      const dbHealth = await checkDatabaseHealth();
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        database: dbHealth ? 'connected' : 'disconnected',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
      };
      
      if (!dbHealth) {
        health.status = 'degraded';
        return res.status(503).json(health);
      }
      
      res.json(health);
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Don't add serveStatic catch-all in Vercel environment
    // Vercel handles static file serving automatically
    if (!process.env.VERCEL) {
      serveStatic(app);
    } else {
      console.log('🚀 Running in Vercel - adding SPA fallback route');
      // Add SPA fallback for Vercel deployment
      // This ensures all non-API routes serve index.html for client-side routing
      app.use("*", (req, res) => {
        // Skip API routes - they should return JSON, not HTML
        if (req.path.startsWith('/api/')) {
          return res.status(404).json({ 
            message: 'API endpoint not found',
            path: req.path 
          });
        }
        
        // For all other routes, serve index.html to enable SPA routing
        const distPath = path.join(process.cwd(), 'dist/public');
        const indexPath = path.join(distPath, 'index.html');
        
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(500).json({ 
            message: 'Application not built properly - index.html not found' 
          });
        }
      });
    }
  }

  // Global error handler with detailed logging
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Enhanced error logging for production debugging
    const errorDetails = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      status,
      message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress
    };

    console.error('Application Error:', JSON.stringify(errorDetails, null, 2));

    // Don't expose sensitive error details in production
    const responseMessage = process.env.NODE_ENV === 'production' && status === 500
      ? 'Internal Server Error'
      : message;

    res.status(status).json({ 
      message: responseMessage,
      timestamp: errorDetails.timestamp,
      requestId: req.headers['x-request-id'] || 'unknown'
    });
    
    // Don't throw in production serverless environments
    if (process.env.NODE_ENV !== 'production') {
      throw err;
    }
  });

  // Configure port for different environments
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const host = process.env.NODE_ENV === "development" ? "localhost" : "0.0.0.0";
  
  // Only start server if not being imported (e.g., not in Vercel serverless environment)
  if (!process.env.VERCEL) {
    server.listen(port, host, () => {
      log(`✅ Server running on http://${host}:${port}`);
      if (process.env.NODE_ENV === "development") {
        log(`🚀 Open your browser and visit: http://localhost:${port}`);
      }
    });
  }
})();
