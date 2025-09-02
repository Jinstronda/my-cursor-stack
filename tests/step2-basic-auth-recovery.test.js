/**
 * Step 2: Basic Authentication Recovery - Playwright Test
 * Tests Supabase service health and client initialization capabilities
 */

import { test, expect } from '@playwright/test';

test.describe('Step 2: Basic Authentication Recovery', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Wait for auth utilities to be loaded
    await page.waitForFunction(() => window.authDebug !== undefined, { timeout: 10000 });
  });

  test('Test 2.1: Supabase Service Health', async ({ page }) => {
    console.log('🔍 Test 2.1: Supabase Service Health');
    
    // Execute Supabase health check
    const results = await page.evaluate(async () => {
      return await window.authDebug.testSupabaseHealth();
    });
    
    console.log('Supabase Health Results:', results);
    
    // Validate results structure
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    
    // Check each health test result
    for (const result of results) {
      console.log(`  ${result.passed ? '✅' : '❌'} ${result.name}: ${result.error || 'OK'}`);
      
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('passed');
      
      if (result.name === 'Auth Service') {
        if (!result.passed) {
          console.log('🚨 CRITICAL: Cannot connect to Supabase auth service');
        }
      }
      
      if (result.name === 'Database Connection') {
        if (!result.passed) {
          console.log('🚨 CRITICAL: Database connection not working');
        }
      }
    }
    
    // Store results for Step 2 analysis
    await page.evaluate((results) => {
      if (typeof window.step2Results === 'undefined') {
        window.step2Results = {};
      }
      window.step2Results.supabaseHealth = results;
      console.log('Stored supabaseHealth results:', window.step2Results.supabaseHealth);
    }, results);
  });

  test('Test 2.2: Client Initialization Capability', async ({ page }) => {
    console.log('🔍 Test 2.2: Client Initialization Capability');
    
    // Execute client initialization test
    const results = await page.evaluate(async () => {
      return await window.authDebug.testAuthClientInit();
    });
    
    console.log('Client Initialization Results:', results);
    
    expect(results).toBeDefined();
    
    if (results.sessionError) {
      console.log(`❌ Client Init Error: ${results.sessionError}`);
    } else {
      console.log(`  Client Initialized: ${results.clientInitialized ? '✅' : '❌'}`);
      console.log(`  Session Method Available: ${results.sessionMethod ? '✅' : '❌'}`);
      console.log(`  Can Get Session: ${results.canGetSession ? '✅' : '❌'}`);
      
      if (!results.clientInitialized) {
        console.log('🚨 CRITICAL: Cannot create Supabase client - check configuration');
      }
    }
    
    // Store results
    await page.evaluate((results) => {
      if (typeof window.step2Results === 'undefined') {
        window.step2Results = {};
      }
      window.step2Results.clientInit = results;
      console.log('Stored clientInit results:', window.step2Results.clientInit);
    }, results);
  });

  test('Test 2.3: New Session Creation Capability', async ({ page }) => {
    console.log('🔍 Test 2.3: New Session Creation Capability');
    
    // Execute session creation test
    const results = await page.evaluate(async () => {
      return await window.authDebug.testNewSessionCreation();
    });
    
    console.log('Session Creation Results:', results);
    
    expect(results).toBeDefined();
    
    console.log(`  OAuth URL Generated: ${results.oauthUrlGenerated ? '✅' : '❌'}`);
    console.log(`  No Errors: ${results.noErrors ? '✅' : '❌'}`);
    
    if (results.oauthUrlGenerated) {
      console.log(`  OAuth URL: ${results.url}`);
    }
    
    if (results.error) {
      console.log(`❌ Session Creation Error: ${results.error}`);
    }
    
    // Store results
    await page.evaluate((results) => {
      if (typeof window.step2Results === 'undefined') {
        window.step2Results = {};
      }
      window.step2Results.sessionCreation = results;
      console.log('Stored sessionCreation results:', window.step2Results.sessionCreation);
    }, results);
  });

  test('Step 2 Analysis and Conclusion', async ({ page }) => {
    console.log('🎯 Step 2 Analysis Summary');
    console.log('='.repeat(60));
    
    // Retrieve all Step 2 results
    const allResults = await page.evaluate(() => {
      return window.step2Results || {};
    });
    
    console.log('All Step 2 Results:', JSON.stringify(allResults, null, 2));
    
    // Analyze results to determine next steps
    const healthResults = allResults.supabaseHealth || [];
    const clientResults = allResults.clientInit || {};
    const sessionResults = allResults.sessionCreation || {};
    
    // Check for critical failures
    const authServiceWorks = healthResults.some(r => r.name === 'Auth Service' && r.passed);
    const dbConnectionWorks = healthResults.some(r => r.name === 'Database Connection' && r.passed);
    const clientInitialized = clientResults.clientInitialized;
    const oauthCapable = sessionResults.oauthUrlGenerated;
    
    let conclusion = '';
    let step2Success = false;
    let nextAction = '';
    
    if (!authServiceWorks) {
      conclusion = 'CRITICAL: Cannot connect to Supabase auth service. Network or configuration issue.';
      nextAction = 'Check network connectivity and Supabase URL configuration';
      step2Success = false;
    } else if (!dbConnectionWorks) {
      conclusion = 'CRITICAL: Database connection failed. Check connection string.';
      nextAction = 'Verify DATABASE_URL and database connectivity';
      step2Success = false;
    } else if (!clientInitialized) {
      conclusion = 'CRITICAL: Cannot initialize Supabase client. Configuration error.';
      nextAction = 'Check client initialization code and environment variables';
      step2Success = false;
    } else if (!oauthCapable) {
      conclusion = 'CRITICAL: OAuth URL generation failed. Authentication setup broken.';
      nextAction = 'Check OAuth provider configuration and redirect URLs';
      step2Success = false;
    } else {
      conclusion = 'Basic authentication infrastructure is working. Client can be initialized.';
      nextAction = 'Proceed to Step 3: OAuth Specific Testing';
      step2Success = true;
    }
    
    console.log('\\n🏁 Step 2 Conclusion:');
    console.log('='.repeat(60));
    console.log(`Success: ${step2Success}`);
    console.log(`Conclusion: ${conclusion}`);
    console.log(`Next Action: ${nextAction}`);
    
    // Store final analysis
    await page.evaluate((analysis) => {
      window.step2Analysis = analysis;
    }, {
      success: step2Success,
      conclusion,
      nextAction,
      timestamp: new Date().toISOString()
    });
    
    // Assert that Step 2 provided meaningful results
    expect(allResults).toBeDefined();
    expect(allResults.supabaseHealth).toBeDefined();
    expect(allResults.clientInit).toBeDefined();
    expect(allResults.sessionCreation).toBeDefined();
    
    if (step2Success) {
      console.log('\\n✅ Step 2 completed successfully - Ready to proceed to Step 3');
    } else {
      console.log('\\n❌ Step 2 identified critical issues that must be fixed first');
    }
  });
});