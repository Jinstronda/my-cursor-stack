/**
 * Simplified server-side Supabase client
 * Single configuration, works everywhere
 */
import { createClient } from '@supabase/supabase-js';

// Production values - consistent everywhere
const SUPABASE_URL = 'https://ronbobkftucgcffiqtgu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service_key_needed_for_server_ops';

// Admin client for server operations
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Regular client for user operations
export const supabase = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvbmJvYmtmdHVjZ2NmZmlxdGd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MjEyMDUsImV4cCI6MjA3MTM5NzIwNX0.5k73tcz7d-N0f6PmzBB1Y0WVaCetFE_l1RI_wIg6MSQ');

export default supabase;