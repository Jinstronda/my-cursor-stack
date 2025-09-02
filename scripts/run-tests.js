#!/usr/bin/env node

/**
 * CI/CD Test Runner Script
 * Executes comprehensive QA pipeline and provides appropriate exit codes
 */

import { MasterTestCoordinator } from '../client/src/__tests__/master-test-coordinator.ts';
import { writeFileSync } from 'fs';

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'full';

async function runTests() {
  const coordinator = new MasterTestCoordinator();
  
  try {
    switch (command) {
      case 'full':
      case 'complete':
        console.log('🚀 Running complete QA pipeline...');
        const pipeline = await coordinator.runCompleteQAPipeline();
        const exitCode = coordinator.getExitCode(pipeline);
        
        // Generate test report
        const report = await coordinator.generateTestReport();
        writeFileSync('test-report.json', report);
        console.log('📄 Test report written to test-report.json');
        
        process.exit(exitCode);
        break;
        
      case 'quick':
      case 'health':
        console.log('⚡ Running quick health check...');
        const health = await coordinator.runQuickHealthCheck();
        
        if (health.healthy) {
          console.log('✅ Quick health check passed');
          process.exit(0);
        } else {
          console.error('❌ Quick health check failed');
          console.error('Critical issues:', health.criticalIssues);
          process.exit(2);
        }
        break;
        
      case 'regression':
        const scenario = args[1] || 'text_editing';
        console.log(`🔍 Running regression check: ${scenario}`);
        const passed = await coordinator.runRegressionCheck(scenario);
        
        if (passed) {
          console.log(`✅ Regression check passed: ${scenario}`);
          process.exit(0);
        } else {
          console.error(`❌ Regression check failed: ${scenario}`);
          process.exit(1);
        }
        break;
        
      case 'help':
        console.log(`
QA Test Runner - Usage:

  node run-tests.js [command] [options]

Commands:
  full, complete    Run complete QA pipeline (default)
  quick, health     Run quick health check only
  regression [type] Run specific regression tests
                   Types: text_editing, project_creation, auth_flow
  help             Show this help message

Examples:
  node run-tests.js                           # Run complete QA pipeline
  node run-tests.js quick                     # Quick health check
  node run-tests.js regression text_editing   # Check text editing regression

Exit Codes:
  0 - All tests passed
  1 - Some tests failed but deployment allowed
  2 - Critical failures, deployment blocked
`);
        process.exit(0);
        break;
        
      default:
        console.error(`Unknown command: ${command}`);
        console.error('Use "node run-tests.js help" for usage information');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test runner failed with error:', error);
    process.exit(3);
  }
}

runTests();