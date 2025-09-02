/**
 * Optimized Serverless Function for /api/production-companies/user
 * Lightweight endpoint to avoid FUNCTION_INVOCATION_FAILED
 * 
 * This function is designed to:
 * - Have minimal cold start time
 * - Avoid heavy Express server initialization
 * - Provide fast user production company data with authentication
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
 * Get user's production company from database
 */
async function getUserProductionCompany(userId) {
  if (!supabase) {
    console.log('❌ Supabase client not initialized');
    return null;
  }

  try {
    console.log('🏭 Fetching production company for user:', userId);
    
    const { data: company, error } = await supabase
      .from('production_companies')
      .select(`
        id,
        name,
        description,
        location,
        services,
        contact_email,
        contact_phone,
        website,
        logo,
        cover_image,
        images,
        rating,
        review_count,
        verified,
        plan_type,
        created_at,
        users!production_companies_owner_id_fkey (
          id,
          name,
          email,
          profile_image_url
        )
      `)
      .eq('owner_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No production company found for this user
        console.log('ℹ️ No production company found for user');
        return null;
      }
      console.error('❌ Supabase query error:', error.message);
      return null;
    }
    
    console.log('✅ Found production company for user:', company?.name);
    
    // Fix field name mapping for frontend compatibility
    if (company) {
      return {
        ...company,
        coverImage: company.cover_image,
        contactEmail: company.contact_email,
        contactPhone: company.contact_phone,
        reviewCount: company.review_count,
        planType: company.plan_type,
        createdAt: company.created_at,
      };
    }
    
    return company;
  } catch (error) {
    console.error("Error fetching user production company:", error);
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
    console.log('🏭 User production company request received:', { 
      hasAuthHeader: !!authHeader, 
      headerLength: authHeader?.length
    });
    
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      console.log('❌ No token provided in request');
      return res.status(401).json({ message: "Authentication required" });
    }

    console.log('🔍 Validating token for production company access...');
    const user = await getUserFromToken(token);
    
    if (!user) {
      console.log('❌ Token validation failed for production company');
      return res.status(401).json({ message: "Invalid token" });
    }

    console.log('✅ User authenticated, fetching production company...');
    const company = await getUserProductionCompany(user.id);
    
    if (!company) {
      console.log('ℹ️ No production company found for user:', user.email);
      return res.status(404).json({ message: "No production company found for user" });
    }

    console.log(`✅ Returning production company for user: ${user.email}`);
    res.json(company);
  } catch (error) {
    console.error("❌ Error in user production company function:", error);
    res.status(500).json({ message: "Failed to fetch user production company" });
  }
}