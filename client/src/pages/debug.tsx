import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { debugLogger } from '@/utils/debug-logger';
import { useAuthContext } from '@/components/AuthProvider';

export default function DebugPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const auth = useAuthContext();

  const refreshLogs = () => {
    const allLogs = [
      ...debugLogger.getLogsFromStorage(),
      ...debugLogger.getLogs()
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setLogs(allLogs);
  };

  useEffect(() => {
    refreshLogs();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(refreshLogs, 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const exportLogs = () => {
    const dataStr = debugLogger.exportLogs();
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `oauth-debug-${new Date().toISOString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const testOAuth = async () => {
    try {
      await auth.signInWithGoogle();
    } catch (error) {
      console.error('Test OAuth error:', error);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🐛 OAuth Debug Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={refreshLogs}>Refresh Logs</Button>
            <Button onClick={exportLogs} variant="outline">Export Logs</Button>
            <Button onClick={() => debugLogger.clearLogs()} variant="destructive">
              Clear Logs
            </Button>
            <Button onClick={testOAuth} variant="secondary">
              Test OAuth Flow
            </Button>
            <Button 
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? "default" : "outline"}
            >
              {autoRefresh ? "Stop" : "Start"} Auto Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Auth Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs space-y-1">
                  <div>Loading: {auth.isLoading ? "🔄" : "✅"}</div>
                  <div>Authenticated: {auth.isAuthenticated ? "✅" : "❌"}</div>
                  <div>Has User: {auth.user ? "✅" : "❌"}</div>
                  <div>Has Error: {auth.error ? "❌" : "✅"}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Current URL</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs break-all">
                  {window.location.href}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Logs Count</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{logs.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Last Event</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs">
                  {logs[0]?.event || "No events"}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Debug Logs ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {logs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No logs yet. Try triggering OAuth flow.
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="border rounded p-3 text-xs font-mono">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-blue-600">{log.event}</span>
                    <span className="text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-gray-700 mb-1">
                    <strong>URL:</strong> {log.url}
                  </div>
                  {log.data && (
                    <div className="text-gray-600">
                      <strong>Data:</strong>
                      <pre className="mt-1 whitespace-pre-wrap bg-gray-100 p-2 rounded">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}