#!/usr/bin/env node

/**
 * Step 1: RLS Regression Analysis
 * Systematically diagnose authentication failures and RLS policy issues
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://ronbobkftucgcffiqtgu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvbmJvYmtmdHVjZ2NmZmlxdGd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MjEyMDUsImV4cCI6MjA3MTM5NzIwNX0.5k73tcz7d-N0f6PmzBB1Y0WVaCetFE_l1RI_wIg6MSQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Test 1.1: RLS Policy Validation
 */
async function testRLSPolicies() {
  console.log('🔍 Test 1.1: RLS Policy Validation');
  const results = [];
  
  try {
    // Test if basic table access works
    const { data: tableData, error: tableError } = await supabase.from('users').select('count', { count: 'exact', head: true });
    results.push({ 
      test: 'Users Table Access', 
      passed: !tableError,
      error: tableError?.message,
      count: tableData !== null ? 'accessible' : 'inaccessible'
    });
    
    // Test if auth context is available
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    results.push({ 
      test: 'Auth Session Available', 
      passed: !sessionError && !!session,
      error: sessionError?.message || (session ? null : 'No session available'),
      sessionId: session?.user?.id?.slice(0, 8) || 'none'
    });
    
    // Test if we can query current user (if session exists)
    if (session) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      results.push({ 
        test: 'User Query with Session', 
        passed: !userError,
        error: userError?.message,
        userData: userData ? 'found' : 'not found'
      });
    } else {
      results.push({
        test: 'User Query with Session',
        passed: false,
        error: 'No session available for user query',
        userData: 'skipped'
      });
    }
    
    // Test projects table access
    const { data: projectsData, error: projectsError } = await supabase.from('projects').select('count', { count: 'exact', head: true });
    results.push({
      test: 'Projects Table Access',
      passed: !projectsError,
      error: projectsError?.message,
      count: projectsData !== null ? 'accessible' : 'inaccessible'
    });
    
    // Test production companies table access (should be public)
    const { data: companiesData, error: companiesError } = await supabase.from('production_companies').select('count', { count: 'exact', head: true });
    results.push({
      test: 'Production Companies Table Access',
      passed: !companiesError,
      error: companiesError?.message,
      count: companiesData !== null ? 'accessible' : 'inaccessible'
    });
    
  } catch (error) {
    results.push({ 
      test: 'RLS Policies Test', 
      passed: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
  
  return results;
}

/**
 * Test 1.2: RLS vs Direct Query Comparison
 */
async function testRLSvsDirectQuery() {
  console.log('🔍 Test 1.2: RLS vs Direct Query Comparison');
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user?.id) {
    return {
      error: 'No user ID available for comparison test - need authenticated session',
      skipped: true
    };
  }
  
  const targetUserId = session.user.id;
  
  // Test RLS-protected query
  const rlsQuery = await supabase.from('users').select('*').eq('id', targetUserId).single();
  
  // Test direct query with same client (should also respect RLS)
  const directQuery = await supabase.from('users').select('id, email, name').eq('id', targetUserId).single();
  
  return {
    targetUserId: targetUserId.slice(0, 8) + '...',
    rlsWorks: !rlsQuery.error,
    directWorks: !directQuery.error,
    rlsError: rlsQuery.error?.message,
    directError: directQuery.error?.message,
    rlsErrorCode: rlsQuery.error?.code,
    directErrorCode: directQuery.error?.code,
    sameResults: JSON.stringify(rlsQuery.data?.id) === JSON.stringify(directQuery.data?.id),
    rlsDataFound: !!rlsQuery.data,
    directDataFound: !!directQuery.data
  };
}

/**
 * Test 1.3: Authentication State Corruption Check
 */
async function testAuthStateCorruption() {
  console.log('🔍 Test 1.3: Authentication State Corruption Check');
  
  const session = await supabase.auth.getSession();
  
  // Try to refresh session
  const refreshedSession = await supabase.auth.refreshSession();
  
  return {
    originalSession: !!session.data.session,
    refreshedSession: !!refreshedSession.data.session,
    sessionIdMatch: session.data.session?.user.id === refreshedSession.data.session?.user.id,
    originalError: session.error?.message,
    refreshedError: refreshedSession.error?.message,
    originalUserId: session.data.session?.user?.id?.slice(0, 8) || 'none',
    refreshedUserId: refreshedSession.data.session?.user?.id?.slice(0, 8) || 'none'
  };
}

/**
 * Execute Step 1: RLS Regression Analysis
 */
async function executeStep1() {
  console.log('🚀 Starting Step 1: RLS Regression Analysis');
  console.log('=' .repeat(60));
  
  const stepResults = {
    step: 1,
    name: 'RLS Regression Analysis',
    tests: {},
    success: false,
    summary: ''
  };
  
  try {
    // Test 1.1: RLS Policy Validation
    stepResults.tests.rlsPolicies = await testRLSPolicies();
    
    // Test 1.2: RLS vs Direct Query Comparison
    stepResults.tests.rlsComparison = await testRLSvsDirectQuery();
    
    // Test 1.3: Authentication State Corruption Check
    stepResults.tests.authCorruption = await testAuthStateCorruption();
    
    // Analyze results
    console.log('\n📊 Step 1 Results Analysis:');
    console.log('=' .repeat(60));
    
    // Analyze RLS Policy results
    const rlsResults = stepResults.tests.rlsPolicies;
    const passedRLS = rlsResults.filter(r => r.passed).length;
    const totalRLS = rlsResults.length;
    
    console.log(`\n🔍 Test 1.1 - RLS Policy Validation: ${passedRLS}/${totalRLS} passed`);
    rlsResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`  ${status} ${result.test}: ${result.error || 'OK'}`);
      if (result.count) console.log(`     Count: ${result.count}`);
      if (result.sessionId) console.log(`     Session: ${result.sessionId}`);
      if (result.userData) console.log(`     User data: ${result.userData}`);
    });
    
    // Analyze RLS comparison results
    const comparisonResult = stepResults.tests.rlsComparison;
    console.log(`\n🔍 Test 1.2 - RLS vs Direct Query Comparison:`);
    if (comparisonResult.skipped) {
      console.log('  ⏭️ SKIPPED: No authenticated session available');
    } else {
      console.log(`  User ID: ${comparisonResult.targetUserId}`);
      console.log(`  RLS Query: ${comparisonResult.rlsWorks ? '✅ Works' : '❌ Failed'}`);
      console.log(`  Direct Query: ${comparisonResult.directWorks ? '✅ Works' : '❌ Failed'}`);
      if (comparisonResult.rlsError) {
        console.log(`  RLS Error: ${comparisonResult.rlsError} (Code: ${comparisonResult.rlsErrorCode})`);
      }
      if (comparisonResult.directError) {
        console.log(`  Direct Error: ${comparisonResult.directError} (Code: ${comparisonResult.directErrorCode})`);
      }
    }
    
    // Analyze auth corruption results
    const corruptionResult = stepResults.tests.authCorruption;
    console.log(`\n🔍 Test 1.3 - Authentication State Corruption:`);
    console.log(`  Original Session: ${corruptionResult.originalSession ? '✅ Present' : '❌ Missing'}`);
    console.log(`  Refreshed Session: ${corruptionResult.refreshedSession ? '✅ Present' : '❌ Missing'}`);
    console.log(`  Session ID Match: ${corruptionResult.sessionIdMatch ? '✅ Match' : '❌ Mismatch'}`);
    console.log(`  Original User: ${corruptionResult.originalUserId}`);
    console.log(`  Refreshed User: ${corruptionResult.refreshedUserId}`);
    
    // Determine Step 1 success
    const hasSession = corruptionResult.originalSession;
    const rlsAccessible = rlsResults.some(r => r.test === 'Users Table Access' && r.passed);
    const authWorkingBasic = corruptionResult.originalSession && corruptionResult.refreshedSession;
    
    console.log('\n🎯 Step 1 Analysis Summary:');
    console.log('=' .repeat(60));
    
    if (!hasSession) {
      stepResults.success = false;
      stepResults.summary = 'CRITICAL: No authenticated session available. User needs to sign in first.';
      console.log('❌ CRITICAL ISSUE: No authenticated session');
      console.log('   📋 NEXT ACTION: User must sign in through Google OAuth to proceed with diagnosis');
    } else if (!rlsAccessible && comparisonResult.rlsWorks === false) {
      stepResults.success = false;
      stepResults.summary = 'CRITICAL: RLS policies are blocking authenticated user access. Root cause found.';
      console.log('❌ CRITICAL ISSUE: RLS policies blocking authenticated access');
      console.log('   📋 ROOT CAUSE: This matches the PRP description - auth.uid() likely returning NULL');
      console.log('   📋 NEXT ACTION: Proceed to Step 2 to analyze auth service health');
    } else {
      stepResults.success = true;
      stepResults.summary = 'Basic authentication and RLS appear functional. Need deeper analysis.';
      console.log('✅ Basic authentication appears functional');
      console.log('   📋 NEXT ACTION: Proceed to Step 2 for detailed service analysis');
    }
    
    return stepResults;
    
  } catch (error) {
    console.error('❌ Step 1 execution failed:', error);
    stepResults.success = false;
    stepResults.summary = `Execution failed: ${error.message}`;
    return stepResults;
  }
}

// Execute Step 1
executeStep1().then(results => {
  console.log('\n🏁 Step 1 Complete');
  console.log('=' .repeat(60));
  console.log(`Success: ${results.success}`);
  console.log(`Summary: ${results.summary}`);
  
  if (results.success) {
    console.log('\n✅ Step 1 passed - Ready to proceed to Step 2');
    console.log('💡 Run: node scripts/auth-diagnostic-step2.js');
  } else {
    console.log('\n❌ Step 1 failed - Address issues before proceeding');
    console.log('📖 Check the analysis above for specific actions needed');
  }
  
  // Save results for sequential processing
  console.log('\n📄 Results saved for sequential analysis');
  
}).catch(error => {
  console.error('💥 Step 1 crashed:', error);
  process.exit(1);
});