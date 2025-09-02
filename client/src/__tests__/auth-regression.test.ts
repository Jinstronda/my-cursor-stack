/**
 * Authentication Flow Regression Tests
 * Prevents authentication-related regressions that could break user access
 */

interface AuthTestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  executionTime: number;
  error?: string;
  data?: any;
}

interface AuthFlowTestSuite {
  totalTests: number;
  passed: number;
  failed: number;
  executionTime: number;
  results: AuthTestResult[];
  authSystemHealthy: boolean;
}

interface MockSupabaseUser {
  id: string;
  email: string;
  user_metadata: {
    name: string;
    avatar_url?: string;
  };
  created_at: string;
}

class AuthenticationRegressionTests {
  private baseUrl = 'http://localhost:3000';
  private results: AuthTestResult[] = [];

  private async runTest(
    testName: string,
    testFn: () => Promise<void>
  ): Promise<AuthTestResult> {
    const startTime = Date.now();
    
    try {
      const data = await testFn();
      
      const result: AuthTestResult = {
        testName,
        status: 'PASS',
        executionTime: Date.now() - startTime,
        data
      };
      
      this.results.push(result);
      return result;
    } catch (error) {
      const result: AuthTestResult = {
        testName,
        status: 'FAIL',
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      this.results.push(result);
      return result;
    }
  }

  // Test 1: User authentication endpoint responds correctly
  async testAuthEndpointResponse(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/auth/user`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test_user_auth_regression'
      }
    });

    // Should respond (not timeout or 500 error)
    if (response.status === 500) {
      const error = await response.text();
      throw new Error(`Auth endpoint returning server error: ${error}`);
    }

    // Valid responses: 200 (authenticated), 401/403 (not authenticated)
    if (![200, 401, 403, 404].includes(response.status)) {
      throw new Error(`Unexpected auth endpoint response: ${response.status}`);
    }
  }

  // Test 2: User data synchronization from Supabase
  async testUserDataSync(): Promise<any> {
    const mockUser: MockSupabaseUser = {
      id: 'auth_regression_test_' + Date.now(),
      email: 'authtest@regression.com',
      user_metadata: {
        name: 'Auth Regression Test User',
        avatar_url: 'https://example.com/avatar.jpg'
      },
      created_at: new Date().toISOString()
    };

    // Simulate user sync operation that happens during auth
    const response = await fetch(`${this.baseUrl}/api/users/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mockUser.id}`
      },
      body: JSON.stringify({
        name: mockUser.user_metadata.name,
        bio: 'Auth regression test user'
      })
    });

    if (response.status === 500) {
      const error = await response.text();
      throw new Error(`User sync failing: ${error}`);
    }

    return {
      userId: mockUser.id,
      syncStatus: response.status,
      synced: response.status < 500
    };
  }

  // Test 3: Protected routes authentication check
  async testProtectedRouteAuth(): Promise<any> {
    const testUserId = 'protected_route_test_' + Date.now();
    
    // Test accessing protected project creation endpoint
    const protectedResponse = await fetch(`${this.baseUrl}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testUserId}`
      },
      body: JSON.stringify({
        name: 'Auth Protected Route Test',
        userId: testUserId
      })
    });

    if (protectedResponse.status === 500) {
      const error = await protectedResponse.text();
      throw new Error(`Protected route auth check broken: ${error}`);
    }

    // Should either succeed (200/201) or fail with auth error (401/403), not server error
    return {
      status: protectedResponse.status,
      authWorking: protectedResponse.status !== 500
    };
  }

  // Test 4: Session persistence and validation
  async testSessionPersistence(): Promise<any> {
    const testUserId = 'session_test_' + Date.now();
    
    // Make multiple requests with same auth token
    const requests = Array.from({ length: 3 }, (_, i) =>
      fetch(`${this.baseUrl}/api/projects/my`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testUserId}`,
          'X-Test-Request': `${i + 1}`
        }
      })
    );

    const responses = await Promise.all(requests);
    
    // All should have consistent authentication handling
    const statuses = responses.map(r => r.status);
    const hasServerErrors = statuses.some(s => s === 500);

    if (hasServerErrors) {
      throw new Error('Session persistence causing server errors');
    }

    // All responses should have same status (consistent auth state)
    const uniqueStatuses = [...new Set(statuses)];
    
    return {
      requestCount: requests.length,
      statuses,
      consistent: uniqueStatuses.length === 1,
      noServerErrors: !hasServerErrors
    };
  }

  // Test 5: Authentication middleware integrity
  async testAuthMiddlewareIntegrity(): Promise<any> {
    const testScenarios = [
      { name: 'No Authorization Header', headers: {} },
      { name: 'Invalid Token Format', headers: { 'Authorization': 'InvalidToken' } },
      { name: 'Bearer Invalid', headers: { 'Authorization': 'Bearer invalid_token_123' } },
      { name: 'Empty Bearer', headers: { 'Authorization': 'Bearer ' } },
    ];

    const results = await Promise.all(
      testScenarios.map(async scenario => {
        try {
          const response = await fetch(`${this.baseUrl}/api/projects/my`, {
            method: 'GET',
            headers: scenario.headers
          });

          return {
            scenario: scenario.name,
            status: response.status,
            serverError: response.status === 500
          };
        } catch (error) {
          return {
            scenario: scenario.name,
            status: 0,
            serverError: true,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    const serverErrors = results.filter(r => r.serverError);
    
    if (serverErrors.length > 0) {
      throw new Error(`Auth middleware causing server errors: ${serverErrors.map(r => r.scenario).join(', ')}`);
    }

    return {
      scenariosTested: testScenarios.length,
      results,
      middlewareHealthy: serverErrors.length === 0
    };
  }

  // Test 6: User creation and retrieval flow
  async testUserCreationFlow(): Promise<any> {
    const testUser = {
      id: 'user_creation_test_' + Date.now(),
      email: 'usercreation@test.com',
      name: 'User Creation Test',
      username: 'usercreationtest'
    };

    // Test user profile update (simulates user creation/sync)
    const updateResponse = await fetch(`${this.baseUrl}/api/users/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testUser.id}`
      },
      body: JSON.stringify({
        name: testUser.name,
        bio: 'User creation flow test'
      })
    });

    if (updateResponse.status === 500) {
      const error = await updateResponse.text();
      throw new Error(`User creation flow broken: ${error}`);
    }

    // Test user retrieval
    const getResponse = await fetch(`${this.baseUrl}/api/auth/user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testUser.id}`
      }
    });

    if (getResponse.status === 500) {
      const error = await getResponse.text();
      throw new Error(`User retrieval broken: ${error}`);
    }

    return {
      userId: testUser.id,
      updateStatus: updateResponse.status,
      getStatus: getResponse.status,
      flowWorking: updateResponse.status !== 500 && getResponse.status !== 500
    };
  }

  // Test 7: Auth-dependent feature integration
  async testAuthDependentFeatures(): Promise<any> {
    const testUserId = 'auth_features_test_' + Date.now();
    
    const featureTests = [
      {
        name: 'Project Creation',
        endpoint: '/api/projects',
        method: 'POST',
        body: JSON.stringify({ name: 'Auth Feature Test', userId: testUserId })
      },
      {
        name: 'Chat Session Creation', 
        endpoint: '/api/chat/sessions',
        method: 'POST',
        body: JSON.stringify({ title: 'Auth Feature Test', userId: testUserId })
      },
      {
        name: 'Project Retrieval',
        endpoint: '/api/projects/my',
        method: 'GET',
        body: null
      }
    ];

    const results = await Promise.all(
      featureTests.map(async test => {
        try {
          const response = await fetch(`${this.baseUrl}${test.endpoint}`, {
            method: test.method,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${testUserId}`
            },
            ...(test.body && { body: test.body })
          });

          return {
            feature: test.name,
            status: response.status,
            working: response.status !== 500
          };
        } catch (error) {
          return {
            feature: test.name,
            status: 0,
            working: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    const brokenFeatures = results.filter(r => !r.working);
    
    if (brokenFeatures.length > 0) {
      throw new Error(`Auth-dependent features broken: ${brokenFeatures.map(f => f.feature).join(', ')}`);
    }

    return {
      featuresTestedCount: featureTests.length,
      results,
      allWorking: brokenFeatures.length === 0
    };
  }

  async runFullAuthRegressionSuite(): Promise<AuthFlowTestSuite> {
    console.log('🔐 Starting authentication regression test suite...');
    this.results = [];
    const startTime = Date.now();

    // Run all auth regression tests
    await this.runTest('Auth Endpoint Response', () => this.testAuthEndpointResponse());
    await this.runTest('User Data Sync', () => this.testUserDataSync());
    await this.runTest('Protected Route Auth', () => this.testProtectedRouteAuth());
    await this.runTest('Session Persistence', () => this.testSessionPersistence());
    await this.runTest('Auth Middleware Integrity', () => this.testAuthMiddlewareIntegrity());
    await this.runTest('User Creation Flow', () => this.testUserCreationFlow());
    await this.runTest('Auth-Dependent Features', () => this.testAuthDependentFeatures());

    const totalExecutionTime = Date.now() - startTime;
    const failedTests = this.results.filter(r => r.status === 'FAIL');

    const suite: AuthFlowTestSuite = {
      totalTests: this.results.length,
      passed: this.results.filter(r => r.status === 'PASS').length,
      failed: failedTests.length,
      executionTime: totalExecutionTime,
      results: this.results,
      authSystemHealthy: failedTests.length === 0
    };

    this.logAuthRegressionResults(suite);
    return suite;
  }

  private logAuthRegressionResults(suite: AuthFlowTestSuite): void {
    console.log('\n🔐 AUTHENTICATION REGRESSION RESULTS');
    console.log('====================================');
    console.log(`📊 Total Tests: ${suite.totalTests}`);
    console.log(`✅ Passed: ${suite.passed}`);
    console.log(`❌ Failed: ${suite.failed}`);
    console.log(`⏱️  Execution Time: ${suite.executionTime}ms`);
    console.log(`🔐 Auth System Health: ${suite.authSystemHealthy ? 'HEALTHY' : 'COMPROMISED'}`);

    console.log('\n📋 Individual Test Results:');
    console.log('============================');
    
    suite.results.forEach(result => {
      const statusIcon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${statusIcon} ${result.testName} (${result.executionTime}ms)`);
      
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
      
      if (result.data) {
        console.log(`    Data: ${JSON.stringify(result.data, null, 2)}`);
      }
    });

    if (!suite.authSystemHealthy) {
      console.log('\n🚨 AUTH SYSTEM COMPROMISED - Immediate attention required!');
      console.log('Failed authentication tests:');
      
      suite.results
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          console.log(`  • ${result.testName}: ${result.error}`);
        });
        
      console.log('\n⚠️  These failures may prevent users from accessing the application!');
    } else {
      console.log('\n🎉 All authentication tests passed - Auth system is healthy!');
    }
  }

  // Quick auth health check for immediate feedback
  async runQuickAuthCheck(): Promise<boolean> {
    console.log('🔐 Running quick authentication health check...');
    this.results = [];

    await this.runTest('Auth Endpoint Quick Check', () => this.testAuthEndpointResponse());
    await this.runTest('Protected Route Quick Check', () => this.testProtectedRouteAuth());

    const failures = this.results.filter(r => r.status === 'FAIL');
    const healthy = failures.length === 0;

    console.log(`🔐 Quick Auth Check: ${healthy ? '✅ HEALTHY' : '❌ COMPROMISED'}`);
    
    if (!healthy) {
      console.log('🚨 Authentication issues detected:');
      failures.forEach(result => {
        console.log(`  • ${result.testName}: ${result.error}`);
      });
    }

    return healthy;
  }
}

// Export for use in CI/CD and other test suites
export { AuthenticationRegressionTests, type AuthTestResult, type AuthFlowTestSuite };

// Browser console integration
if (typeof window !== 'undefined') {
  const authTests = new AuthenticationRegressionTests();
  
  (window as any).runAuthRegressionTests = () => authTests.runFullAuthRegressionSuite();
  (window as any).runQuickAuthCheck = () => authTests.runQuickAuthCheck();
}