import { createClient } from '@supabase/supabase-js';

// Environment validation
function validateSupabaseEnv() {
  const requiredEnvVars = ["SUPABASE_URL", "SUPABASE_ANON_KEY"];
  const missingVars = requiredEnvVars.filter(varName => {
    const value = process.env[varName];
    return !value || value.trim() === '';
  });
  
  if (missingVars.length > 0) {
    console.error(`❌ CRITICAL: Missing environment variables: ${missingVars.join(", ")}`);
    console.error('Available env vars:', Object.keys(process.env).filter(key => 
      key.includes('SUPABASE') || key.includes('VERCEL')
    ));
    console.error('NODE_ENV:', process.env.NODE_ENV);
    console.error('VERCEL:', process.env.VERCEL);
    return false;
  }
  
  return true;
}

// Supabase clients - initialized after dotenv loads
let supabase: any = null;
let supabaseAdmin: any = null;

// Initialize Supabase clients after environment variables are loaded
async function initializeSupabase() {
  if (!validateSupabaseEnv()) {
    console.error('❌ CRITICAL: Supabase client not initialized - missing environment variables');
    console.error('Required variables: SUPABASE_URL, SUPABASE_ANON_KEY');
    console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('SUPABASE')));
    throw new Error('Supabase initialization failed - missing environment variables');
  }

  try {
    // Create main Supabase client
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    console.log('✅ Supabase client initialized');

    // Create admin client if service role key is available
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      supabaseAdmin = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
      console.log('✅ Supabase admin client initialized');
    }
  } catch (error) {
    console.error('❌ Supabase initialization failed:', error);
    supabase = null;
    supabaseAdmin = null;
  }
}

export { supabase, supabaseAdmin, initializeSupabase };
export default supabase;