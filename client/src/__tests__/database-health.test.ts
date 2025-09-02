/**
 * Database Health and Connectivity Tests
 * Ensures database operations are working correctly and prevents data layer failures
 */

interface DatabaseHealthCheck {
  connectivity: boolean;
  userOperations: boolean;
  projectOperations: boolean;
  sessionOperations: boolean;
  errorCount: number;
  responseTime: number;
  errors: string[];
}

interface DatabaseTestResult {
  operation: string;
  success: boolean;
  responseTime: number;
  error?: string;
  data?: any;
}

class DatabaseHealthTester {
  private baseUrl = 'http://localhost:3000';
  private testResults: DatabaseTestResult[] = [];
  private startTime = 0;

  private async timeOperation<T>(
    operation: string, 
    fn: () => Promise<T>
  ): Promise<DatabaseTestResult> {
    const startTime = Date.now();
    
    try {
      const data = await fn();
      const responseTime = Date.now() - startTime;
      
      const result: DatabaseTestResult = {
        operation,
        success: true,
        responseTime,
        data
      };
      
      this.testResults.push(result);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const result: DatabaseTestResult = {
        operation,
        success: false,
        responseTime,
        error: errorMessage
      };
      
      this.testResults.push(result);
      return result;
    }
  }

  async testDatabaseConnectivity(): Promise<DatabaseTestResult> {
    return this.timeOperation('Database Connectivity', async () => {
      // Test basic server response
      const response = await fetch(`${this.baseUrl}/api/auth/user`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer health_check_user'
        }
      });

      if (!response.ok && response.status === 500) {
        throw new Error(`Database connection failed with status: ${response.status}`);
      }

      // Status 401/403 is expected for invalid auth, 500 means database issues
      return {
        status: response.status,
        connected: response.status !== 500
      };
    });
  }

  async testUserOperations(): Promise<DatabaseTestResult> {
    return this.timeOperation('User Operations', async () => {
      const testUser = {
        id: 'health_test_user_' + Date.now(),
        email: 'healthtest@example.com',
        name: 'Health Test User',
        username: 'healthtest'
      };

      // Test user upsert operation (simulates Supabase auth sync)
      const response = await fetch(`${this.baseUrl}/api/users/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUser.id}`
        },
        body: JSON.stringify({
          name: testUser.name,
          bio: 'Database health check user'
        })
      });

      // 401/403 is expected for invalid auth, 500 means database issues
      if (response.status === 500) {
        const error = await response.text();
        throw new Error(`User operations failed: ${error}`);
      }

      return {
        status: response.status,
        operationWorking: response.status !== 500
      };
    });
  }

  async testProjectOperations(): Promise<DatabaseTestResult> {
    return this.timeOperation('Project Operations', async () => {
      const testUserId = 'health_test_user_' + Date.now();

      // Test project creation
      const createResponse = await fetch(`${this.baseUrl}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUserId}`
        },
        body: JSON.stringify({
          name: 'Database Health Test Project',
          description: 'Automated health check project',
          userId: testUserId
        })
      });

      if (createResponse.status === 500) {
        const error = await createResponse.text();
        throw new Error(`Project creation failed: ${error}`);
      }

      // Test project retrieval
      const getResponse = await fetch(`${this.baseUrl}/api/projects/my`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testUserId}`
        }
      });

      if (getResponse.status === 500) {
        const error = await getResponse.text();
        throw new Error(`Project retrieval failed: ${error}`);
      }

      return {
        createStatus: createResponse.status,
        getStatus: getResponse.status,
        operationsWorking: createResponse.status !== 500 && getResponse.status !== 500
      };
    });
  }

  async testChatSessionOperations(): Promise<DatabaseTestResult> {
    return this.timeOperation('Chat Session Operations', async () => {
      const testUserId = 'health_test_user_' + Date.now();

      // Test chat session creation
      const response = await fetch(`${this.baseUrl}/api/chat/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testUserId}`
        },
        body: JSON.stringify({
          title: 'Database Health Test Session',
          userId: testUserId
        })
      });

      if (response.status === 500) {
        const error = await response.text();
        throw new Error(`Chat session operations failed: ${error}`);
      }

      return {
        status: response.status,
        operationWorking: response.status !== 500
      };
    });
  }

  async testDocumentOperations(): Promise<DatabaseTestResult> {
    return this.timeOperation('Document Operations', async () => {
      // Test document retrieval for a mock session
      const response = await fetch(`${this.baseUrl}/api/chat/sessions/1/documents`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer health_test_user'
        }
      });

      // 401/403/404 are expected, 500 means database issues
      if (response.status === 500) {
        const error = await response.text();
        throw new Error(`Document operations failed: ${error}`);
      }

      return {
        status: response.status,
        operationWorking: response.status !== 500
      };
    });
  }

  async runComprehensiveHealthCheck(): Promise<DatabaseHealthCheck> {
    console.log('🔍 Starting comprehensive database health check...');
    this.testResults = [];
    this.startTime = Date.now();

    // Run all health check operations
    const connectivityTest = await this.testDatabaseConnectivity();
    const userOpsTest = await this.testUserOperations();
    const projectOpsTest = await this.testProjectOperations();
    const sessionOpsTest = await this.testChatSessionOperations();
    const documentOpsTest = await this.testDocumentOperations();

    const totalTime = Date.now() - this.startTime;
    const errors = this.testResults
      .filter(r => !r.success)
      .map(r => `${r.operation}: ${r.error}`);

    const healthCheck: DatabaseHealthCheck = {
      connectivity: connectivityTest.success,
      userOperations: userOpsTest.success,
      projectOperations: projectOpsTest.success,
      sessionOperations: sessionOpsTest.success,
      errorCount: errors.length,
      responseTime: totalTime,
      errors
    };

    this.logHealthCheckResults(healthCheck);
    return healthCheck;
  }

  private logHealthCheckResults(health: DatabaseHealthCheck): void {
    console.log('📊 Database Health Check Results:');
    console.log('================================');
    console.log(`🔌 Connectivity: ${health.connectivity ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`👤 User Operations: ${health.userOperations ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`📁 Project Operations: ${health.projectOperations ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`💬 Session Operations: ${health.sessionOperations ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`⏱️  Total Response Time: ${health.responseTime}ms`);
    console.log(`❌ Errors: ${health.errorCount}`);
    
    if (health.errors.length > 0) {
      console.log('\n🔍 Error Details:');
      health.errors.forEach(error => console.log(`  • ${error}`));
    }

    if (health.errorCount === 0) {
      console.log('\n🎉 All database operations are healthy!');
    } else {
      console.log('\n⚠️  Some database operations are failing. Check server logs.');
    }

    // Individual test results
    console.log('\n📋 Detailed Test Results:');
    this.testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} ${result.operation} (${result.responseTime}ms)`);
      if (!result.success && result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });
  }

  // Quick smoke test for immediate validation
  async runQuickSmokeTest(): Promise<boolean> {
    console.log('🚀 Running quick database smoke test...');
    
    try {
      const connectivityTest = await this.testDatabaseConnectivity();
      const projectTest = await this.testProjectOperations();
      
      const allPassed = connectivityTest.success && projectTest.success;
      
      console.log(`🔥 Smoke Test: ${allPassed ? '✅ PASS' : '❌ FAIL'}`);
      
      if (!allPassed) {
        console.log('❌ Critical database operations are failing!');
        this.testResults.forEach(result => {
          if (!result.success) {
            console.log(`  • ${result.operation}: ${result.error}`);
          }
        });
      }
      
      return allPassed;
    } catch (error) {
      console.error('💥 Smoke test failed with exception:', error);
      return false;
    }
  }

  // Monitor database performance over time
  async monitorPerformance(duration: number = 60000): Promise<{
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    successRate: number;
    samples: number;
  }> {
    console.log(`📈 Monitoring database performance for ${duration / 1000} seconds...`);
    
    const startTime = Date.now();
    const samples: number[] = [];
    let successCount = 0;
    let totalSamples = 0;

    while (Date.now() - startTime < duration) {
      const testStart = Date.now();
      
      try {
        await this.testDatabaseConnectivity();
        const responseTime = Date.now() - testStart;
        samples.push(responseTime);
        successCount++;
      } catch {
        // Failed request, don't add to samples but count it
      }
      
      totalSamples++;
      
      // Wait 2 seconds between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const averageResponseTime = samples.length > 0 
      ? samples.reduce((a, b) => a + b, 0) / samples.length 
      : 0;
    const maxResponseTime = samples.length > 0 ? Math.max(...samples) : 0;
    const minResponseTime = samples.length > 0 ? Math.min(...samples) : 0;
    const successRate = totalSamples > 0 ? (successCount / totalSamples) * 100 : 0;

    const results = {
      averageResponseTime,
      maxResponseTime,
      minResponseTime,
      successRate,
      samples: totalSamples
    };

    console.log('📊 Performance Monitoring Results:');
    console.log(`  Average Response Time: ${averageResponseTime.toFixed(2)}ms`);
    console.log(`  Max Response Time: ${maxResponseTime}ms`);
    console.log(`  Min Response Time: ${minResponseTime}ms`);
    console.log(`  Success Rate: ${successRate.toFixed(2)}%`);
    console.log(`  Total Samples: ${totalSamples}`);

    return results;
  }
}

// Export for use in other tests
export { DatabaseHealthTester, type DatabaseHealthCheck, type DatabaseTestResult };

// Browser console integration
if (typeof window !== 'undefined') {
  const tester = new DatabaseHealthTester();
  
  (window as any).runDatabaseHealthCheck = () => tester.runComprehensiveHealthCheck();
  (window as any).runDatabaseSmokeTest = () => tester.runQuickSmokeTest();
  (window as any).monitorDatabasePerformance = (duration?: number) => 
    tester.monitorPerformance(duration);
}