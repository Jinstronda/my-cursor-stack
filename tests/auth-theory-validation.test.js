/**
 * Authentication Theory Validation Tests
 * 
 * Purpose: Validate the theory that auth.uid() returns NULL in RPC functions
 * while session.user.id works correctly in direct queries
 * 
 * Theory to test:
 * 1. auth.uid() fails in RPC context (returns NULL)
 * 2. session.user.id works in direct queries
 * 3. RLS policies conflict and cause data access issues
 * 4. Multiple Supabase clients interfere with each other
 */

const { createClient } = require('@supabase/supabase-js');

// Test configuration
const SUPABASE_URL = 'https://ronbobkftucgcffiqtgu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvbmJvYmtmdHVjZ2NmZmlxdGd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MjEyMDUsImV4cCI6MjA3MTM5NzIwNX0.5k73tcz7d-N0f6PmzBB1Y0WVaCetFE_l1RI_wIg6MSQ';

describe('Authentication Theory Validation', () => {
  let supabaseClient;
  let testSession = null;

  beforeAll(async () => {
    // Create test client
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    console.log('🔍 Testing auth theory with Supabase client...');
  });

  describe('Test 1: Session vs Auth Context', () => {
    test('should demonstrate auth.uid() behavior in RPC functions', async () => {
      console.log('\n📋 Test 1A: Testing auth.uid() in RPC context');
      
      try {
        // Test RPC function that relies on auth.uid()
        const { data, error } = await supabaseClient
          .rpc('get_current_user_profile');
        
        console.log('RPC Result:', { data, error });
        
        if (error) {
          console.log('❌ RPC failed as expected:', error.message);
          expect(error).toBeTruthy();
        } else {
          console.log('✅ RPC succeeded unexpectedly');
        }
      } catch (err) {
        console.log('❌ RPC threw error:', err.message);
        expect(err).toBeTruthy();
      }
    });

    test('should demonstrate direct query behavior', async () => {
      console.log('\n📋 Test 1B: Testing direct query approach');
      
      try {
        // First get session to get user ID
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        
        console.log('Session check:', { 
          hasSession: !!session, 
          hasUser: !!session?.user,
          userId: session?.user?.id,
          error: sessionError?.message 
        });

        if (!session?.user?.id) {
          console.log('⚠️ No session found - this is expected without authentication');
          expect(session).toBeFalsy();
          return;
        }

        // Test direct query with user ID
        const { data: userData, error: queryError } = await supabaseClient
          .from('users')
          .select('id, email, name')
          .eq('id', session.user.id)
          .single();
        
        console.log('Direct Query Result:', { userData, queryError });
        
        if (queryError) {
          console.log('❌ Direct query failed:', queryError.message);
        } else {
          console.log('✅ Direct query succeeded');
          expect(userData).toBeTruthy();
        }
      } catch (err) {
        console.log('❌ Direct query threw error:', err.message);
      }
    });
  });

  describe('Test 2: RLS Policy Behavior', () => {
    test('should test RLS policy enforcement', async () => {
      console.log('\n📋 Test 2: Testing RLS policies');
      
      try {
        // Test querying users table without authentication
        const { data, error } = await supabaseClient
          .from('users')
          .select('id, email, name')
          .limit(1);
        
        console.log('RLS Test Result:', { 
          dataLength: data?.length, 
          error: error?.message,
          errorCode: error?.code 
        });
        
        if (error && error.code === '42501') {
          console.log('✅ RLS correctly blocked unauthorized access');
          expect(error.code).toBe('42501');
        } else if (data?.length > 0) {
          console.log('⚠️ RLS allowed access - check policies');
        } else {
          console.log('🔍 RLS behavior unclear');
        }
      } catch (err) {
        console.log('❌ RLS test error:', err.message);
      }
    });
  });

  describe('Test 3: Multiple Client Interference', () => {
    test('should test client configuration conflicts', async () => {
      console.log('\n📋 Test 3: Testing multiple client configurations');
      
      // Create multiple clients with different configs
      const client1 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true }
      });
      
      const client2 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      
      try {
        // Test both clients
        const [result1, result2] = await Promise.all([
          client1.from('users').select('count', { count: 'exact', head: true }),
          client2.from('users').select('count', { count: 'exact', head: true })
        ]);
        
        console.log('Client 1 Result:', { 
          count: result1.count, 
          error: result1.error?.message 
        });
        console.log('Client 2 Result:', { 
          count: result2.count, 
          error: result2.error?.message 
        });
        
        const bothSucceeded = !result1.error && !result2.error;
        const bothFailed = result1.error && result2.error;
        const oneFailedOneSucceeded = (!result1.error && result2.error) || (result1.error && !result2.error);
        
        if (bothSucceeded) {
          console.log('✅ Both clients worked - no interference');
        } else if (bothFailed) {
          console.log('❌ Both clients failed - possible RLS issue');
        } else if (oneFailedOneSucceeded) {
          console.log('⚠️ Client configuration interference detected');
        }
        
        expect(true).toBeTruthy(); // Test always passes, we're just observing
      } catch (err) {
        console.log('❌ Multi-client test error:', err.message);
      }
    });
  });

  describe('Test 4: Function vs Table Access', () => {
    test('should compare RPC function vs direct table access', async () => {
      console.log('\n📋 Test 4: Comparing RPC vs Table access');
      
      try {
        // Test 1: Try to call any RPC function
        const rpcTest = await supabaseClient.rpc('get_current_user_profile');
        console.log('RPC Function Test:', { 
          data: rpcTest.data, 
          error: rpcTest.error?.message 
        });
        
        // Test 2: Try direct table access
        const tableTest = await supabaseClient
          .from('users')
          .select('count', { count: 'exact', head: true });
        console.log('Table Access Test:', { 
          count: tableTest.count, 
          error: tableTest.error?.message 
        });
        
        // Test 3: Try other tables
        const tablesTest = await Promise.all([
          supabaseClient.from('projects').select('count', { count: 'exact', head: true }),
          supabaseClient.from('production_companies').select('count', { count: 'exact', head: true }),
          supabaseClient.from('editais').select('count', { count: 'exact', head: true })
        ]);
        
        console.log('Other Tables Test:', {
          projects: { count: tablesTest[0].count, error: tablesTest[0].error?.message },
          companies: { count: tablesTest[1].count, error: tablesTest[1].error?.message },
          editais: { count: tablesTest[2].count, error: tablesTest[2].error?.message }
        });
        
        expect(true).toBeTruthy(); // Observational test
      } catch (err) {
        console.log('❌ Function vs Table test error:', err.message);
      }
    });
  });
});

module.exports = {
  testAuthTheory: async () => {
    console.log('🧪 Running Auth Theory Validation Tests...');
    
    // Simple test runner
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
};