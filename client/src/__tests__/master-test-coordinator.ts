/**
 * Master Test Coordinator
 * Orchestrates all test suites and provides comprehensive QA pipeline
 */

import { APIIntegrationTestRunner } from './api-integration.test';
import { DatabaseHealthTester } from './database-health.test';
import { CoreFunctionalitySmokeTests } from './smoke-tests.test';
import { AuthenticationRegressionTests } from './auth-regression.test';
import { ProjectCRUDValidator } from './project-crud.test';
import { ErrorHandlingValidator } from './error-handling.test';

interface TestSuiteResult {
  suiteName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  executionTime: number;
  passed: number;
  failed: number;
  critical?: number;
  error?: string;
  details?: any;
}

interface QAPipelineResult {
  totalSuites: number;
  totalTests: number;
  overallStatus: 'PASS' | 'FAIL' | 'PARTIAL';
  executionTime: number;
  canDeploy: boolean;
  criticalIssues: number;
  suiteResults: TestSuiteResult[];
  summary: {
    databaseHealth: boolean;
    authSystemHealth: boolean;
    crudIntegrity: boolean;
    errorHandling: boolean;
    smokeTestsPassed: boolean;
  };
}

export class MasterTestCoordinator {
  private baseUrl = 'http://localhost:3000';
  private testResults: TestSuiteResult[] = [];

