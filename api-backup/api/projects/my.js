/**
 * Optimized Serverless Function for /api/projects/my
 * Lightweight endpoint to avoid FUNCTION_INVOCATION_FAILED
 * 
 * This function is designed to:
 * - Have minimal cold start time
 * - Avoid heavy Express server initialization
 * - Provide fast user projects data with authentication
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
 * Get user from JWT token (lightweight version)
 */
async function getUserFromToken(token) {
  if (!supabase) {
    console.log('❌ Supabase client not initialized');
    return null;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.log('❌ Invalid token or user not found');
      return null;
    }

    return {
      id: user.id,
      email: user.email || '',
    };
  } catch (error) {
    console.error("Error getting user from token:", error);
    return null;
  }
}

/**
 * Get user's projects from database
 */
async function getUserProjects(userId) {
  if (!supabase) {
    console.log('❌ Supabase client not initialized');
    return [];
  }

  try {
    console.log('🎬 Fetching projects for user:', userId);
    
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        description,
        genre,
        status,
        budget,
        is_public,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('❌ Supabase query error:', error.message);
      return [];
    }
    
    console.log(`✅ Found ${projects?.length || 0} projects for user`);
    return projects || [];
  } catch (error) {
    console.error("Error fetching user projects:", error);
    return [];
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
    console.log('🎬 My projects request received:', { 
      hasAuthHeader: !!authHeader, 
      headerLength: authHeader?.length
    });
    
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      console.log('❌ No token provided in request');
      return res.status(401).json({ message: "Authentication required" });
    }

    console.log('🔍 Validating token for projects access...');
    const user = await getUserFromToken(token);
    
    if (!user) {
      console.log('❌ Token validation failed for projects');
      return res.status(401).json({ message: "Invalid token" });
    }

    console.log('✅ User authenticated, fetching projects...');
    const projects = await getUserProjects(user.id);
    
    console.log(`✅ Returning ${projects.length} projects for user: ${user.email}`);
    res.json(projects);
  } catch (error) {
    console.error("❌ Error in my projects function:", error);
    res.status(500).json({ message: "Failed to fetch projects" });
  }
}