import type { Express, RequestHandler } from "express";
import { supabase, supabaseAdmin } from "./supabaseClient";
import { storage } from "./storage";

// Type for authenticated user
type AuthenticatedUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  profileImageUrl?: string;
  [key: string]: any;
};

// Helper function to get user from JWT token
async function getUserFromToken(token: string): Promise<AuthenticatedUser | null> {
  if (!supabase) {
    console.log('❌ Supabase client not initialized');
    throw new Error("Supabase client not initialized");
  }

  try {
    console.log('🔍 Getting user from Supabase with token...');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.log('❌ Supabase auth error:', error.message);
      return null;
    }
    
    if (!user) {
      console.log('❌ No user returned from Supabase');
      return null;
    }

    console.log('✅ Supabase user found:', { id: user.id, email: user.email });

    // Sync user with local database (upsert)
    const userData = {
      id: user.id,
      email: user.email || '',
      username: user.email || '',
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown User',
      password: 'oauth_user', // Placeholder for OAuth users
      profileImageUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    };

    console.log('🔄 Syncing user with local database...', userData.email);
    
    try {
      // Try to get/sync user with local database
      let localUser = await storage.getUser(user.id);
      
      if (!localUser) {
        console.log('👤 Creating new user in local database...', userData.email);
        localUser = await storage.upsertUser(userData);
      } else {
        console.log('👤 User already exists in local database:', userData.email);
        // Update user data to ensure it's current
        localUser = await storage.updateUser(user.id, {
          name: userData.name,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        });
      }
      
      console.log('✅ User synced successfully:', localUser.email);
      
      return {
        id: localUser.id,
        email: localUser.email,
        username: localUser.username,
        name: localUser.name,
        profileImageUrl: localUser.profile_image_url || localUser.profileImageUrl,
      } as AuthenticatedUser;
    } catch (dbError) {
      console.error('❌ Error syncing user with database:', dbError);
      // Fallback to Supabase user data if database sync fails
      return {
        id: user.id,
        email: user.email || '',
        username: user.email || '',
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown User',
        profileImageUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      } as AuthenticatedUser;
    }
  } catch (error) {
    console.error("Error getting user from token:", error);
    return null;
  }
}

export async function setupAuth(app: Express) {
  // Always register auth routes, even if Supabase fails to initialize
  // This prevents API routes from returning HTML instead of JSON errors
  console.log('🔧 Setting up auth routes...');
  
  if (!supabase) {
    console.log("⚠️ Supabase not initialized - registering fallback auth routes");
    
    // Fallback auth route that returns proper JSON error
    app.get("/api/auth/user", (req, res) => {
      console.log("❌ Auth request failed - Supabase not available");
      res.status(503).json({ 
        message: "Authentication service unavailable - Supabase not initialized",
        error: "SERVICE_UNAVAILABLE" 
      });
    });
    
    app.post("/api/auth/signout", (req, res) => {
      res.status(503).json({ 
        message: "Authentication service unavailable",
        error: "SERVICE_UNAVAILABLE" 
      });
    });
    
    console.log("⚠️ Fallback auth routes registered");
    return;
  }

  // Auth routes
  app.get("/api/auth/user", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      console.log('🔐 Auth request received:', { 
        hasAuthHeader: !!authHeader, 
        headerLength: authHeader?.length,
        headerPrefix: authHeader?.substring(0, 20) + '...'
      });
      
      const token = authHeader?.replace('Bearer ', '');
      
      if (!token) {
        console.log('❌ No token provided in request');
        return res.status(401).json({ message: "No token provided" });
      }

      console.log('🔍 Validating token with Supabase...');
      const user = await getUserFromToken(token);
      
      if (!user) {
        console.log('❌ Token validation failed - invalid token');
        return res.status(401).json({ message: "Invalid token" });
      }

      console.log('✅ User authenticated successfully:', user.email);
      res.json(user);
    } catch (error) {
      console.error("❌ Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Sign out endpoint (client-side handles most of this)
  app.post("/api/auth/signout", (req, res) => {
    res.json({ message: "Signed out successfully" });
  });

  console.log("✅ Supabase Auth routes configured successfully");
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await getUserFromToken(token);
    
    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ message: "Authentication failed" });
  }
};