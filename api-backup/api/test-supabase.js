/**
 * Test endpoint to verify Supabase connection works in Vercel
 */
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const startTime = Date.now();
  
  try {
    // Test 1: Environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    
    const envCheck = {
      supabaseUrl: !!supabaseUrl,
      supabaseAnonKey: !!supabaseAnonKey,
      supabaseUrlValue: supabaseUrl ? supabaseUrl.replace(/\/\/[^\/]+/, '//***.supabase.co') : null
    };

    // Test 2: Client initialization
    let clientInit = false;
    let clientError = null;
    let supabase = null;
    
    try {
      if (supabaseUrl && supabaseAnonKey) {
        supabase = createClient(supabaseUrl, supabaseAnonKey);
        clientInit = true;
      }
    } catch (error) {
      clientError = error.message;
    }

    // Test 3: Database query
    let dbTest = null;
    let dbError = null;
    
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('count')
          .limit(1);
        
        if (error) {
          dbError = error.message;
        } else {
          dbTest = {
            success: true,
            dataCount: data?.length || 0
          };
        }
      } catch (error) {
        dbError = error.message;
      }
    }

    const result = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercel: process.env.VERCEL,
        platform: process.platform
      },
      environmentCheck: envCheck,
      clientInitialization: {
        success: clientInit,
        error: clientError
      },
      databaseTest: {
        success: !!dbTest,
        data: dbTest,
        error: dbError
      }
    };

    console.log('🔍 Supabase test result:', JSON.stringify(result, null, 2));
    
    res.status(200).json(result);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}