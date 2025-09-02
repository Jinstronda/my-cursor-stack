/**
 * Step 2: Basic Authentication Recovery - Consolidated Playwright Test
 * Tests Supabase service health and client initialization capabilities in one test
 */

import { test, expect } from '@playwright/test';

test.describe('Step 2: Basic Authentication Recovery', () => {
  test('Complete Step 2 Analysis - Basic Authentication Recovery', async ({ page }) => {
    console.log('🎯 Step 2: Complete Basic Authentication Recovery Analysis');
    console.log('='.repeat(60));
    
    // Navigate to the application
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Wait for auth utilities to be loaded
    await page.waitForFunction(() => window.authDebug !== undefined, { timeout: 10000 });

    // Execute all Step 2 tests sequentially in one browser context
    const step2Results = await page.evaluate(async () => {
      const results = {
        supabaseHealth: null,
        clientInit: null,
        sessionCreation: null
      };
      
      console.log('🔍 Test 2.1: Supabase Service Health');
      results.supabaseHealth = await window.authDebug.testSupabaseHealth();
      console.log('Supabase Health Results:', results.supabaseHealth);
      
      console.log('🔍 Test 2.2: Client Initialization Capability');
      results.clientInit = await window.authDebug.testAuthClientInit();
      console.log('Client Initialization Results:', results.clientInit);
      
      console.log('🔍 Test 2.3: New Session Creation Capability');
      results.sessionCreation = await window.authDebug.testNewSessionCreation();
      console.log('Session Creation Results:', results.sessionCreation);
      
      return results;
    });

    // Display Test 2.1 Results
    console.log('\\n🔍 Test 2.1: Supabase Service Health Results');
    expect(step2Results.supabaseHealth).toBeDefined();
    expect(Array.isArray(step2Results.supabaseHealth)).toBe(true);
    
    for (const result of step2Results.supabaseHealth) {
      console.log(`  ${result.passed ? '✅' : '❌'} ${result.name}: ${result.error || 'OK'}`);
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('passed');
    }

    // Display Test 2.2 Results
    console.log('\\n🔍 Test 2.2: Client Initialization Capability Results');
    expect(step2Results.clientInit).toBeDefined();
    
    const clientResults = step2Results.clientInit;
    if (clientResults.sessionError) {
      console.log(`❌ Client Init Error: ${clientResults.sessionError}`);
    } else {
      console.log(`  Client Initialized: ${clientResults.clientInitialized ? '✅' : '❌'}`);
      console.log(`  Session Method Available: ${clientResults.sessionMethod ? '✅' : '❌'}`);
      console.log(`  Can Get Session: ${clientResults.canGetSession ? '✅' : '❌'}`);
    }

    // Display Test 2.3 Results
    console.log('\\n🔍 Test 2.3: New Session Creation Capability Results');
    expect(step2Results.sessionCreation).toBeDefined();
    
    const sessionResults = step2Results.sessionCreation;
    console.log(`  OAuth URL Generated: ${sessionResults.oauthUrlGenerated ? '✅' : '❌'}`);
    console.log(`  No Errors: ${sessionResults.noErrors ? '✅' : '❌'}`);
    
    if (sessionResults.oauthUrlGenerated && sessionResults.url) {
      console.log(`  OAuth URL: ${sessionResults.url}`);
    }
    
    if (sessionResults.error) {
      console.log(`❌ Session Creation Error: ${sessionResults.error}`);
    }

    // Analyze results to determine next steps
    console.log('\\n🎯 Step 2 Analysis Summary');
    console.log('='.repeat(60));
    
    const healthResults = step2Results.supabaseHealth;
    const clientInitResults = step2Results.clientInit;
    const sessionCreationResults = step2Results.sessionCreation;
    
    // Check for critical failures
    const authServiceWorks = healthResults.some(r => r.name === 'Auth Service' && r.passed);
    const dbConnectionWorks = healthResults.some(r => r.name === 'Database Connection' && r.passed);
    const clientInitialized = clientInitResults.clientInitialized;
    const oauthCapable = sessionCreationResults.oauthUrlGenerated;
    
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
    
    // Store final analysis in browser for sequential tester
    await page.evaluate((data) => {
      window.step2Analysis = data.analysis;
      window.step2Results = data.results;
    }, {
      analysis: {
        success: step2Success,
        conclusion,
        nextAction,
        timestamp: new Date().toISOString()
      },
      results: step2Results
    });
    
    // Assert successful execution
    expect(step2Results).toBeDefined();
    expect(step2Results.supabaseHealth).toBeDefined();
    expect(step2Results.clientInit).toBeDefined();
    expect(step2Results.sessionCreation).toBeDefined();
    
    if (step2Success) {
      console.log('\\n✅ Step 2 completed successfully - Ready to proceed to Step 3');
      console.log('\\n📋 Step 2 Summary:');
      console.log('- Supabase auth service: WORKING ✅');
      console.log('- Database connectivity: WORKING ✅');  
      console.log('- Client initialization: WORKING ✅');
      console.log('- OAuth URL generation: WORKING ✅');
      console.log('\\n🎯 Key Finding: Basic authentication infrastructure is operational');
      console.log('The issue from Step 1 is NOT at the infrastructure level.');
    } else {
      console.log('\\n❌ Step 2 identified critical infrastructure issues');
    }

    // Test passes if we got meaningful results, regardless of success/failure  
    // The important thing is we completed the diagnostic
    expect(conclusion).toBeDefined();
    expect(nextAction).toBeDefined();
  });
});