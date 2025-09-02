/**
 * Auth Theory Test Runner
 * Execute this to validate our authentication theory
 */

import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = 'https://ronbobkftucgcffiqtgu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvbmJvYmtmdHVjZ2NmZmlxdGd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MjEyMDUsImV4cCI6MjA3MTM5NzIwNX0.5k73tcz7d-N0f6PmzBB1Y0WVaCetFE_l1RI_wIg6MSQ';

async function testAuthTheory() {
  console.log('🧪 Running Auth Theory Validation Tests...');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const tests = [
    {
      name: 'RPC Function Test',
      fn: async () => {
        const result = await supabase.rpc('get_current_user_profile');
        return { success: !result.error, data: result.data, error: result.error?.message };
      }
    },
    {
      name: 'Direct Table Query Test',
      fn: async () => {
        const result = await supabase.from('users').select('count', { count: 'exact', head: true });
        return { success: !result.error, count: result.count, error: result.error?.message };
      }
    },
    {
      name: 'Session Test',
      fn: async () => {
        const result = await supabase.auth.getSession();
        return { success: !result.error, hasSession: !!result.data?.session, error: result.error?.message };
      }
    },
    {
      name: 'Projects Table Test',
      fn: async () => {
        const result = await supabase.from('projects').select('count', { count: 'exact', head: true });
        return { success: !result.error, count: result.count, error: result.error?.message };
      }
    },
    {
      name: 'Public Users Query Test',
      fn: async () => {
        const result = await supabase.from('users').select('id, email, name').limit(1);
        return { success: !result.error, dataLength: result.data?.length || 0, error: result.error?.message };
      }
    }
  ];
  
  const results = [];
  for (const test of tests) {
    try {
      console.log(`Running: ${test.name}`);
      const result = await test.fn();
      console.log(`Result:`, result);
      results.push({ name: test.name, ...result });
    } catch (error) {
      console.log(`Error:`, error.message);
      results.push({ name: test.name, success: false, error: error.message });
    }
  }
  
  return results;
}

async function runAuthTests() {
  console.log('🚀 Starting Authentication Theory Validation');
  console.log('=' .repeat(60));
  
  try {
    const results = await testAuthTheory();
    
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(60));
    
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.name}`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.count !== undefined) {
        console.log(`   Count: ${result.count}`);
      }
      
      if (result.hasSession !== undefined) {
        console.log(`   Has Session: ${result.hasSession}`);
      }
      
      if (result.data) {
        console.log(`   Data: ${JSON.stringify(result.data)}`);
      }
      
      console.log('');
    });
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    console.log(`\n🎯 Summary: ${successCount}/${totalCount} tests passed`);
    
    // Analysis
    console.log('\n🔍 Theory Validation Analysis:');
    console.log('=' .repeat(60));
    
    const rpcTest = results.find(r => r.name === 'RPC Function Test');
    const tableTest = results.find(r => r.name === 'Direct Table Query Test');
    const sessionTest = results.find(r => r.name === 'Session Test');
    
    if (rpcTest && !rpcTest.success) {
      console.log('✅ THEORY CONFIRMED: RPC function fails as expected');
      console.log(`   RPC Error: ${rpcTest.error}`);
    } else if (rpcTest && rpcTest.success) {
      console.log('❓ THEORY UNCONFIRMED: RPC function succeeded unexpectedly');
    }
    
    if (tableTest) {
      if (tableTest.success) {
        console.log('✅ Direct table access works');
        console.log(`   User count: ${tableTest.count}`);
      } else {
        console.log('❌ Direct table access failed');
        console.log(`   Error: ${tableTest.error}`);
        
        if (tableTest.error?.includes('permission denied') || tableTest.error?.includes('42501')) {
          console.log('🔍 RLS policies are blocking access - this is expected without auth');
        }
      }
    }
    
    if (sessionTest) {
      if (sessionTest.hasSession) {
        console.log('📱 Active session found - user is logged in');
      } else {
        console.log('📱 No active session - user is not logged in (expected for tests)');
      }
    }
    
    console.log('\n💡 Next Steps Based on Results:');
    console.log('=' .repeat(60));
    
    if (rpcTest && !rpcTest.success && tableTest && tableTest.error?.includes('permission')) {
      console.log('1. ✅ Theory confirmed: RPC functions fail, direct queries blocked by RLS');
      console.log('2. 🔧 Solution: Replace RPC calls with direct queries using session.user.id');
      console.log('3. 🔐 Fix RLS policies to allow proper user access');
    } else {
      console.log('1. 🔍 Theory needs refinement based on unexpected results');
      console.log('2. 📋 Review test results and adjust hypothesis');
    }
    
  } catch (error) {
    console.error('💥 Test execution failed:', error.message);
    console.error(error.stack);
  }
}

// Run the tests
runAuthTests();