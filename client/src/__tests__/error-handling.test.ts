/**
 * Error Handling and Recovery Test Scenarios
 * Validates that the application handles errors gracefully and recovers appropriately
 */

interface ErrorScenario {
  name: string;
  description: string;
  setup: () => Promise<void>;
  trigger: () => Promise<Response>;
  validate: (response: Response) => Promise<boolean>;
  expectedStatus?: number;
  expectedError?: string;
  critical: boolean;
}

interface ErrorTestResult {
  scenario: string;
  status: 'PASS' | 'FAIL';
  executionTime: number;
  actualStatus: number;
  expectedStatus?: number;
  error?: string;
  recovered: boolean;
  critical: boolean;
}

interface ErrorHandlingSuite {
  totalScenarios: number;
  passed: number;
  failed: number;
  criticalFailures: number;
  executionTime: number;
  results: ErrorTestResult[];
  errorHandlingHealthy: boolean;
}

class ErrorHandlingValidator {
  private baseUrl = 'http://localhost:3000';
  private results: ErrorTestResult[] = [];
  private testUserId = 'error_test_user_' + Date.now();

  private async runScenario(scenario: ErrorScenario): Promise<ErrorTestResult> {
    const startTime = Date.now();
    
    try {
      // Setup phase
      await scenario.setup();
      
      // Trigger error condition
      const response = await scenario.trigger();
      
      // Validate response
      const recovered = await scenario.validate(response);
      
      // Check if status matches expectation
      const statusMatches = !scenario.expectedStatus || response.status === scenario.expectedStatus;
      
      const result: ErrorTestResult = {
        scenario: scenario.name,
        status: statusMatches && recovered ? 'PASS' : 'FAIL',
        executionTime: Date.now() - startTime,
        actualStatus: response.status,
        expectedStatus: scenario.expectedStatus,
        recovered,
        critical: scenario.critical
      };
      
      if (!statusMatches || !recovered) {
        result.error = `Expected status: ${scenario.expectedStatus}, got: ${response.status}. Recovered: ${recovered}`;
      }
      
      this.results.push(result);
      return result;
    } catch (error) {
      const result: ErrorTestResult = {
        scenario: scenario.name,
        status: 'FAIL',
        executionTime: Date.now() - startTime,
        actualStatus: 0,
        expectedStatus: scenario.expectedStatus,
        error: error instanceof Error ? error.message : 'Unknown error',
        recovered: false,
        critical: scenario.critical
      };
      
      this.results.push(result);
      return result;
    }
  }

