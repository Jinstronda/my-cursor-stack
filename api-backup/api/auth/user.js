/**
 * Optimized Serverless Function for /api/auth/user
 * Lightweight authentication endpoint to avoid FUNCTION_INVOCATION_FAILED
 * 
 * This function is designed to:
 * - Have minimal cold start time
 * - Avoid heavy Express server initialization
 * - Provide fast user authentication validation
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with minimal overhead
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
}

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Get user data from JWT token (lightweight version)
 */
async function getUserFromToken(token) {
  if (!supabase) {
    console.log('❌ Supabase client not initialized');
    return null;
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

    // Return lightweight user object (no database sync to avoid timeouts)
    return {
      id: user.id,
      email: user.email || '',
      username: user.email || '',
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Unknown User',
      profileImageUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    };
  } catch (error) {
    console.error("Error getting user from token:", error);
    return null;
  }
}

/**
 * Main serverless function handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    console.log('🔐 Serverless auth request received:', { 
      hasAuthHeader: !!authHeader, 
      headerLength: authHeader?.length,
      method: req.method
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
    console.error("❌ Error in serverless auth function:", error);
    res.status(500).json({ message: "Authentication failed" });
  }
}