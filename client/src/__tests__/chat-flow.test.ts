/**
 * Chat Flow Tests
 * Ensures smooth conversation experience without visual bugs
 */

interface ChatState {
  isStatusVisible: boolean;
  status: string;
  type: 'thinking' | 'generating' | 'analyzing';
  isCompleted: boolean;
  messages: Array<{ id: number; content: string; role: 'user' | 'assistant' }>;
}

class ChatFlowTester {
  private state: ChatState = {
    isStatusVisible: false,
    status: "",
    type: 'thinking',
    isCompleted: false,
    messages: []
  };

  private events: Array<{ timestamp: number; event: string; data: any }> = [];

  logEvent(event: string, data: any) {
    this.events.push({
      timestamp: Date.now(),
      event,
      data
    });
  }

  // Simulate user sending a message
  sendMessage(content: string) {
    this.logEvent('USER_SEND_MESSAGE', { content });
    
    // Status should become visible immediately
    this.state.isStatusVisible = true;
    this.state.status = "Pensando...";
    this.state.type = 'thinking';
    this.state.isCompleted = false;
    
    this.logEvent('STATUS_SHOW', this.state);
    
    // Simulate API call
    setTimeout(() => {
      this.receiveAIResponse(content);
    }, Math.random() * 2000 + 1000); // 1-3 seconds
  }

  private receiveAIResponse(userMessage: string) {
    this.logEvent('API_RESPONSE_RECEIVED', { userMessage });
    
    // Add user message
    this.state.messages.push({
      id: this.state.messages.length + 1,
      content: userMessage,
      role: 'user'
    });
    
    // Add AI response
    this.state.messages.push({
      id: this.state.messages.length + 1,
      content: `Resposta da IA para: ${userMessage}`,
      role: 'assistant'
    });
    
    // Hide status immediately when messages arrive
    this.state.isStatusVisible = false;
    this.state.status = "";
    
    this.logEvent('STATUS_HIDE', this.state);
    this.logEvent('MESSAGES_UPDATED', { messageCount: this.state.messages.length });
  }

  // Test: No visual gaps during conversation
  testNoVisualGaps(): boolean {
    const statusEvents = this.events.filter(e => 
      e.event === 'STATUS_SHOW' || e.event === 'STATUS_HIDE'
    );
    
    const messageEvents = this.events.filter(e => 
      e.event === 'MESSAGES_UPDATED'
    );
    
    // For each message sent, status should show and then hide when messages update
    let violations = 0;
    
    for (let i = 0; i < statusEvents.length; i += 2) {
      const showEvent = statusEvents[i];
      const hideEvent = statusEvents[i + 1];
      
      if (!showEvent || !hideEvent) {
        violations++;
        continue;
      }
      
      if (showEvent.event !== 'STATUS_SHOW' || hideEvent.event !== 'STATUS_HIDE') {
        violations++;
      }
      
      // Check if there's a corresponding message update
      const correspondingMessageUpdate = messageEvents.find(e => 
        e.timestamp >= showEvent.timestamp && e.timestamp <= hideEvent.timestamp + 100
      );
      
      if (!correspondingMessageUpdate) {
        violations++;
      }
    }
    
    return violations === 0;
  }

  // Test: Status timing is appropriate
  testStatusTiming(): boolean {
    const statusShows = this.events.filter(e => e.event === 'STATUS_SHOW');
    const statusHides = this.events.filter(e => e.event === 'STATUS_HIDE');
    
    if (statusShows.length !== statusHides.length) {
      return false;
    }
    
    for (let i = 0; i < statusShows.length; i++) {
      const duration = statusHides[i].timestamp - statusShows[i].timestamp;
      
      // Status should be visible for at least 500ms but not more than 5 seconds
      if (duration < 500 || duration > 5000) {
        return false;
      }
    }
    
    return true;
  }

  runTests(): { passed: number; failed: number; results: Array<{ test: string; passed: boolean }> } {
    const results = [];
    
    // Reset state
    this.state = {
      isStatusVisible: false,
      status: "",
      type: 'thinking',
      isCompleted: false,
      messages: []
    };
    this.events = [];
    
    // Simulate conversation
    this.sendMessage("Olá");
    
    // Wait for async operations
    return new Promise((resolve) => {
      setTimeout(() => {
        this.sendMessage("Como você está?");
        
        setTimeout(() => {
          this.sendMessage("Vamos criar um filme");
          
          setTimeout(() => {
            const testResults = [
              { test: 'No Visual Gaps', passed: this.testNoVisualGaps() },
              { test: 'Status Timing', passed: this.testStatusTiming() }
            ];
            
            const passed = testResults.filter(r => r.passed).length;
            const failed = testResults.filter(r => !r.passed).length;
            
            resolve({ passed, failed, results: testResults });
          }, 3500);
        }, 3000);
      }, 2500);
    });
  }
}

// Export for use in development
export { ChatFlowTester };

// Console test runner for immediate feedback
if (typeof window !== 'undefined') {
  (window as any).runChatTests = async () => {
    const tester = new ChatFlowTester();
    const results = await tester.runTests();
    
    console.log('🧪 Chat Flow Test Results:');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    
    results.results.forEach(result => {
      console.log(`${result.passed ? '✅' : '❌'} ${result.test}`);
    });
    
    return results;
  };
}