  async runSuite<T>(
    suiteName: string,
    testRunner: () => Promise<T>,
    validator: (result: T) => { passed: number; failed: number; critical?: number; canDeploy?: boolean }
  ): Promise<TestSuiteResult> {
    const startTime = Date.now();
    
    try {
      console.log(`\n🧪 Running ${suiteName}...`);
      const result = await testRunner();
      const validation = validator(result);
      
      const suiteResult: TestSuiteResult = {
        suiteName,
        status: validation.failed === 0 ? 'PASS' : 'FAIL',
        executionTime: Date.now() - startTime,
        passed: validation.passed,
        failed: validation.failed,
        critical: validation.critical,
        details: result
      };
      
      this.testResults.push(suiteResult);
      console.log(`✅ ${suiteName} completed: ${validation.passed} passed, ${validation.failed} failed`);
      
      return suiteResult;
    } catch (error) {
      const suiteResult: TestSuiteResult = {
        suiteName,
        status: 'FAIL',
        executionTime: Date.now() - startTime,
        passed: 0,
        failed: 1,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      this.testResults.push(suiteResult);
      console.error(`❌ ${suiteName} failed with error:`, error);
      
      return suiteResult;
    }
  }

  async runCompleteQAPipeline(): Promise<QAPipelineResult> {
    console.log('🚀 Starting Complete QA Pipeline...');
    console.log('==================================');
    this.testResults = [];
    const pipelineStartTime = Date.now();

    // Phase 1: Infrastructure Health Checks (Critical)
    console.log('\n📊 PHASE 1: Infrastructure Health Checks');
    console.log('=========================================');
    
    const databaseHealth = await this.runSuite(
      'Database Health Check',
      () => new DatabaseHealthTester().runComprehensiveHealthCheck(),
      (result) => ({
        passed: result.errorCount === 0 ? 5 : 0,
        failed: result.errorCount,
        canDeploy: result.errorCount === 0
      })
    );

    const smokeTests = await this.runSuite(
      'Core Functionality Smoke Tests',
      () => new CoreFunctionalitySmokeTests().runAllSmokeTests(),
      (result) => ({
        passed: result.passed,
        failed: result.failed,
        critical: result.critical,
        canDeploy: result.canDeploy
      })
    );

    // Phase 2: Authentication & Security (Critical)
    console.log('\n🔐 PHASE 2: Authentication & Security');
    console.log('====================================');
    
    const authTests = await this.runSuite(
      'Authentication Regression Tests',
      () => new AuthenticationRegressionTests().runFullAuthRegressionSuite(),
      (result) => ({
        passed: result.passed,
        failed: result.failed,
        canDeploy: result.authSystemHealthy
      })
    );

    // Phase 3: API Integration Tests (Critical)
    console.log('\n🌐 PHASE 3: API Integration Tests');
    console.log('=================================');
    
    const apiTests = await this.runSuite(
      'API Integration Tests',
      () => APIIntegrationTestRunner.runCriticalTests(),
      (result) => ({
        passed: result.passed,
        failed: result.failed,
        critical: result.critical,
        canDeploy: result.critical === 0
      })
    );

    // Phase 4: Data Operations (Critical)
    console.log('\n📁 PHASE 4: Data Operations');
    console.log('===========================');
    
    const crudTests = await this.runSuite(
      'Project CRUD Operations',
      () => new ProjectCRUDValidator().runFullCRUDValidation(),
      (result) => ({
        passed: result.passed,
        failed: result.failed,
        canDeploy: result.crudIntegrity
      })
    );

    // Phase 5: Error Handling & Recovery (Important)
    console.log('\n⚠️  PHASE 5: Error Handling & Recovery');
    console.log('====================================');
    
    const errorTests = await this.runSuite(
      'Error Handling Tests',
      () => new ErrorHandlingValidator().runComprehensiveErrorHandlingTests(),
      (result) => ({
        passed: result.passed,
        failed: result.failed,
        critical: result.criticalFailures,
        canDeploy: result.errorHandlingHealthy
      })
    );

    // Calculate overall results
    const totalExecutionTime = Date.now() - pipelineStartTime;
    const totalTests = this.testResults.reduce((sum, result) => sum + result.passed + result.failed, 0);
    const totalPassed = this.testResults.reduce((sum, result) => sum + result.passed, 0);
    const totalFailed = this.testResults.reduce((sum, result) => sum + result.failed, 0);
    const criticalIssues = this.testResults.reduce((sum, result) => sum + (result.critical || 0), 0);
    
    const criticalSuitesFailed = this.testResults.filter(r => 
      ['Database Health Check', 'Core Functionality Smoke Tests', 'Authentication Regression Tests', 'API Integration Tests', 'Project CRUD Operations']
      .includes(r.suiteName) && r.status === 'FAIL'
    ).length;

    const canDeploy = criticalSuitesFailed === 0 && criticalIssues === 0;
    const overallStatus = totalFailed === 0 ? 'PASS' : (canDeploy ? 'PARTIAL' : 'FAIL');

    const pipeline: QAPipelineResult = {
      totalSuites: this.testResults.length,
      totalTests,
      overallStatus,
      executionTime: totalExecutionTime,
      canDeploy,
      criticalIssues,
      suiteResults: this.testResults,
      summary: {
        databaseHealth: databaseHealth.status === 'PASS',
        authSystemHealth: authTests.status === 'PASS',
        crudIntegrity: crudTests.status === 'PASS',
        errorHandling: errorTests.status === 'PASS',
        smokeTestsPassed: smokeTests.status === 'PASS'
      }
    };

    this.logPipelineResults(pipeline);
    return pipeline;
  }

  async runQuickHealthCheck(): Promise<{
    healthy: boolean;
    criticalIssues: string[];
    canDeploy: boolean;
  }> {
    console.log('⚡ Running Quick Health Check...');
    this.testResults = [];

    const quickTests = [
      {
        name: 'Database Connectivity',
        test: () => new DatabaseHealthTester().runQuickSmokeTest()
      },
      {
        name: 'Critical Smoke Tests',
        test: () => new CoreFunctionalitySmokeTests().runCriticalSmokeTests()
      },
      {
        name: 'Auth System Check',
        test: () => new AuthenticationRegressionTests().runQuickAuthCheck()
      },
      {
        name: 'Error Handling Check',
        test: () => new ErrorHandlingValidator().runQuickErrorCheck()
      }
    ];

    const results = await Promise.all(
      quickTests.map(async ({ name, test }) => {
        try {
          const result = await test();
          return { name, passed: result, error: null };
        } catch (error) {
          return { 
            name, 
            passed: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      })
    );

    const criticalIssues = results
      .filter(r => !r.passed)
      .map(r => `${r.name}: ${r.error || 'Failed'}`);

    const healthy = criticalIssues.length === 0;
    
    console.log(`⚡ Quick Health Check: ${healthy ? '✅ HEALTHY' : '❌ ISSUES DETECTED'}`);
    
    if (!healthy) {
      console.log('🚨 Critical issues found:');
      criticalIssues.forEach(issue => console.log(`  • ${issue}`));
    }

    return {
      healthy,
      criticalIssues,
      canDeploy: healthy
    };
  }

  // Test for specific regression scenarios
  async runRegressionCheck(scenarioName: string): Promise<boolean> {
    console.log(`🔍 Running regression check: ${scenarioName}`);
    
    switch (scenarioName.toLowerCase()) {
      case 'text_editing':
        const smokeTests = new CoreFunctionalitySmokeTests();
        try {
          const result = await smokeTests.testTextEditingRegression();
          console.log(`🔍 Text Editing Regression: ${result.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
          return result.status === 'PASS';
        } catch (error) {
          console.error(`❌ Text Editing Regression failed:`, error);
          return false;
        }

      case 'project_creation':
        const apiTests = new APIIntegrationTestRunner();
        try {
          const results = await APIIntegrationTestRunner.runCriticalTests();
          const projectCreationPassed = results.critical === 0;
          console.log(`🔍 Project Creation Regression: ${projectCreationPassed ? '✅ PASS' : '❌ FAIL'}`);
          return projectCreationPassed;
        } catch (error) {
          console.error(`❌ Project Creation Regression failed:`, error);
          return false;
        }

      case 'auth_flow':
        const authTests = new AuthenticationRegressionTests();
        try {
          const result = await authTests.runQuickAuthCheck();
          console.log(`🔍 Auth Flow Regression: ${result ? '✅ PASS' : '❌ FAIL'}`);
          return result;
        } catch (error) {
          console.error(`❌ Auth Flow Regression failed:`, error);
          return false;
        }

      default:
        console.warn(`⚠️  Unknown regression scenario: ${scenarioName}`);
        return false;
    }
  }

  private logPipelineResults(pipeline: QAPipelineResult): void {
    console.log('\n🎯 QA PIPELINE COMPLETE');
    console.log('=======================');
    console.log(`📊 Total Suites: ${pipeline.totalSuites}`);
    console.log(`🧪 Total Tests: ${pipeline.totalTests}`);
    console.log(`✅ Overall Status: ${pipeline.overallStatus}`);
    console.log(`⏱️  Total Execution Time: ${(pipeline.executionTime / 1000).toFixed(2)}s`);
    console.log(`🚀 Can Deploy: ${pipeline.canDeploy ? 'YES' : 'NO'}`);
    console.log(`🚨 Critical Issues: ${pipeline.criticalIssues}`);

    console.log('\n📊 System Health Summary:');
    console.log('=========================');
    console.log(`🗄️  Database Health: ${pipeline.summary.databaseHealth ? '✅ HEALTHY' : '❌ ISSUES'}`);
    console.log(`🔐 Auth System: ${pipeline.summary.authSystemHealth ? '✅ HEALTHY' : '❌ ISSUES'}`);
    console.log(`📁 CRUD Operations: ${pipeline.summary.crudIntegrity ? '✅ WORKING' : '❌ BROKEN'}`);
    console.log(`⚠️  Error Handling: ${pipeline.summary.errorHandling ? '✅ WORKING' : '❌ ISSUES'}`);
    console.log(`🔥 Smoke Tests: ${pipeline.summary.smokeTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);

    console.log('\n📋 Suite Results:');
    console.log('=================');
    
    pipeline.suiteResults.forEach(result => {
      const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
      const timeString = `${(result.executionTime / 1000).toFixed(2)}s`;
      console.log(`${statusIcon} ${result.suiteName} (${timeString})`);
      console.log(`    Passed: ${result.passed}, Failed: ${result.failed}${result.critical ? `, Critical: ${result.critical}` : ''}`);
      
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });

    if (!pipeline.canDeploy) {
      console.log('\n🚨 DEPLOYMENT BLOCKED');
      console.log('=====================');
      console.log('Critical issues must be resolved before deployment:');
      
      const criticalFailures = pipeline.suiteResults.filter(r => 
        r.status === 'FAIL' && ['Database Health Check', 'Core Functionality Smoke Tests', 'API Integration Tests'].includes(r.suiteName)
      );
      
      criticalFailures.forEach(failure => {
        console.log(`  • ${failure.suiteName}: ${failure.error || `${failure.failed} failed tests`}`);
      });
    } else if (pipeline.overallStatus === 'PARTIAL') {
      console.log('\n⚠️  PARTIAL SUCCESS');
      console.log('==================');
      console.log('Non-critical issues detected - review recommended:');
      
      const nonCriticalFailures = pipeline.suiteResults.filter(r => 
        r.status === 'FAIL' && !['Database Health Check', 'Core Functionality Smoke Tests', 'API Integration Tests'].includes(r.suiteName)
      );
      
      nonCriticalFailures.forEach(failure => {
        console.log(`  • ${failure.suiteName}: ${failure.failed} failed tests`);
      });
      
      console.log('\n🚀 Deployment allowed but monitor for issues.');
    } else {
      console.log('\n🎉 ALL TESTS PASSED - READY FOR DEPLOYMENT!');
      console.log('============================================');
      console.log('All systems are healthy and functioning correctly.');
    }
  }

  // CI/CD Integration Methods
  async generateTestReport(): Promise<string> {
    const pipeline = await this.runCompleteQAPipeline();
    
    const report = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      status: pipeline.overallStatus,
      canDeploy: pipeline.canDeploy,
      summary: {
        totalSuites: pipeline.totalSuites,
        totalTests: pipeline.totalTests,
        executionTime: pipeline.executionTime,
        criticalIssues: pipeline.criticalIssues
      },
      systemHealth: pipeline.summary,
      suiteResults: pipeline.suiteResults.map(result => ({
        name: result.suiteName,
        status: result.status,
        passed: result.passed,
        failed: result.failed,
        critical: result.critical,
        executionTime: result.executionTime,
        error: result.error
      }))
    };

    return JSON.stringify(report, null, 2);
  }

  // Export exit codes for CI/CD
  getExitCode(pipeline: QAPipelineResult): number {
    if (pipeline.canDeploy) {
      return pipeline.overallStatus === 'PASS' ? 0 : 1; // 0 = success, 1 = warnings
    } else {
      return 2; // Critical failures
    }
  }
}

// Browser console integration
if (typeof window !== 'undefined') {
  const coordinator = new MasterTestCoordinator();
  
  (window as any).runCompleteQA = () => coordinator.runCompleteQAPipeline();
  (window as any).runQuickHealthCheck = () => coordinator.runQuickHealthCheck();
  (window as any).checkTextEditingRegression = () => coordinator.runRegressionCheck('text_editing');
  (window as any).checkProjectCreationRegression = () => coordinator.runRegressionCheck('project_creation');
  (window as any).generateTestReport = () => coordinator.generateTestReport();
}

// Export for Node.js CI/CD usage (already exported at class declaration)