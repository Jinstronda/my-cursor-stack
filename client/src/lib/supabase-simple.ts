/**
 * Simplified Supabase client - Single source of truth
 * Eliminates environment variable confusion and ensures consistent connection
 */
import { createClient } from '@supabase/supabase-js';

// Production values - work everywhere
const SUPABASE_URL = 'https://ronbobkftucgcffiqtgu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvbmJvYmtmdHVjZ2NmZmlxdGd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MjEyMDUsImV4cCI6MjA3MTM5NzIwNX0.5k73tcz7d-N0f6PmzBB1Y0WVaCetFE_l1RI_wIg6MSQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export default supabase;