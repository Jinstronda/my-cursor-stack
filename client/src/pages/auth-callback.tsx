import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebug = (message: string) => {
    console.log(message);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    if (!supabase) {
      addDebug('❌ Supabase not initialized');
      setLocation('/');
      return;
    }

    addDebug('🔄 Processing OAuth callback...');
    addDebug(`Current URL: ${window.location.href}`);
    addDebug(`Hash fragment: ${window.location.hash}`);
    addDebug(`Path: ${window.location.pathname}`);
    addDebug(`Search: ${window.location.search}`);

    const processOAuthCallback = async () => {
      try {
        addDebug('⏳ Waiting for Supabase to process hash...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        addDebug('🔍 Checking session...');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          addDebug(`❌ Session error: ${error.message}`);
          setIsProcessing(false);
          return;
        }

        if (data.session) {
          addDebug('✅ Session found! Redirecting...');
          addDebug(`User: ${data.session.user?.email}`);
          setIsProcessing(false);
          setLocation('/');
          return;
        }

        addDebug('❌ No session found, trying manual processing...');
        
        // Try manual processing
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        addDebug(`Access token found: ${!!accessToken}`);
        addDebug(`Refresh token found: ${!!refreshToken}`);
        
        if (accessToken && refreshToken) {
          addDebug('🔧 Attempting manual session setup...');
          
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (sessionError) {
            addDebug(`❌ Manual session error: ${sessionError.message}`);
          } else if (sessionData.session) {
            addDebug('✅ Manual session setup successful!');
            setIsProcessing(false);
            setLocation('/');
            return;
          }
        }
        
        addDebug('❌ All attempts failed, redirecting to home...');
        setIsProcessing(false);
        setTimeout(() => setLocation('/'), 5000); // Wait 5 seconds to see debug
        
      } catch (error: any) {
        addDebug(`💥 Fatal error: ${error.message || error}`);
        setIsProcessing(false);
        setTimeout(() => setLocation('/'), 5000);
      }
    };

    processOAuthCallback();
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="text-center space-y-4 mb-8">
          {isProcessing ? (
            <>
              <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto"></div>
              <p className="text-white/70">Finalizando login...</p>
            </>
          ) : (
            <p className="text-white/70">Processo finalizado. Redirecionando...</p>
          )}
        </div>
        
        {/* Debug panel */}
        <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
          <h3 className="text-white font-bold mb-2">Debug Info:</h3>
          <div className="text-xs text-green-400 font-mono space-y-1">
            {debugInfo.map((info, i) => (
              <div key={i}>{info}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}