/**
 * Optimized Serverless Function for /api/production-companies
 * Lightweight endpoint to avoid FUNCTION_INVOCATION_FAILED
 * 
 * This function is designed to:
 * - Have minimal cold start time
 * - Avoid heavy Express server initialization
 * - Provide fast production companies data
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
 * Get all production companies (public endpoint)
 */
async function getAllProductionCompanies(limit = 50) {
  if (!supabase) {
    console.log('❌ Supabase client not initialized');
    return [];
  }

  try {
    console.log('🔍 Fetching production companies from Supabase...');
    
    const { data: companies, error } = await supabase
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
      .limit(limit)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Supabase query error:', error.message);
      return [];
    }
    
    console.log(`✅ Found ${companies?.length || 0} production companies`);
    
    // Fix field name mapping for frontend compatibility
    if (companies && companies.length > 0) {
      return companies.map(company => ({
        ...company,
        coverImage: company.cover_image,
        contactEmail: company.contact_email,
        contactPhone: company.contact_phone,
        reviewCount: company.review_count,
        planType: company.plan_type,
        createdAt: company.created_at,
      }));
    }
    
    return companies || [];
  } catch (error) {
    console.error("Error fetching production companies:", error);
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
    console.log('🏭 Production companies request received');
    
    const limit = parseInt(req.query.limit) || 50;
    const companies = await getAllProductionCompanies(limit);
    
    console.log(`✅ Returning ${companies.length} production companies`);
    res.json(companies);
  } catch (error) {
    console.error("❌ Error in production companies function:", error);
    res.status(500).json({ message: "Failed to fetch production companies" });
  }
}