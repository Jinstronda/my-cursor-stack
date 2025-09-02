/**
 * Simplified server authentication
 * Direct Supabase integration, minimal complexity
 */
import type { Express, RequestHandler } from "express";
import { supabase } from "./supabase-simple";

// Simple user type - compatible with routes expectations
interface SimpleUser {
  id: string;
  email: string;
  name: string;
  username: string;
  profileImageUrl?: string;
  [key: string]: any;
}

// Get user from JWT token - simplified version
async function getUserFromToken(token: string): Promise<SimpleUser | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.full_name || 
            user.user_metadata?.name || 
            user.email?.split('@')[0] || 
            'User',
      username: user.email || '',
      profileImageUrl: user.user_metadata?.avatar_url || 
                      user.user_metadata?.picture || 
                      null,
    };
  } catch (error) {
    console.error("Token validation error:", error);
    return null;
  }
}

export function setupSimpleAuth(app: Express) {
  // Get current user endpoint
  app.get("/api/auth/user", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      const user = await getUserFromToken(token);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid token" });
      }

      res.json(user);
    } catch (error) {
      console.error("Auth error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // Sign out endpoint
  app.post("/api/auth/signout", (req, res) => {
    res.json({ message: "Signed out successfully" });
  });

  console.log("✅ Simple auth routes configured");
}

// Simple authentication middleware
export const requireAuth: RequestHandler = async (req: any, res, next) => {
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
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ message: "Authentication failed" });
  }
};