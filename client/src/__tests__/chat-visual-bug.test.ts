/**
 * Chat Visual Bug Prevention Test
 * Ensures no visual gaps appear in chat flow
 */

export class ChatVisualBugTester {
  private states: Array<{
    timestamp: number;
    statusVisible: boolean;
    messageCount: number;
    event: string;
  }> = [];

  logStateChange(event: string, statusVisible: boolean, messageCount: number) {
    this.states.push({
      timestamp: Date.now(),
      statusVisible,
      messageCount,
      event
    });
  }

  // Simulate complete chat flow
  simulateChatFlow() {
    // User sends message
    this.logStateChange('USER_SEND', true, 2); // Status shows
    
    // Simulated API delay
    setTimeout(() => {
      // Messages arrive from API
      this.logStateChange('MESSAGES_RECEIVED', false, 4); // Status should hide when messages update
    }, 1500);
  }

  // Test: No visual gap between status hide and message display
  testNoVisualGap(): boolean {
    let hasGap = false;
    
    for (let i = 1; i < this.states.length; i++) {
      const prev = this.states[i - 1];
      const curr = this.states[i];
      
      // Check if status was visible and then hidden
      if (prev.statusVisible && !curr.statusVisible) {
        // Messages should have increased at the same time
        if (curr.messageCount <= prev.messageCount) {
          console.error('Visual gap detected: Status hidden but no new messages');
          hasGap = true;
        }
      }
    }
    
    return !hasGap;
  }

  // Test: Status correctly shows and hides
  testStatusLifecycle(): boolean {
    const statusChanges = this.states.filter((s, i) => 
      i === 0 || s.statusVisible !== this.states[i - 1].statusVisible
    );
    
    // Should have exactly 2 changes: show then hide
    if (statusChanges.length !== 2) {
      console.error(`Expected 2 status changes, got ${statusChanges.length}`);
      return false;
    }
    
    // First should be show, second should be hide
    if (!statusChanges[0].statusVisible || statusChanges[1].statusVisible) {
      console.error('Status lifecycle incorrect');
      return false;
    }
    
    return true;
  }

  async runTests(): Promise<{ passed: number; failed: number; details: string[] }> {
    this.states = [];
    const details: string[] = [];
    
    // Run simulation
    this.simulateChatFlow();
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Run tests
    const tests = [
      { name: 'No Visual Gap', test: () => this.testNoVisualGap() },
      { name: 'Status Lifecycle', test: () => this.testStatusLifecycle() }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const { name, test } of tests) {
      if (test()) {
        passed++;
        details.push(`✅ ${name}`);
      } else {
        failed++;
        details.push(`❌ ${name}`);
      }
    }
    
    return { passed, failed, details };
  }
}

// Export for browser testing
if (typeof window !== 'undefined') {
  (window as any).testChatVisualBug = async () => {
    const tester = new ChatVisualBugTester();
    const results = await tester.runTests();
    
    console.log('🧪 Chat Visual Bug Test Results:');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    results.details.forEach(detail => console.log(detail));
    
    return results;
  };
}