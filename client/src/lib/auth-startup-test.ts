/**
 * Quick startup authentication test
 * Runs on application startup to verify authentication is working correctly
 */

import { supabase } from "@/lib/supabase";
import { runAuthTest } from "@/lib/auth-test-utils";

/**
 * Run startup authentication verification
 * This runs automatically when the app loads
 */
export async function runStartupAuthTest(): Promise<void> {
  console.log('🚀 Running startup authentication verification...');
  
  try {
    // Run comprehensive auth diagnostic
    if (import.meta.env.DEV) {
      console.log('🧪 Running comprehensive auth diagnostic (development mode)...');
      await runAuthTest();
    } else {
      console.log('✅ Starting authentication system...');
    }
    
  } catch (error) {
    console.error('❌ Startup auth test failed with exception:', error);
  }
}

/**
 * Manual authentication diagnostic
 * Can be called from browser console
 */
export async function diagnoseAuth(): Promise<void> {
  console.log('🔍 Running authentication diagnostic...');
  await runAuthTest();
}

// Auto-run on startup in development
if (import.meta.env.DEV) {
  setTimeout(() => {
    runStartupAuthTest();
  }, 1000); // Delay to allow initialization
}

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).authStartup = {
    runStartupAuthTest,
    diagnoseAuth
  };
}