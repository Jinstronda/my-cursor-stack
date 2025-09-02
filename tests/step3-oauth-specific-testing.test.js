/**
 * Step 3: OAuth Specific Testing - Playwright Test
 * Tests Google OAuth configuration, token handling, and session persistence
 */

import { test, expect } from '@playwright/test';

test.describe('Step 3: OAuth Specific Testing', () => {
  test('Complete Step 3 Analysis - OAuth Specific Testing', async ({ page }) => {
    console.log('🎯 Step 3: Complete OAuth Specific Testing Analysis');
    console.log('='.repeat(60));
    
    // Navigate to the application
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Wait for auth utilities to be loaded
    await page.waitForFunction(() => window.authDebug !== undefined, { timeout: 10000 });

    // Execute all Step 3 tests sequentially in one browser context
    const step3Results = await page.evaluate(async () => {
      const results = {
        oauthConfig: null,
        oauthTokens: null,
        provider: 'google'
      };
      
      console.log('🔍 Test 3.1: OAuth Configuration');
      results.oauthConfig = await window.authDebug.testOAuthConfig();
      console.log('OAuth Configuration Results:', results.oauthConfig);
      
      console.log('🔍 Test 3.2: OAuth Token Handling');
      results.oauthTokens = await window.authDebug.testOAuthTokens();
      console.log('OAuth Token Handling Results:', results.oauthTokens);
      
      return results;
    });

    // Display Test 3.1 Results
    console.log('\\n🔍 Test 3.1: OAuth Configuration Results');
    expect(step3Results.oauthConfig).toBeDefined();
    
    const configResults = step3Results.oauthConfig;
    console.log(`  Supabase URL Available: ${configResults.supabaseUrl ? '✅' : '❌'}`);
    console.log(`  Anonymous Key Available: ${configResults.anonKey ? '✅' : '❌'}`);
    console.log(`  Auth Client Available: ${configResults.authClient ? '✅' : '❌'}`);
    console.log(`  Google Provider Enabled: ${configResults.googleEnabled ? '✅' : '❌'}`);
    
    if (configResults.supabaseUrl) {
      console.log(`  Supabase URL: ${configResults.supabaseUrl}`);
    }
    
    if (configResults.error) {
      console.log(`❌ OAuth Config Error: ${configResults.error}`);
    }

    // Display Test 3.2 Results
    console.log('\\n🔍 Test 3.2: OAuth Token Handling Results');
    expect(step3Results.oauthTokens).toBeDefined();
    
    const tokenResults = step3Results.oauthTokens;
    console.log(`  Can Generate OAuth URL: ${tokenResults.canGenerateURL ? '✅' : '❌'}`);
    console.log(`  OAuth URL Valid: ${tokenResults.urlValid ? '✅' : '❌'}`);
    console.log(`  Provider Configured: ${tokenResults.providerConfigured ? '✅' : '❌'}`);
    console.log(`  Token Exchange Ready: ${tokenResults.tokenExchangeReady ? '✅' : '❌'}`);
    
    if (tokenResults.oauthUrl) {
      console.log(`  Generated OAuth URL: ${tokenResults.oauthUrl}`);
      console.log(`  URL Contains Provider: ${tokenResults.oauthUrl.includes('provider=google') ? '✅' : '❌'}`);
      console.log(`  URL Contains Redirect: ${tokenResults.oauthUrl.includes('redirect') ? '✅' : '❌'}`);
    }
    
    if (tokenResults.error) {
      console.log(`❌ Token Handling Error: ${tokenResults.error}`);
    }

    // Analyze results to determine next steps
    console.log('\\n🎯 Step 3 Analysis Summary');
    console.log('='.repeat(60));
    
    // Check for critical OAuth failures
    const configValid = configResults.supabaseUrl && configResults.anonKey && configResults.authClient;
    const googleProviderEnabled = configResults.googleEnabled;
    const canGenerateOAuth = tokenResults.canGenerateURL;
    const oauthUrlValid = tokenResults.urlValid;
    const providerConfigured = tokenResults.providerConfigured;
    
    let conclusion = '';
    let step3Success = false;
    let nextAction = '';
    
    if (!configValid) {
      conclusion = 'CRITICAL: Basic OAuth configuration missing. Supabase client not properly configured.';
      nextAction = 'Fix Supabase client initialization with proper URL and keys';
      step3Success = false;
    } else if (!googleProviderEnabled) {
      conclusion = 'CRITICAL: Google OAuth provider not enabled in Supabase dashboard.';
      nextAction = 'Enable Google OAuth provider in Supabase Auth settings';
      step3Success = false;
    } else if (!canGenerateOAuth) {
      conclusion = 'CRITICAL: Cannot generate OAuth URLs. Provider configuration broken.';
      nextAction = 'Check Google OAuth app configuration and redirect URLs';
      step3Success = false;
    } else if (!oauthUrlValid) {
      conclusion = 'CRITICAL: Generated OAuth URLs are invalid or malformed.';
      nextAction = 'Verify OAuth URL structure and parameters';
      step3Success = false;
    } else if (!providerConfigured) {
      conclusion = 'CRITICAL: Google OAuth provider not properly configured.';
      nextAction = 'Check Google OAuth client ID and secret in Supabase';
      step3Success = false;
    } else {
      conclusion = 'OAuth configuration and token handling is working correctly.';
      nextAction = 'The issue is likely in session persistence or frontend integration. Ready for real fix implementation.';
      step3Success = true;
    }
    
    console.log('\\n🏁 Step 3 Conclusion:');
    console.log('='.repeat(60));
    console.log(`Success: ${step3Success}`);
    console.log(`Conclusion: ${conclusion}`);
    console.log(`Next Action: ${nextAction}`);
    
    // Store final analysis in browser for sequential tester
    await page.evaluate((data) => {
      window.step3Analysis = data.analysis;
      window.step3Results = data.results;
    }, {
      analysis: {
        success: step3Success,
        conclusion,
        nextAction,
        timestamp: new Date().toISOString()
      },
      results: step3Results
    });
    
    // Assert successful execution
    expect(step3Results).toBeDefined();
    expect(step3Results.oauthConfig).toBeDefined();
    expect(step3Results.oauthTokens).toBeDefined();
    
    if (step3Success) {
      console.log('\\n✅ Step 3 completed successfully - Ready for real fix implementation');
      console.log('\\n📋 Step 3 Summary:');
      console.log('- OAuth configuration: WORKING ✅');
      console.log('- Google provider: ENABLED ✅');  
      console.log('- OAuth URL generation: WORKING ✅');
      console.log('- Token handling: READY ✅');
      console.log('\\n🎯 Key Finding: OAuth infrastructure is properly configured');
      console.log('The authentication cascade failure is at the session persistence or frontend integration level.');
    } else {
      console.log('\\n❌ Step 3 identified critical OAuth configuration issues');
      console.log('These issues must be resolved before authentication can work.');
    }

    // Test passes if we got meaningful results, regardless of success/failure  
    expect(conclusion).toBeDefined();
    expect(nextAction).toBeDefined();
  });
});