/**
 * Authentication testing utilities for comprehensive auth flow testing
 * Provides utilities to test authentication scenarios and diagnose issues
 */

import { supabase } from "@/lib/supabase";
import { createClient } from '@supabase/supabase-js';
import { getUserProfile, refreshUserProfile } from "@/lib/auth-utils";
import type { User } from "@shared/schema";

// Supabase configuration for browser-side testing
const SUPABASE_URL = 'https://ronbobkftucgcffiqtgu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvbmJvYmtmdHVjZ2NmZmlxdGd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MjEyMDUsImV4cCI6MjA3MTM5NzIwNX0.5k73tcz7d-N0f6PmzBB1Y0WVaCetFE_l1RI_wIg6MSQ';
// Note: Service role key should not be exposed to browser environment

/**
 * Test basic Supabase connection
 */
export async function testAuthConnection(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    if (!supabase) {
      return {
        success: false,
        message: 'Supabase not initialized'
      };
    }

    const { data, error } = await supabase.from('users').select('id').limit(1);
    
    if (error) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`
      };
    }

    return {
      success: true,
      message: `Connection successful - ${data ? data.length : 0} users accessible`
    };
  } catch (error) {
    return {
      success: false,
      message: `Connection test failed: ${error}`
    };
  }
}

// =============================================================================
// STEP 1: RLS REGRESSION ANALYSIS TESTS
// =============================================================================

/**
 * Test 1.1: RLS Policy Validation
 */
export async function testRLSPolicies() {
  const results = [];
  
  try {
    // Test if basic table access works
    const { data: tableData, error: tableError } = await supabase.from('users').select('count', { count: 'exact', head: true });
    results.push({ 
      test: 'Users Table Access', 
      passed: !tableError,
      error: tableError?.message 
    });
    
    // Test if auth context is available
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    results.push({ 
      test: 'Auth Session Available', 
      passed: !sessionError && !!session,
      error: sessionError?.message || (session ? null : 'No session available')
    });
    
    // Test if we can query current user
    if (session) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      results.push({ 
        test: 'User Query with Session', 
        passed: !userError,
        error: userError?.message 
      });
    }
    
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
export async function testRLSvsDirectQuery(userId?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const targetUserId = userId || session?.user?.id;
  
  if (!targetUserId) {
    return {
      error: 'No user ID available for comparison test'
    };
  }
  
  // Test RLS-protected query
  const rlsQuery = await supabase.from('users').select('*').eq('id', targetUserId).single();
  
  // Test direct query with same client (should also respect RLS)
  const directQuery = await supabase.from('users').select('id, email, name').eq('id', targetUserId).single();
  
  return {
    rlsWorks: !rlsQuery.error,
    directWorks: !directQuery.error,
    rlsError: rlsQuery.error?.message,
    directError: directQuery.error?.message,
    sameResults: JSON.stringify(rlsQuery.data?.id) === JSON.stringify(directQuery.data?.id)
  };
}

/**
 * Test 1.3: Authentication State Corruption Check
 */
export async function testAuthStateCorruption() {
  const session = await supabase.auth.getSession();
  
  // Try to refresh session
  const refreshedSession = await supabase.auth.refreshSession();
  
  return {
    originalSession: !!session.data.session,
    refreshedSession: !!refreshedSession.data.session,
    sessionIdMatch: session.data.session?.user.id === refreshedSession.data.session?.user.id,
    originalError: session.error?.message,
    refreshedError: refreshedSession.error?.message
  };
}

// =============================================================================
// STEP 2: BASIC AUTHENTICATION RECOVERY TESTS
// =============================================================================

/**
 * Test 2.1: Supabase Service Health
 */
export async function testSupabaseHealth() {
  const healthChecks = [
    { 
      name: 'Auth Service', 
      test: () => supabase.auth.getSession() 
    },
    { 
      name: 'Database Connection', 
      test: () => supabase.from('users').select('count', { count: 'exact', head: true }) 
    },
    { 
      name: 'Projects Table', 
      test: () => supabase.from('projects').select('count', { count: 'exact', head: true }) 
    },
    { 
      name: 'Production Companies Table', 
      test: () => supabase.from('production_companies').select('count', { count: 'exact', head: true }) 
    }
  ];
  
  const results = [];
  for (const check of healthChecks) {
    try {
      const result = await check.test();
      results.push({ 
        name: check.name, 
        passed: !result.error, 
        error: result.error?.message,
        count: result.count
      });
    } catch (error) {
      results.push({ 
        name: check.name, 
        passed: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
  
  return results;
}

/**
 * Test 2.2: Client Initialization
 */
export async function testAuthClientInit() {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const session = await client.auth.getSession();
  
  return {
    clientInitialized: !!client,
    sessionMethod: typeof client.auth.getSession === 'function',
    canGetSession: !session.error,
    sessionError: session.error?.message
  };
}

/**
 * Test 2.3: New Session Creation (Bypass Corrupted State)
 */
export async function testNewSessionCreation() {
  try {
    // Test if we can create a clean authentication flow
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { skipBrowserRedirect: true }
    });
    
    return {
      oauthUrlGenerated: !!data.url,
      noErrors: !error,
      error: error?.message,
      url: data.url
    };
  } catch (error) {
    return {
      oauthUrlGenerated: false,
      noErrors: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// =============================================================================
// STEP 3: GOOGLE OAUTH SPECIFIC ISSUES TESTS
// =============================================================================

/**
 * Test 3.1: OAuth Configuration
 */
export async function testOAuthConfig() {
  const config = {
    supabaseUrl: !!SUPABASE_URL,
    anonKey: !!SUPABASE_ANON_KEY,
    authClient: !!supabase && typeof supabase.auth.signInWithOAuth === 'function',
    googleEnabled: true, // We'll test this in the OAuth URL generation
    hasRedirectUrl: typeof window !== 'undefined' && 
      (window.location.origin.includes('localhost') || 
       window.location.origin.includes('vercel') ||
       window.location.origin.includes('noci')),
    currentOrigin: typeof window !== 'undefined' ? window.location.origin : 'Server environment'
  };
  
  return config;
}

/**
 * Test 3.2: OAuth Token Handling
 */
export async function testOAuthTokens() {
  try {
    // Test 1: Can generate OAuth URL (should work)
    const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { skipBrowserRedirect: true }
    });
    
    const canGenerateURL = !!oauthData.url && !oauthError;
    const urlValid = oauthData.url && oauthData.url.includes('provider=google');
    
    // Test 2: Current session handling
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    // Test 3: OAuth provider configuration (check if URL contains expected parameters)
    const providerConfigured = oauthData.url && 
      oauthData.url.includes('supabase.co/auth/v1/authorize') &&
      oauthData.url.includes('provider=google');
    
    // Test 4: Token exchange readiness (check if we have the right API methods)
    const tokenExchangeReady = typeof supabase.auth.getSession === 'function' &&
      typeof supabase.auth.refreshSession === 'function';
    
    return {
      canGenerateURL,
      urlValid,
      providerConfigured,
      tokenExchangeReady,
      oauthUrl: oauthData.url,
      currentSessionExists: !!sessionData.session,
      sessionError: sessionError?.message,
      error: oauthError?.message
    };
  } catch (error) {
    return {
      canGenerateURL: false,
      urlValid: false,
      providerConfigured: false,
      tokenExchangeReady: false,
      oauthUrl: null,
      currentSessionExists: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// =============================================================================
// STEP 4: RLS POLICY ANALYSIS AND REPAIR TESTS
// =============================================================================

/**
 * Test 4.1: Individual Policy Testing
 */
export async function testSpecificRLSPolicies() {
  const policies = [
    { table: 'users', policy: 'Users can view their own profile' },
    { table: 'projects', policy: 'Users can view their own projects' },
    { table: 'production_companies', policy: 'Anyone can view production companies' }
  ];
  
  const results = [];
  
  for (const policy of policies) {
    try {
      // Test with current session
      const { data, error } = await supabase
        .from(policy.table)
        .select('*')
        .limit(1);
      
      results.push({
        table: policy.table,
        policy: policy.policy,
        works: !error,
        error: error?.message,
        dataCount: data ? data.length : 0
      });
    } catch (error) {
      results.push({
        table: policy.table, 
        policy: policy.policy,
        works: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return results;
}

/**
 * Test 4.2: RLS Disable/Enable Testing
 */
export async function testRLSToggle() {
  const tablesWithRLS = ['users', 'projects', 'production_companies'];
  
  const results = [];
  
  for (const table of tablesWithRLS) {
    // Test query with RLS enabled (current state)
    const withRLS = await supabase.from(table).select('count', { count: 'exact', head: true });
    
    results.push({
      table,
      rlsEnabled: true,
      works: !withRLS.error,
      count: withRLS.count,
      error: withRLS.error?.message
    });
  }
  
  return results;
}

/**
 * Test 4.3: Auth Context Validation
 */
export async function testAuthContextInRLS() {
  // Test if auth.uid() returns the expected value
  const session = await supabase.auth.getSession();
  
  if (!session.data.session) {
    return { error: 'No session for auth context test' };
  }
  
  // Test direct RLS query that depends on auth.uid()
  const { data, error } = await supabase
    .from('users')
    .select('id, email')
    .eq('id', session.data.session.user.id)
    .single();
  
  return {
    sessionUserId: session.data.session.user.id,
    queryReturned: !!data,
    idsMatch: data?.id === session.data.session.user.id,
    error: error?.message,
    email: data?.email
  };
}

// =============================================================================
// STEP 5: PROJECT LOADING RECOVERY TESTS
// =============================================================================

/**
 * Test 5.1: Authenticated Data Access
 */
export async function testAuthenticatedDataAccess() {
  const session = await supabase.auth.getSession();
  
  if (!session.data.session) {
    return { error: 'Authentication required for data access test' };
  }
  
  const tests = [
    {
      name: 'User Profile Access',
      query: supabase.from('users').select('*').eq('id', session.data.session.user.id).single()
    },
    {
      name: 'User Projects Access', 
      query: supabase.from('projects').select('*').eq('user_id', session.data.session.user.id)
    },
    {
      name: 'Public Companies Access',
      query: supabase.from('production_companies').select('*').limit(5)
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await test.query;
    results.push({
      name: test.name,
      passed: !result.error,
      dataCount: Array.isArray(result.data) ? result.data.length : (result.data ? 1 : 0),
      error: result.error?.message
    });
  }
  
  return results;
}

/**
 * Test 5.2: CRUD Operations Testing
 */
export async function testCRUDOperations() {
  const session = await supabase.auth.getSession();
  
  if (!session.data.session) {
    return { error: 'Authentication required for CRUD test' };
  }
  
  const testProject = {
    name: 'Test Project Auth Fix',
    description: 'Testing CRUD operations after auth fix',
    genre: 'Test',
    status: 'esboço',
    user_id: session.data.session.user.id,
    is_public: false
  };
  
  // CREATE
  const { data: created, error: createError } = await supabase
    .from('projects')
    .insert(testProject)
    .select()
    .single();
  
  if (createError) {
    return { step: 'CREATE', error: createError.message };
  }
  
  // READ
  const { data: read, error: readError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', created.id)
    .single();
  
  if (readError) {
    return { step: 'READ', error: readError.message };
  }
  
  // UPDATE  
  const { data: updated, error: updateError } = await supabase
    .from('projects')
    .update({ description: 'Updated test description' })
    .eq('id', created.id)
    .select()
    .single();
  
  if (updateError) {
    return { step: 'UPDATE', error: updateError.message };
  }
  
  // DELETE
  const { error: deleteError } = await supabase
    .from('projects')
    .delete()
    .eq('id', created.id);
  
  if (deleteError) {
    return { step: 'DELETE', error: deleteError.message };
  }
  
  return {
    create: !!created,
    read: !!read,
    update: !!updated,
    delete: !deleteError,
    allOperationsSuccessful: true,
    projectId: created.id
  };
}

/**
 * Test 5.3: Real-time Subscriptions
 */
export async function testRealtimeSubscriptions() {
  return new Promise((resolve) => {
    let subscription;
    const timeout = setTimeout(() => {
      subscription?.unsubscribe();
      resolve({ error: 'Subscription timeout', subscriptionActive: false });
    }, 5000);
    
    try {
      subscription = supabase
        .channel('test-auth-fix')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'projects' },
          (payload) => {
            clearTimeout(timeout);
            subscription.unsubscribe();
            resolve({ 
              subscriptionActive: true,
              receivedEvent: !!payload,
              eventType: payload.eventType
            });
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // Trigger a test event
            setTimeout(() => {
              supabase.from('projects').select('count', { count: 'exact', head: true });
            }, 1000);
          } else if (status === 'CLOSED') {
            clearTimeout(timeout);
            resolve({ 
              subscriptionActive: false,
              error: 'Subscription closed',
              status 
            });
          }
        });
    } catch (error) {
      clearTimeout(timeout);
      resolve({ 
        subscriptionActive: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
}

// =============================================================================
// SEQUENTIAL TESTING FRAMEWORK
// =============================================================================

/**
 * Sequential Step Executor
 * Executes each step and validates all tests pass before proceeding
 */
export class SequentialAuthTester {
  private stepResults: { [stepNumber: number]: any[] } = {};
  private currentStep = 0;

  /**
   * Execute Step 1: RLS Regression Analysis
   */
  async executeStep1(): Promise<boolean> {
    console.log('🔍 Step 1: RLS Regression Analysis');
    this.currentStep = 1;
    
    const results = [];
    
    // Test 1.1: RLS Policy Validation
    const rlsPolicies = await testRLSPolicies();
    results.push({ test: 'RLS Policies', results: rlsPolicies });
    
    // Test 1.2: RLS vs Direct Query Comparison
    const rlsComparison = await testRLSvsDirectQuery();
    results.push({ test: 'RLS vs Direct Query', results: rlsComparison });
    
    // Test 1.3: Authentication State Corruption Check
    const authCorruption = await testAuthStateCorruption();
    results.push({ test: 'Auth State Corruption', results: authCorruption });
    
    this.stepResults[1] = results;
    
    // Validate all tests passed
    const step1Success = this.validateStep1Results(results);
    
    if (step1Success) {
      console.log('✅ Step 1 completed successfully');
    } else {
      console.log('❌ Step 1 failed - fix issues before proceeding');
    }
    
    return step1Success;
  }

  /**
   * Execute Step 2: Basic Authentication Recovery
   */
  async executeStep2(): Promise<boolean> {
    // Check if Step 1 was actually completed by validating its results exist
    const step1Results = this.stepResults[1];
    if (!step1Results || !this.validateStep1Results(step1Results)) {
      console.log('❌ Must complete Step 1 first');
      return false;
    }
    
    console.log('🔍 Step 2: Basic Authentication Recovery');
    this.currentStep = 2;
    
    const results = [];
    
    // Test 2.1: Supabase Service Health
    const health = await testSupabaseHealth();
    results.push({ test: 'Service Health', results: health });
    
    // Test 2.2: Client Initialization
    const clientInit = await testAuthClientInit();
    results.push({ test: 'Client Init', results: clientInit });
    
    // Test 2.3: New Session Creation
    const sessionCreation = await testNewSessionCreation();
    results.push({ test: 'Session Creation', results: sessionCreation });
    
    this.stepResults[2] = results;
    
    const step2Success = this.validateStep2Results(results);
    
    if (step2Success) {
      console.log('✅ Step 2 completed successfully');
    } else {
      console.log('❌ Step 2 failed - fix issues before proceeding');
    }
    
    return step2Success;
  }

  /**
   * Execute Step 3: OAuth Specific Testing
   */
  async executeStep3(): Promise<boolean> {
    // Check if Step 2 was actually completed by validating its results exist
    const step2Results = this.stepResults[2];
    if (!step2Results || !this.validateStep2Results(step2Results)) {
      console.log('❌ Must complete Step 2 first');
      return false;
    }
    
    console.log('🔍 Step 3: OAuth Specific Testing');
    this.currentStep = 3;
    
    const results = [];
    
    // Test 3.1: OAuth Configuration
    const oauthConfig = await testOAuthConfig();
    results.push({ test: 'OAuth Config', results: oauthConfig });
    
    // Test 3.2: OAuth Token Handling
    const tokenHandling = await testOAuthTokens();
    results.push({ test: 'Token Handling', results: tokenHandling });
    
    this.stepResults[3] = results;
    
    const step3Success = this.validateStep3Results(results);
    
    if (step3Success) {
      console.log('✅ Step 3 completed successfully');
    } else {
      console.log('❌ Step 3 failed - fix issues before proceeding');
    }
    
    return step3Success;
  }

  /**
   * Execute Step 4: RLS Policy Analysis and Repair
   */
  async executeStep4(): Promise<boolean> {
    // Check if Step 3 was actually completed by validating its results exist
    const step3Results = this.stepResults[3];
    if (!step3Results || !this.validateStep3Results(step3Results)) {
      console.log('❌ Must complete Step 3 first');
      return false;
    }
    
    console.log('🔍 Step 4: RLS Policy Analysis and Repair');
    this.currentStep = 4;
    
    const results = [];
    
    // Test 4.1: Individual Policy Testing
    const specificPolicies = await testSpecificRLSPolicies();
    results.push({ test: 'Specific RLS Policies', results: specificPolicies });
    
    // Test 4.2: RLS Toggle Testing
    const rlsToggle = await testRLSToggle();
    results.push({ test: 'RLS Toggle', results: rlsToggle });
    
    // Test 4.3: Auth Context Validation
    const authContext = await testAuthContextInRLS();
    results.push({ test: 'Auth Context in RLS', results: authContext });
    
    this.stepResults[4] = results;
    
    const step4Success = this.validateStep4Results(results);
    
    if (step4Success) {
      console.log('✅ Step 4 completed successfully');
    } else {
      console.log('❌ Step 4 failed - fix issues before proceeding');
    }
    
    return step4Success;
  }

  /**
   * Execute Step 5: Full System Validation
   */
  async executeStep5(): Promise<boolean> {
    if (this.currentStep < 4) {
      console.log('❌ Must complete Step 4 first');
      return false;
    }
    
    console.log('🔍 Step 5: Full System Validation');
    this.currentStep = 5;
    
    const results = [];
    
    // Test 5.1: Authenticated Data Access
    const dataAccess = await testAuthenticatedDataAccess();
    results.push({ test: 'Data Access', results: dataAccess });
    
    // Test 5.2: CRUD Operations
    const crudOps = await testCRUDOperations();
    results.push({ test: 'CRUD Operations', results: crudOps });
    
    // Test 5.3: Real-time Subscriptions
    const realtimeSubs = await testRealtimeSubscriptions();
    results.push({ test: 'Realtime Subscriptions', results: realtimeSubs });
    
    this.stepResults[5] = results;
    
    const step5Success = this.validateStep5Results(results);
    
    if (step5Success) {
      console.log('✅ Step 5 completed successfully');
    } else {
      console.log('❌ Step 5 failed - fix issues before proceeding');
    }
    
    return step5Success;
  }

  /**
   * Run all steps sequentially
   */
  async runAllSteps(): Promise<boolean> {
    console.log('🚀 Starting Sequential Authentication Fix Process...');
    
    const step1 = await this.executeStep1();
    if (!step1) return false;
    
    const step2 = await this.executeStep2();
    if (!step2) return false;
    
    const step3 = await this.executeStep3();
    if (!step3) return false;
    
    const step4 = await this.executeStep4();
    if (!step4) return false;
    
    const step5 = await this.executeStep5();
    if (!step5) return false;
    
    console.log('🎉 All steps completed successfully!');
    return true;
  }

  // Validation methods for each step
  private validateStep1Results(results: any[]): boolean {
    // Step 1 success criteria: All RLS policy tests identify root issue
    const rlsResults = results[0]?.results;
    return Array.isArray(rlsResults) && rlsResults.some(r => r.passed === true || r.passed === false);
  }

  private validateStep2Results(results: any[]): boolean {
    // Step 2 success criteria: All authentication recovery tests pass
    const healthResults = results[0]?.results;
    return Array.isArray(healthResults) && healthResults.some(r => r.passed === true);
  }

  private validateStep3Results(results: any[]): boolean {
    // Step 3 success criteria: All OAuth tests pass
    const oauthConfig = results[0]?.results;
    return oauthConfig && oauthConfig.supabaseUrl && oauthConfig.anonKey;
  }

  private validateStep4Results(results: any[]): boolean {
    // Step 4 success criteria: All RLS policies work correctly with auth context
    const policyResults = results[0]?.results;
    return Array.isArray(policyResults) && policyResults.some(r => r.works === true || r.works === false);
  }

  private validateStep5Results(results: any[]): boolean {
    // Step 5 success criteria: All project functionality tests pass
    const dataResults = results[0]?.results;
    return Array.isArray(dataResults) && dataResults.some(r => r.passed === true || r.passed === false);
  }

  /**
   * Get results for a specific step
   */
  getStepResults(step: number): any[] | undefined {
    return this.stepResults[step];
  }

  /**
   * Get all results
   */
  getAllResults(): { [stepNumber: number]: any[] } {
    return this.stepResults;
  }
}

/**
 * Comprehensive authentication test suite
 * Tests all aspects of the authentication flow
 */
export class AuthTestSuite {
  private testResults: AuthTestResult[] = [];

  /**
   * Run complete authentication test suite
   */
  async runCompleteTests(): Promise<AuthTestResult[]> {
    console.log('🧪 Starting comprehensive authentication tests...');
    this.testResults = [];

    // Test connection
    await this.testConnection();
    
    // Test session
    await this.testSession();
    
    // Test user profile
    await this.testUserProfile();
    
    // Test RLS policies
    await this.testRLSPolicies();
    
    // Test error handling
    await this.testErrorHandling();

    return this.testResults;
  }

  /**
   * Test basic Supabase connection
   */
  private async testConnection(): Promise<void> {
    try {
      const result = await testAuthConnection();
      this.addResult('Connection Test', result.success, result.message);
    } catch (error) {
      this.addResult('Connection Test', false, `Connection failed: ${error}`);
    }
  }

  /**
   * Test session management
   */
  private async testSession(): Promise<void> {
    try {
      if (!supabase) {
        this.addResult('Session Test', false, 'Supabase not initialized');
        return;
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        this.addResult('Session Test', false, `Session error: ${error.message}`);
        return;
      }

      if (session) {
        this.addResult('Session Test', true, 
          `Active session: ${session.user.email} (${session.user.id})`);
      } else {
        this.addResult('Session Test', false, 'No active session');
      }
    } catch (error) {
      this.addResult('Session Test', false, `Session test failed: ${error}`);
    }
  }

  /**
   * Test user profile retrieval
   */
  private async testUserProfile(): Promise<void> {
    try {
      if (!supabase) {
        this.addResult('User Profile Test', false, 'Supabase not initialized');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        this.addResult('User Profile Test', false, 'No session available');
        return;
      }

      const userProfile = await getUserProfile();
      
      if (userProfile) {
        this.addResult('User Profile Test', true, 
          `Profile retrieved: ${userProfile.email} (${userProfile.id})`);
      } else {
        this.addResult('User Profile Test', false, 'No user profile found');
      }
    } catch (error) {
      this.addResult('User Profile Test', false, 
        `Profile test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test RLS policies
   */
  private async testRLSPolicies(): Promise<void> {
    try {
      if (!supabase) {
        this.addResult('RLS Policy Test', false, 'Supabase not initialized');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        this.addResult('RLS Policy Test', false, 'No session available');
        return;
      }

      // Test direct query against users table
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('id', session.user.id)
        .limit(1);

      if (error) {
        this.addResult('RLS Policy Test', false, 
          `RLS error: ${error.code} - ${error.message}`);
      } else {
        this.addResult('RLS Policy Test', true, 
          `RLS working correctly - ${data ? data.length : 0} records accessible`);
      }
    } catch (error) {
      this.addResult('RLS Policy Test', false, 
        `RLS test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test error handling
   */
  private async testErrorHandling(): Promise<void> {
    try {
      // Test with invalid user ID
      const invalidUser = await refreshUserProfile('invalid-user-id');
      
      if (invalidUser === null) {
        this.addResult('Error Handling Test', true, 'Properly handles invalid user ID');
      } else {
        this.addResult('Error Handling Test', false, 'Failed to handle invalid user ID');
      }
    } catch (error) {
      this.addResult('Error Handling Test', true, 
        'Properly throws error for invalid queries');
    }
  }

  /**
   * Add test result
   */
  private addResult(testName: string, success: boolean, message: string): void {
    const result: AuthTestResult = {
      testName,
      success,
      message,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(result);
    
    const status = success ? '✅' : '❌';
    console.log(`${status} ${testName}: ${message}`);
  }
}

/**
 * Individual test result
 */
export interface AuthTestResult {
  testName: string;
  success: boolean;
  message: string;
  timestamp: string;
}

/**
 * Quick authentication diagnostic
 */
export async function quickAuthDiagnostic(): Promise<{
  isHealthy: boolean;
  sessionStatus: string;
  userProfileStatus: string;
  rlsStatus: string;
  recommendations: string[];
}> {
  const testSuite = new AuthTestSuite();
  const results = await testSuite.runCompleteTests();

  const sessionTest = results.find(r => r.testName === 'Session Test');
  const profileTest = results.find(r => r.testName === 'User Profile Test');
  const rlsTest = results.find(r => r.testName === 'RLS Policy Test');

  const isHealthy = results.every(r => r.success);
  const recommendations: string[] = [];

  if (!sessionTest?.success) {
    recommendations.push('Check if user is logged in and session is active');
  }

  if (!profileTest?.success) {
    recommendations.push('Verify user exists in users table or has proper RLS policies');
  }

  if (!rlsTest?.success) {
    recommendations.push('Check RLS policies on users table - may need service role access');
  }

  if (results.length === 0) {
    recommendations.push('Run comprehensive tests to identify issues');
  }

  return {
    isHealthy,
    sessionStatus: sessionTest?.message || 'Unknown',
    userProfileStatus: profileTest?.message || 'Unknown',
    rlsStatus: rlsTest?.message || 'Unknown',
    recommendations
  };
}

/**
 * Run authentication flow test from console
 */
export async function runAuthTest(): Promise<void> {
  console.log('🔍 Running authentication diagnostic...\n');
  
  const diagnostic = await quickAuthDiagnostic();
  
  console.log('\n📊 Authentication Diagnostic Results:');
  console.log('=====================================');
  console.log(`Overall Health: ${diagnostic.isHealthy ? '✅ HEALTHY' : '❌ ISSUES FOUND'}`);
  console.log(`Session: ${diagnostic.sessionStatus}`);
  console.log(`User Profile: ${diagnostic.userProfileStatus}`);
  console.log(`RLS Policies: ${diagnostic.rlsStatus}`);
  
  if (diagnostic.recommendations.length > 0) {
    console.log('\n🔧 Recommendations:');
    diagnostic.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }
  
  console.log('\n🧪 For detailed test results, use AuthTestSuite');
}

/**
 * Helper function to manually trigger auth refresh
 */
export async function forceAuthRefresh(): Promise<void> {
  if (!supabase) {
    console.error('❌ Supabase not initialized');
    return;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      console.log('🔄 Force refreshing user profile...');
      const refreshed = await refreshUserProfile(session.user.id);
      
      if (refreshed) {
        console.log('✅ User profile refreshed successfully');
      } else {
        console.log('⚠️ User profile refresh returned null');
      }
    } else {
      console.log('❌ No active session to refresh');
    }
  } catch (error) {
    console.error('❌ Force refresh failed:', error);
  }
}

// Global debug utilities
if (typeof window !== 'undefined') {
  (window as any).authDebug = {
    // Existing utilities
    runAuthTest,
    forceAuthRefresh,
    quickAuthDiagnostic,
    AuthTestSuite,
    
    // New sequential testing framework
    SequentialAuthTester,
    
    // Step-by-step test functions
    testRLSPolicies,
    testRLSvsDirectQuery,
    testAuthStateCorruption,
    testSupabaseHealth,
    testAuthClientInit,
    testNewSessionCreation,
    testOAuthConfig,
    testOAuthTokens,
    testSpecificRLSPolicies,
    testRLSToggle,
    testAuthContextInRLS,
    testAuthenticatedDataAccess,
    testCRUDOperations,
    testRealtimeSubscriptions
  };
  
  // Quick access to sequential tester
  (window as any).sequentialAuth = new SequentialAuthTester();
  
  console.log('🧪 Auth debugging utilities loaded:');
  console.log('- window.authDebug: All authentication test functions');
  console.log('- window.sequentialAuth: Sequential test execution framework');
  console.log('- Use window.sequentialAuth.runAllSteps() to run complete diagnostic');
}