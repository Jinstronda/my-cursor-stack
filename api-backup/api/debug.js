/**
 * DEBUG ENDPOINT: Test runtime connectivity to Supabase
 * This will help identify exactly where the failure occurs
 */
import { createClient } from '@supabase/supabase-js';

// Test 1: Basic environment variable check
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log('🐛 DEBUG: Environment variables check');
console.log('SUPABASE_URL exists:', !!supabaseUrl);
console.log('SUPABASE_ANON_KEY exists:', !!supabaseAnonKey);
console.log('SUPABASE_URL value:', supabaseUrl);
console.log('SUPABASE_ANON_KEY length:', supabaseAnonKey?.length);

// Test 2: Supabase client initialization
let supabase = null;
try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✅ Supabase client initialized successfully');
  } else {
    console.log('❌ Cannot initialize Supabase - missing credentials');
  }
} catch (error) {
  console.error('❌ Error initializing Supabase client:', error);
}

// Test 3: Database connectivity test
async function testDatabaseConnection() {
  if (!supabase) {
    return { error: 'Supabase client not initialized' };
  }

  try {
    console.log('🔄 Testing database connection...');
    const { data, error } = await supabase
      .from('projects')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Database query error:', error);
      return { error: error.message };
    }
    
    console.log('✅ Database connection successful');
    return { success: true, data: { count: data?.length || 0 } };
  } catch (error) {
    console.error('❌ Database connection exception:', error);
    return { error: error.message };
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const debugInfo = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    supabaseUrlExists: !!supabaseUrl,
    supabaseKeyExists: !!supabaseAnonKey,
    supabaseClientInitialized: !!supabase,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      envKeys: Object.keys(process.env).filter(key => 
        key.includes('SUPABASE') || key.includes('VERCEL')
      )
    }
  };

  console.log('🐛 DEBUG: Starting runtime connectivity test', debugInfo);

  const dbTest = await testDatabaseConnection();
  
  const result = {
    ...debugInfo,
    databaseTest: dbTest,
    fullEnvironment: process.env.NODE_ENV === 'development' ? {
      supabaseUrl: supabaseUrl,
      supabaseKeyLength: supabaseAnonKey?.length
    } : {
      // Don't expose keys in production
      supabaseUrlPreview: supabaseUrl?.substring(0, 20) + '...',
      supabaseKeyLength: supabaseAnonKey?.length
    }
  };

  console.log('🐛 DEBUG: Test complete', result);
  res.status(200).json(result);
}