/**
 * Optimized Serverless Function for /api/production-companies/[id]
 * Lightweight endpoint to get and update individual company details
 * 
 * This function is designed to:
 * - Handle GET (get company) and PATCH (update company) operations
 * - Have minimal cold start time
 * - Avoid heavy Express server initialization
 * - Provide fast company operations with authentication for updates
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
 * Get production company by ID
 */
async function getProductionCompanyById(id) {
  if (!supabase) {
    console.log('❌ Supabase client not initialized');
    return null;
  }

  try {
    console.log('🔍 Fetching production company with ID:', id);
    
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
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No production company found with this ID
        console.log('ℹ️ No production company found with ID:', id);
        return null;
      }
      console.error('❌ Supabase query error:', error.message);
      return null;
    }
    
    console.log('✅ Found production company:', company?.name);
    
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
    console.error("Error fetching production company by ID:", error);
    return null;
  }
}

/**
 * Update production company
 */
async function updateProductionCompany(companyId, userId, updates) {
  if (!supabase) {
    console.log('❌ Supabase client not initialized');
    return null;
  }

  try {
    console.log('🏭 Updating production company:', companyId, 'for user:', userId);
    
    // First verify ownership
    const { data: existingCompany, error: checkError } = await supabase
      .from('production_companies')
      .select('id, owner_id')
      .eq('id', companyId)
      .single();
      
    if (checkError || !existingCompany) {
      console.error('❌ Production company not found:', checkError?.message);
      return null;
    }
    
    if (existingCompany.owner_id !== userId) {
      console.error('❌ User does not own this production company');
      return null;
    }
    
    // Prepare update data with proper field mapping
    const updateData = {
      name: updates.name,
      description: updates.description,
      location: updates.location,
      services: updates.services,
      contact_email: updates.contactEmail || updates.contact_email,
      contact_phone: updates.contactPhone || updates.contact_phone,
      website: updates.website,
      logo: updates.logo,
      cover_image: updates.coverImage || updates.cover_image,
      images: updates.images,
      plan_type: updates.planType || updates.plan_type
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );
    
    // Update the company
    const { data: company, error } = await supabase
      .from('production_companies')
      .update(updateData)
      .eq('id', companyId)
      .eq('owner_id', userId)
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
      .single();
    
    if (error) {
      console.error('❌ Supabase update production company error:', error.message);
      return null;
    }
    
    console.log('✅ Production company updated:', company.id);
    
    // Fix field name mapping for frontend compatibility
    return {
      ...company,
      coverImage: company.cover_image,
      contactEmail: company.contact_email,
      contactPhone: company.contact_phone,
      reviewCount: company.review_count,
      planType: company.plan_type,
      createdAt: company.created_at,
    };
  } catch (error) {
    console.error("Error updating production company:", error);
    return null;
  }
}

/**
 * Main serverless function handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Get company ID from URL path
    const { id } = req.query;
    console.log('🏭 Company request for ID:', id, 'Method:', req.method);
    
    if (!id) {
      console.log('❌ No company ID provided');
      return res.status(400).json({ message: "Company ID is required" });
    }

    // Handle GET - Get Company Details
    if (req.method === 'GET') {
      const company = await getProductionCompanyById(id);
      
      if (!company) {
        console.log('❌ Company not found with ID:', id);
        return res.status(404).json({ message: "Empresa não encontrada" });
      }

      console.log(`✅ Returning company details for: ${company.name}`);
      return res.json(company);
    }

    // Handle PATCH - Update Company (requires authentication)
    if (req.method === 'PATCH') {
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace('Bearer ', '');
      
      if (!token) {
        console.log('❌ No token provided for company update');
        return res.status(401).json({ message: "Authentication required" });
      }

      console.log('🔍 Validating token for company update...');
      const user = await getUserFromToken(token);
      
      if (!user) {
        console.log('❌ Token validation failed for company update');
        return res.status(401).json({ message: "Invalid token" });
      }

      console.log('✅ User authenticated, updating company...');
      const company = await updateProductionCompany(parseInt(id), user.id, req.body);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found or access denied" });
      }
      
      console.log(`✅ Company updated successfully for user: ${user.email}`);
      return res.json(company);
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error("❌ Error in company function:", error);
    res.status(500).json({ message: "Failed to process request" });
  }
}