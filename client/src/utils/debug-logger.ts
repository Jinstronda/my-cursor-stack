// Production debugging utility for OAuth infinite loading issue
// This will help us capture EXACTLY what happens in production

interface DebugLog {
  timestamp: string;
  event: string;
  data: any;
  url: string;
  userAgent: string;
}

class ProductionDebugger {
  private logs: DebugLog[] = [];
  private maxLogs = 100;

  log(event: string, data?: any) {
    const logEntry: DebugLog = {
      timestamp: new Date().toISOString(),
      event,
      data,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    this.logs.unshift(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Always log to console in production for OAuth debugging
    console.log(`🐛 [${logEntry.timestamp}] ${event}:`, data);
    
    // Store in localStorage for persistence across page reloads
    try {
      localStorage.setItem('oauth_debug_logs', JSON.stringify(this.logs));
    } catch (e) {
      console.warn('Could not store debug logs:', e);
    }
  }

  getLogs(): DebugLog[] {
    return [...this.logs];
  }

  getLogsFromStorage(): DebugLog[] {
    try {
      const stored = localStorage.getItem('oauth_debug_logs');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn('Could not retrieve debug logs:', e);
      return [];
    }
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem('oauth_debug_logs');
  }

  exportLogs(): string {
    const allLogs = [...this.getLogsFromStorage(), ...this.logs];
    return JSON.stringify(allLogs, null, 2);
  }
}

export const debugLogger = new ProductionDebugger();

// OAuth specific logging functions
export const logOAuthEvent = (event: string, data?: any) => {
  debugLogger.log(`OAUTH_${event}`, data);
};

export const logAuthState = (state: any) => {
  debugLogger.log('AUTH_STATE_CHANGE', {
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    hasUser: !!state.user,
    hasSession: !!state.session,
    error: state.error?.message,
    path: window.location.pathname
  });
};

export const logRouteChange = (from: string, to: string) => {
  debugLogger.log('ROUTE_CHANGE', { from, to });
};

export const logComponentMount = (component: string) => {
  debugLogger.log('COMPONENT_MOUNT', { component });
};

export const logComponentUnmount = (component: string) => {
  debugLogger.log('COMPONENT_UNMOUNT', { component });
};