  private createErrorScenarios(): ErrorScenario[] {
    return [
      // Authentication Error Scenarios
      {
        name: 'Missing Authorization Header',
        description: 'Test API response when auth header is completely missing',
        setup: async () => {},
        trigger: async () => {
          return fetch(`${this.baseUrl}/api/projects/my`, {
            method: 'GET'
          });
        },
        validate: async (response) => {
          return [401, 403].includes(response.status);
        },
        expectedStatus: 401,
        critical: true
      },

      {
        name: 'Invalid Authorization Token',
        description: 'Test API response to malformed or invalid auth tokens',
        setup: async () => {},
        trigger: async () => {
          return fetch(`${this.baseUrl}/api/projects/my`, {
            method: 'GET',
            headers: {
              'Authorization': 'Bearer invalid_token_12345'
            }
          });
        },
        validate: async (response) => {
          return [401, 403, 404].includes(response.status);
        },
        expectedStatus: 401,
        critical: true
      },

      {
        name: 'Malformed Authorization Header',
        description: 'Test API response to completely malformed auth headers',
        setup: async () => {},
        trigger: async () => {
          return fetch(`${this.baseUrl}/api/projects/my`, {
            method: 'GET',
            headers: {
              'Authorization': 'NotBearer invalid'
            }
          });
        },
        validate: async (response) => {
          return [401, 403].includes(response.status) && response.status !== 500;
        },
        expectedStatus: 401,
        critical: true
      },

      // Data Validation Error Scenarios
      {
        name: 'Invalid Project Data - Empty Name',
        description: 'Test validation of project creation with invalid data',
        setup: async () => {},
        trigger: async () => {
          return fetch(`${this.baseUrl}/api/projects`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.testUserId}`
            },
            body: JSON.stringify({
              name: '', // Invalid empty name
              userId: this.testUserId
            })
          });
        },
        validate: async (response) => {
          return response.status === 400;
        },
        expectedStatus: 400,
        critical: true
      },

      {
        name: 'Invalid Project Data - Missing Required Fields',
        description: 'Test validation when required fields are missing',
        setup: async () => {},
        trigger: async () => {
          return fetch(`${this.baseUrl}/api/projects`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.testUserId}`
            },
            body: JSON.stringify({
              // Missing name and userId
              description: 'Project without required fields'
            })
          });
        },
        validate: async (response) => {
          return response.status === 400;
        },
        expectedStatus: 400,
        critical: true
      },

      {
        name: 'Invalid JSON Payload',
        description: 'Test API response to malformed JSON',
        setup: async () => {},
        trigger: async () => {
          return fetch(`${this.baseUrl}/api/projects`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.testUserId}`
            },
            body: '{ invalid json syntax }'
          });
        },
        validate: async (response) => {
          return response.status === 400 && response.status !== 500;
        },
        expectedStatus: 400,
        critical: true
      },

      // Resource Not Found Scenarios
      {
        name: 'Non-existent Project Retrieval',
        description: 'Test API response when requesting non-existent project',
        setup: async () => {},
        trigger: async () => {
          return fetch(`${this.baseUrl}/api/projects/99999`, {
            method: 'GET'
          });
        },
        validate: async (response) => {
          return response.status === 404;
        },
        expectedStatus: 404,
        critical: false
      },

      {
        name: 'Non-existent Chat Session',
        description: 'Test API response when requesting non-existent chat session',
        setup: async () => {},
        trigger: async () => {
          return fetch(`${this.baseUrl}/api/chat/sessions/99999`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${this.testUserId}`
            }
          });
        },
        validate: async (response) => {
          return response.status === 404;
        },
        expectedStatus: 404,
        critical: false
      },

      // Authorization Error Scenarios
      {
        name: 'Unauthorized Project Access',
        description: 'Test accessing another user\'s project',
        setup: async () => {
          // Create a project with one user
          const createResponse = await fetch(`${this.baseUrl}/api/projects`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.testUserId}`
            },
            body: JSON.stringify({
              name: 'Unauthorized Access Test',
              userId: this.testUserId
            })
          });
          
          if (!createResponse.ok) {
            throw new Error('Failed to setup test project for unauthorized access test');
          }
        },
        trigger: async () => {
          // Try to access with different user
          const differentUserId = 'different_user_' + Date.now();
          return fetch(`${this.baseUrl}/api/projects/my`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${differentUserId}`
            }
          });
        },
        validate: async (response) => {
          // Should either return empty array (200) or auth error, not server error
          return response.status !== 500;
        },
        critical: true
      },

      {
        name: 'Unauthorized Project Modification',
        description: 'Test attempting to modify another user\'s project',
        setup: async () => {},
        trigger: async () => {
          const differentUserId = 'unauthorized_mod_user_' + Date.now();
          return fetch(`${this.baseUrl}/api/projects/1`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${differentUserId}`
            },
            body: JSON.stringify({
              name: 'Unauthorized Modification Attempt'
            })
          });
        },
        validate: async (response) => {
          return [403, 404].includes(response.status);
        },
        expectedStatus: 403,
        critical: true
      },

      // Rate Limiting and Load Scenarios
      {
        name: 'Rapid Sequential Requests',
        description: 'Test API stability under rapid sequential requests',
        setup: async () => {},
        trigger: async () => {
          // Make 10 rapid requests
          const requests = Array.from({ length: 10 }, () =>
            fetch(`${this.baseUrl}/api/projects/community`, {
              method: 'GET'
            })
          );
          
          const responses = await Promise.all(requests);
          
          // Return last response for validation
          return responses[responses.length - 1];
        },
        validate: async (response) => {
          // Should handle rapid requests without server errors
          return response.status !== 500;
        },
        critical: false
      },

      // Database Connection Error Simulation
      {
        name: 'Database Operation Stress Test',
        description: 'Test API stability when database operations are stressed',
        setup: async () => {},
        trigger: async () => {
          // Try to create multiple projects simultaneously
          const requests = Array.from({ length: 5 }, (_, i) =>
            fetch(`${this.baseUrl}/api/projects`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer stress_test_user_${i}_${Date.now()}`
              },
              body: JSON.stringify({
                name: `Stress Test Project ${i}`,
                userId: `stress_test_user_${i}_${Date.now()}`
              })
            })
          );
          
          const responses = await Promise.all(requests);
          
          // Check if any returned server errors
          const serverErrors = responses.filter(r => r.status === 500);
          
          // Return a synthetic response representing the stress test result
          return {
            ok: serverErrors.length === 0,
            status: serverErrors.length > 0 ? 500 : 200,
            text: async () => `Stress test: ${serverErrors.length} server errors out of ${responses.length} requests`
          } as Response;
        },
        validate: async (response) => {
          return response.status !== 500;
        },
        critical: true
      },

      // Content Type Error Scenarios
      {
        name: 'Wrong Content Type',
        description: 'Test API response to incorrect content type',
        setup: async () => {},
        trigger: async () => {
          return fetch(`${this.baseUrl}/api/projects`, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain', // Wrong content type
              'Authorization': `Bearer ${this.testUserId}`
            },
            body: JSON.stringify({
              name: 'Wrong Content Type Test',
              userId: this.testUserId
            })
          });
        },
        validate: async (response) => {
          return [400, 415].includes(response.status); // 415 = Unsupported Media Type
        },
        expectedStatus: 400,
        critical: false
      },

      // Large Payload Scenarios
      {
        name: 'Large Payload Handling',
        description: 'Test API response to unusually large payloads',
        setup: async () => {},
        trigger: async () => {
          const largeDescription = 'x'.repeat(100000); // 100KB description
          return fetch(`${this.baseUrl}/api/projects`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.testUserId}`
            },
            body: JSON.stringify({
              name: 'Large Payload Test',
              description: largeDescription,
              userId: this.testUserId
            })
          });
        },
        validate: async (response) => {
          // Should either accept it or return 413 (Payload Too Large), not 500
          return response.status !== 500;
        },
        critical: false
      }
    ];
  }

  // Recovery Testing
  async testRecoveryAfterErrors(): Promise<{
    successfulAfterError: boolean;
    normalOperationsWork: boolean;
  }> {
    // First, trigger some errors
    await fetch(`${this.baseUrl}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid_token'
      },
      body: '{ invalid json }'
    });

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Try normal operation
    const normalResponse = await fetch(`${this.baseUrl}/api/projects/community`);
    
    // Try authenticated operation
    const authResponse = await fetch(`${this.baseUrl}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.testUserId}`
      },
      body: JSON.stringify({
        name: 'Recovery Test Project',
        userId: this.testUserId
      })
    });

    return {
      successfulAfterError: normalResponse.status !== 500,
      normalOperationsWork: normalResponse.status < 400 && authResponse.status < 500
    };
  }

  async runComprehensiveErrorHandlingTests(): Promise<ErrorHandlingSuite> {
    console.log('⚠️  Starting comprehensive error handling validation...');
    this.results = [];
    const startTime = Date.now();

    const scenarios = this.createErrorScenarios();

    // Run all error scenarios
    for (const scenario of scenarios) {
      console.log(`Testing: ${scenario.name}...`);
      await this.runScenario(scenario);
      
      // Small delay between tests to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Test recovery
    console.log('Testing error recovery...');
    const recoveryTest = await this.testRecoveryAfterErrors();

    const totalExecutionTime = Date.now() - startTime;
    const failed = this.results.filter(r => r.status === 'FAIL');
    const criticalFailures = failed.filter(r => r.critical);

    const suite: ErrorHandlingSuite = {
      totalScenarios: this.results.length,
      passed: this.results.filter(r => r.status === 'PASS').length,
      failed: failed.length,
      criticalFailures: criticalFailures.length,
      executionTime: totalExecutionTime,
      results: this.results,
      errorHandlingHealthy: criticalFailures.length === 0 && recoveryTest.normalOperationsWork
    };

    this.logErrorHandlingResults(suite, recoveryTest);
    return suite;
  }

  private logErrorHandlingResults(
    suite: ErrorHandlingSuite, 
    recoveryTest: { successfulAfterError: boolean; normalOperationsWork: boolean }
  ): void {
    console.log('\n⚠️  ERROR HANDLING VALIDATION RESULTS');
    console.log('=====================================');
    console.log(`📊 Total Scenarios: ${suite.totalScenarios}`);
    console.log(`✅ Passed: ${suite.passed}`);
    console.log(`❌ Failed: ${suite.failed}`);
    console.log(`🚨 Critical Failures: ${suite.criticalFailures}`);
    console.log(`⏱️  Execution Time: ${suite.executionTime}ms`);
    console.log(`🛡️  Error Handling Health: ${suite.errorHandlingHealthy ? 'HEALTHY' : 'COMPROMISED'}`);
    console.log(`🔄 Recovery After Errors: ${recoveryTest.normalOperationsWork ? 'WORKING' : 'BROKEN'}`);

    console.log('\n📋 Scenario Results:');
    console.log('====================');
    
    // Group results by category
    const authErrors = this.results.filter(r => r.scenario.toLowerCase().includes('auth'));
    const validationErrors = this.results.filter(r => r.scenario.toLowerCase().includes('invalid') || r.scenario.toLowerCase().includes('validation'));
    const resourceErrors = this.results.filter(r => r.scenario.toLowerCase().includes('non-existent'));
    const otherErrors = this.results.filter(r => 
      !authErrors.includes(r) && !validationErrors.includes(r) && !resourceErrors.includes(r)
    );

    const printCategory = (categoryName: string, results: ErrorTestResult[]) => {
      if (results.length > 0) {
        console.log(`\n${categoryName}:`);
        results.forEach(result => {
          const statusIcon = result.status === 'PASS' ? '✅' : '❌';
          const criticalIcon = result.critical ? '🚨' : '  ';
          console.log(`${statusIcon}${criticalIcon} ${result.scenario} (${result.executionTime}ms)`);
          console.log(`    Expected: ${result.expectedStatus || 'N/A'}, Got: ${result.actualStatus}`);
          if (result.error) {
            console.log(`    Error: ${result.error}`);
          }
        });
      }
    };

    printCategory('Authentication Errors', authErrors);
    printCategory('Validation Errors', validationErrors);
    printCategory('Resource Not Found Errors', resourceErrors);
    printCategory('Other Error Scenarios', otherErrors);

    if (suite.criticalFailures > 0) {
      console.log('\n🚨 CRITICAL ERROR HANDLING ISSUES DETECTED!');
      console.log('The following critical error scenarios are not handled properly:');
      
      suite.results
        .filter(r => r.critical && r.status === 'FAIL')
        .forEach(result => {
          console.log(`  • ${result.scenario}: ${result.error}`);
        });
        
      console.log('\n⚠️  These issues may cause server crashes or security vulnerabilities!');
    }

    if (!recoveryTest.normalOperationsWork) {
      console.log('\n🔄 RECOVERY ISSUES DETECTED!');
      console.log('System may not recover properly after errors occur.');
    }

    if (suite.errorHandlingHealthy) {
      console.log('\n🎉 Error handling system is working correctly!');
      console.log('Application properly handles error scenarios and maintains stability.');
    }
  }

  // Quick critical error check
  async runQuickErrorCheck(): Promise<boolean> {
    console.log('⚠️  Running quick error handling check...');
    this.results = [];

    const criticalScenarios = this.createErrorScenarios().filter(s => s.critical).slice(0, 3);
    
    for (const scenario of criticalScenarios) {
      await this.runScenario(scenario);
    }

    const criticalFailures = this.results.filter(r => r.critical && r.status === 'FAIL').length;
    const healthy = criticalFailures === 0;

    console.log(`⚠️  Quick Error Check: ${healthy ? '✅ HEALTHY' : '❌ COMPROMISED'}`);
    
    if (!healthy) {
      console.log('🚨 Critical error handling issues detected:');
      this.results
        .filter(r => r.critical && r.status === 'FAIL')
        .forEach(result => {
          console.log(`  • ${result.scenario}: ${result.error}`);
        });
    }

    return healthy;
  }
}

// Export for use in CI/CD and other test suites
export { ErrorHandlingValidator, type ErrorTestResult, type ErrorHandlingSuite };

// Browser console integration
if (typeof window !== 'undefined') {
  const errorValidator = new ErrorHandlingValidator();
  
  (window as any).runErrorHandlingTests = () => errorValidator.runComprehensiveErrorHandlingTests();
  (window as any).runQuickErrorCheck = () => errorValidator.runQuickErrorCheck();
}