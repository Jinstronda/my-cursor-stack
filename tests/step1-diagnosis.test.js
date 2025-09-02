/**
 * Step 1: RLS Regression Analysis - Playwright Test
 * Runs comprehensive authentication diagnostics using browser-based testing utilities
 */

import { test, expect } from '@playwright/test';

test.describe('Step 1: RLS Regression Analysis', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Wait for auth utilities to be loaded
    await page.waitForFunction(() => window.authDebug !== undefined, { timeout: 10000 });
  });

  test('Test 1.1: RLS Policy Validation', async ({ page }) => {
    console.log('🔍 Test 1.1: RLS Policy Validation');
    
    // Execute RLS policy tests using the browser utilities
    const results = await page.evaluate(async () => {
      return await window.authDebug.testRLSPolicies();
    });
    
    console.log('RLS Policy Results:', results);
    
    // Validate results structure
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    
    // Check each test result
    for (const result of results) {
      console.log(`  ${result.passed ? '✅' : '❌'} ${result.test}: ${result.error || 'OK'}`);
      
      expect(result).toHaveProperty('test');
      expect(result).toHaveProperty('passed');
      
      if (result.test === 'Users Table Access') {
        // This test tells us if RLS is blocking access
        if (!result.passed) {
          console.log('🚨 CRITICAL: Users table access blocked - likely RLS issue');
        }
      }
      
      if (result.test === 'Auth Session Available') {
        if (!result.passed) {
          console.log('🚨 CRITICAL: No authenticated session - user needs to sign in');
        }
      }
    }
    
    // Store results for Step 1 analysis
    await page.evaluate((results) => {
      window.step1Results = window.step1Results || {};
      window.step1Results.rlsPolicies = results;
    }, results);
  });

  test('Test 1.2: RLS vs Direct Query Comparison', async ({ page }) => {
    console.log('🔍 Test 1.2: RLS vs Direct Query Comparison');
    
    // Execute RLS comparison test
    const results = await page.evaluate(async () => {
      return await window.authDebug.testRLSvsDirectQuery();
    });
    
    console.log('RLS Comparison Results:', results);
    
    if (results.skipped || results.error) {
      console.log('⏭️ SKIPPED: No authenticated session available');
    } else {
      console.log(`  User ID: ${results.targetUserId}`);
      console.log(`  RLS Query: ${results.rlsWorks ? '✅ Works' : '❌ Failed'}`);
      console.log(`  Direct Query: ${results.directWorks ? '✅ Works' : '❌ Failed'}`);
      
      if (results.rlsError) {
        console.log(`  RLS Error: ${results.rlsError} (Code: ${results.rlsErrorCode})`);
      }
      if (results.directError) {
        console.log(`  Direct Error: ${results.directError} (Code: ${results.directErrorCode})`);
      }
      
      // Critical analysis
      if (!results.rlsWorks && !results.directWorks) {
        console.log('🚨 CRITICAL: Both RLS and direct queries failing - major RLS issue');
      }
    }
    
    // Store results
    await page.evaluate((results) => {
      window.step1Results = window.step1Results || {};
      window.step1Results.rlsComparison = results;
    }, results);
  });

  test('Test 1.3: Authentication State Corruption Check', async ({ page }) => {
    console.log('🔍 Test 1.3: Authentication State Corruption Check');
    
    // Execute auth corruption test
    const results = await page.evaluate(async () => {
      return await window.authDebug.testAuthStateCorruption();
    });
    
    console.log('Auth Corruption Results:', results);
    
    console.log(`  Original Session: ${results.originalSession ? '✅ Present' : '❌ Missing'}`);
    console.log(`  Refreshed Session: ${results.refreshedSession ? '✅ Present' : '❌ Missing'}`);
    console.log(`  Session ID Match: ${results.sessionIdMatch ? '✅ Match' : '❌ Mismatch'}`);
    console.log(`  Original User: ${results.originalUserId}`);
    console.log(`  Refreshed User: ${results.refreshedUserId}`);
    
    if (results.originalError || results.refreshedError) {
      console.log('🚨 Auth errors detected:', {
        original: results.originalError,
        refreshed: results.refreshedError
      });
    }
    
    // Store results
    await page.evaluate((results) => {
      window.step1Results = window.step1Results || {};
      window.step1Results.authCorruption = results;
    }, results);
  });

  test('Step 1 Analysis and Conclusion', async ({ page }) => {
    console.log('🎯 Step 1 Analysis Summary');
    console.log('='.repeat(60));
    
    // Retrieve all Step 1 results
    const allResults = await page.evaluate(() => {
      return window.step1Results || {};
    });
    
    console.log('All Step 1 Results:', JSON.stringify(allResults, null, 2));
    
    // Analyze results to determine next steps
    const rlsResults = allResults.rlsPolicies || [];
    const comparisonResult = allResults.rlsComparison || {};
    const corruptionResult = allResults.authCorruption || {};
    
    // Check for session availability
    const hasSession = corruptionResult.originalSession;
    const sessionWorking = corruptionResult.originalSession && corruptionResult.refreshedSession;
    
    // Check for RLS issues
    const usersAccessible = rlsResults.some(r => r.test === 'Users Table Access' && r.passed);
    const authSessionAvailable = rlsResults.some(r => r.test === 'Auth Session Available' && r.passed);
    
    let conclusion = '';
    let step1Success = false;
    let nextAction = '';
    
    if (!hasSession) {
      conclusion = 'CRITICAL: No authenticated session available. User needs to sign in first.';
      nextAction = 'User must sign in through Google OAuth to proceed with diagnosis';
      step1Success = false;
    } else if (!usersAccessible && comparisonResult.rlsWorks === false) {
      conclusion = 'CRITICAL: RLS policies are blocking authenticated user access. Root cause found.';
      nextAction = 'This matches the PRP description - auth.uid() likely returning NULL. Proceed to Step 2.';
      step1Success = true; // Success in identifying the issue
    } else if (sessionWorking && usersAccessible) {
      conclusion = 'Authentication appears to be working. Need deeper analysis.';
      nextAction = 'Proceed to Step 2 for detailed service analysis';
      step1Success = true;
    } else {
      conclusion = 'Mixed results detected. Partial authentication issues.';
      nextAction = 'Proceed to Step 2 with caution - investigate specific failures';
      step1Success = true;
    }
    
    console.log('\\n🏁 Step 1 Conclusion:');
    console.log('='.repeat(60));
    console.log(`Success: ${step1Success}`);
    console.log(`Conclusion: ${conclusion}`);
    console.log(`Next Action: ${nextAction}`);
    
    // Store final analysis
    await page.evaluate((analysis) => {
      window.step1Analysis = analysis;
    }, {
      success: step1Success,
      conclusion,
      nextAction,
      timestamp: new Date().toISOString()
    });
    
    // Assert that Step 1 provided meaningful results
    expect(allResults).toBeDefined();
    expect(allResults.rlsPolicies).toBeDefined();
    expect(allResults.authCorruption).toBeDefined();
    
    if (step1Success) {
      console.log('\\n✅ Step 1 completed successfully - Ready to proceed to Step 2');
    } else {
      console.log('\\n❌ Step 1 requires user intervention before proceeding');
    }
  });
});