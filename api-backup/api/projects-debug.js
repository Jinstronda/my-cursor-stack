/**
 * DEBUG VERSION - Temporary API to identify exact failure point
 * Deploy this first to see exactly where it's failing
 */

import { createClient } from '@supabase/supabase-js';

// Initialize with extensive logging
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log('🔍 DEBUG: Environment check');
console.log('🔍 SUPABASE_URL exists:', !!supabaseUrl);
console.log('🔍 SUPABASE_ANON_KEY exists:', !!supabaseAnonKey);
console.log('🔍 SUPABASE_URL length:', supabaseUrl?.length || 0);
console.log('🔍 SUPABASE_ANON_KEY length:', supabaseAnonKey?.length || 0);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Missing Supabase environment variables');
  console.error('❌ SUPABASE_URL:', supabaseUrl ? 'EXISTS' : 'MISSING');
  console.error('❌ SUPABASE_ANON_KEY:', supabaseAnonKey ? 'EXISTS' : 'MISSING');
}

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

console.log('🔍 Supabase client created:', !!supabase);

async function debugCreateProject(userId, projectData) {
  console.log('🔍 DEBUG createProject started');
  console.log('🔍 userId:', userId);
  console.log('🔍 projectData:', JSON.stringify(projectData));
  console.log('🔍 supabase client exists:', !!supabase);

  if (!supabase) {
    console.error('❌ CRITICAL: Supabase client is null');
    return { error: 'Supabase client not initialized' };
  }

  try {
    console.log('🔍 Attempting Supabase insert...');
    
    const insertData = {
      name: projectData.name || 'Debug Test Project',
      description: projectData.description || null,
      genre: projectData.genre || null,
      status: projectData.status || 'esboço',
      budget: projectData.budget || null,
      user_id: userId,
      is_public: projectData.is_public || false
    };
    
    console.log('🔍 Insert data prepared:', JSON.stringify(insertData));
    
    const { data: project, error } = await supabase
      .from('projects')
      .insert(insertData)
      .select()
      .single();
    
    console.log('🔍 Supabase response received');
    console.log('🔍 Error:', error ? JSON.stringify(error) : 'None');
    console.log('🔍 Data:', project ? 'SUCCESS' : 'None');
    
    if (error) {
      console.error('❌ Supabase error:', error);
      return { error: error.message };
    }
    
    console.log('✅ Project created successfully:', project.id);
    return { success: true, project };
    
  } catch (error) {
    console.error('❌ Exception in createProject:', error);
    return { error: error.message };
  }
}

export default async function handler(req, res) {
  console.log('🔍 DEBUG API called:', req.method);
  
  // Set CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.json({ 
      status: 'DEBUG API ready',
      supabaseUrl: !!supabaseUrl,
      supabaseAnonKey: !!supabaseAnonKey,
      supabaseClient: !!supabase
    });
  }

  if (req.method === 'POST') {
    try {
      console.log('🔍 POST request body:', JSON.stringify(req.body));
      
      // Skip authentication for debug - use hardcoded user
      const debugUserId = '5b76b9ca-d3a9-46af-8fc8-b255c9acd8a6'; // gabrielxferreira14@gmail.com
      
      console.log('🔍 Creating project for debug user:', debugUserId);
      
      const result = await debugCreateProject(debugUserId, req.body);
      
      console.log('🔍 Create project result:', JSON.stringify(result));
      
      if (result.error) {
        return res.status(500).json({ 
          message: "Debug: Failed to create project", 
          error: result.error,
          debug: true
        });
      }
      
      return res.status(201).json({ 
        message: "Debug: Project created successfully",
        project: result.project,
        debug: true
      });
      
    } catch (error) {
      console.error('❌ Handler exception:', error);
      return res.status(500).json({ 
        message: "Debug: Handler exception", 
        error: error.message,
        debug: true
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}