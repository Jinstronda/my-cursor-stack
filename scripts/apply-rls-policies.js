/**
 * Apply RLS Policies Script
 * 
 * This script applies RLS policies directly to Supabase using the service role key.
 * This will fix the production data visibility issue.
 * 
 * Usage: node scripts/apply-rls-policies.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

// Create Supabase admin client (bypasses RLS for applying policies)
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * RLS policies to apply
 */
const rlsPolicies = [
  // Projects policies
  {
    table: 'projects',
    name: 'Users can view their own projects',
    sql: `CREATE POLICY "Users can view their own projects" ON projects FOR SELECT USING (auth.uid() = user_id);`
  },
  {
    table: 'projects', 
    name: 'Users can create their own projects',
    sql: `CREATE POLICY "Users can create their own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);`
  },
  {
    table: 'projects',
    name: 'Users can update their own projects', 
    sql: `CREATE POLICY "Users can update their own projects" ON projects FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`
  },
  {
    table: 'projects',
    name: 'Users can delete their own projects',
    sql: `CREATE POLICY "Users can delete their own projects" ON projects FOR DELETE USING (auth.uid() = user_id);`
  },
  
  // Production companies policies
  {
    table: 'production_companies',
    name: 'Anyone can view production companies',
    sql: `CREATE POLICY "Anyone can view production companies" ON production_companies FOR SELECT USING (true);`
  },
  {
    table: 'production_companies',
    name: 'Users can create production companies',
    sql: `CREATE POLICY "Users can create production companies" ON production_companies FOR INSERT WITH CHECK (auth.uid() = owner_id);`
  },
  {
    table: 'production_companies',
    name: 'Company owners can update their companies',
    sql: `CREATE POLICY "Company owners can update their companies" ON production_companies FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);`
  },
  {
    table: 'production_companies',
    name: 'Company owners can delete their companies',
    sql: `CREATE POLICY "Company owners can delete their companies" ON production_companies FOR DELETE USING (auth.uid() = owner_id);`
  },
  
  // Editais policies
  {
    table: 'editais',
    name: 'Anyone can view editais',
    sql: `CREATE POLICY "Anyone can view editais" ON editais FOR SELECT USING (true);`
  },
  {
    table: 'editais',
    name: 'Only authenticated users can create editais',
    sql: `CREATE POLICY "Only authenticated users can create editais" ON editais FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);`
  },
  
  // Users policies
  {
    table: 'users',
    name: 'Users can view their own profile',
    sql: `CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);`
  },
  {
    table: 'users',
    name: 'Users can update their own profile',
    sql: `CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);`
  }
];

/**
 * Apply a single RLS policy using direct SQL execution
 */
async function applyPolicy(policy) {
  try {
    console.log(`📝 Applying: ${policy.name} (${policy.table})`);
    
    // Use fetch to execute SQL directly against Supabase REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseServiceRoleKey
      },
      body: JSON.stringify({
        sql: policy.sql
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      
      // Check if policy already exists
      if (errorText.includes('already exists')) {
        console.log(`⚠️  Policy already exists: ${policy.name}`);
        return true;
      }
      
      console.error(`❌ Failed to apply policy: ${policy.name}`);
      console.error(`   Error: ${errorText}`);
      return false;
    }
    
    console.log(`✅ Applied: ${policy.name}`);
    return true;
  } catch (error) {
    console.error(`💥 Exception applying policy ${policy.name}:`, error.message);
    return false;
  }
}

/**
 * Ensure RLS is enabled on all tables
 */
async function ensureRLSEnabled() {
  const tables = ['projects', 'production_companies', 'editais', 'users'];
  
  console.log('\n🔒 Ensuring RLS is enabled on all tables...');
  
  for (const table of tables) {
    try {
      const { error } = await supabase.rpc('sql', {
        query: `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`
      });
      
      if (error && !error.message.includes('already enabled')) {
        console.error(`❌ Failed to enable RLS on ${table}: ${error.message}`);
        return false;
      }
      
      console.log(`✅ RLS enabled on ${table}`);
    } catch (error) {
      console.error(`💥 Exception enabling RLS on ${table}:`, error.message);
      return false;
    }
  }
  
  return true;
}

/**
 * Verify policies were applied correctly
 */
async function verifyPolicies() {
  console.log('\n🔍 Verifying policies were created...');
  
  try {
    const { data, error } = await supabase.rpc('sql', {
      query: `
        SELECT tablename, policyname, cmd 
        FROM pg_policies 
        WHERE tablename IN ('projects', 'production_companies', 'editais', 'users')
        ORDER BY tablename, policyname;
      `
    });
    
    if (error) {
      console.error('❌ Failed to verify policies:', error.message);
      return false;
    }
    
    if (!data || data.length === 0) {
      console.error('❌ No policies found after applying!');
      return false;
    }
    
    console.log(`✅ Found ${data.length} policies in database:`);
    data.forEach(policy => {
      console.log(`   - ${policy.tablename}: ${policy.policyname} (${policy.cmd})`);
    });
    
    return true;
  } catch (error) {
    console.error('💥 Exception verifying policies:', error.message);
    return false;
  }
}

/**
 * Main application function
 */
async function applyRLSPolicies() {
  console.log('🚀 Applying RLS Policies to Supabase');
  console.log('====================================');
  console.log(`📍 Project: ${supabaseUrl}`);
  console.log(`🔑 Using service role key: ${supabaseServiceRoleKey.substring(0, 20)}...`);
  
  // Step 1: Ensure RLS is enabled
  const rlsEnabled = await ensureRLSEnabled();
  if (!rlsEnabled) {
    console.error('💥 Failed to enable RLS on tables. Aborting.');
    process.exit(1);
  }
  
  // Step 2: Apply all policies
  console.log('\n📋 Applying RLS policies...');
  let successCount = 0;
  let failureCount = 0;
  
  for (const policy of rlsPolicies) {
    const success = await applyPolicy(policy);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
    
    // Small delay to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Step 3: Verify policies
  const verified = await verifyPolicies();
  
  // Step 4: Report results
  console.log('\n📊 RESULTS');
  console.log('==========');
  console.log(`✅ Policies applied successfully: ${successCount}`);
  console.log(`❌ Policies failed: ${failureCount}`);
  console.log(`🔍 Verification: ${verified ? 'PASSED' : 'FAILED'}`);
  
  if (successCount > 0 && verified) {
    console.log('\n🎉 SUCCESS! RLS policies have been applied.');
    console.log('✅ Production Supabase connection should now work correctly.');
    console.log('📱 Users should now see their own data in the app.');
    console.log('\n🔄 Next steps:');
    console.log('   1. Test the app in production');
    console.log('   2. Verify users can see their projects/data');
    console.log('   3. Check that unauthorized access is still blocked');
  } else {
    console.log('\n⚠️  Some policies may not have been applied correctly.');
    console.log('📚 Check the errors above and refer to SUPABASE_RLS_FIX.md');
  }
  
  process.exit(failureCount === 0 ? 0 : 1);
}

// Execute the script
applyRLSPolicies().catch(error => {
  console.error('💥 Script crashed:', error);
  process.exit(1);
});