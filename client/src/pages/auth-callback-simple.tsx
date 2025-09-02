/**
 * Simplified auth callback - No complex debugging, just works
 * Handles OAuth callback and redirects cleanly
 */
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase-simple';

export default function AuthCallbackSimple() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔄 Processing OAuth callback...');
        console.log('Current URL:', window.location.href);
        console.log('Hash fragment:', window.location.hash);
        console.log('Search params:', window.location.search);
        
        // Wait for Supabase to process the URL
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try to get session multiple times with backoff
        let session = null;
        let attempts = 0;
        const maxAttempts = 5;
        
        while (!session && attempts < maxAttempts) {
          attempts++;
          console.log(`🔍 Session check attempt ${attempts}/${maxAttempts}...`);
          
          const { data: { session: currentSession }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Session error:', error.message);
          }
          
          if (currentSession) {
            session = currentSession;
            console.log('✅ Session found:', {
              user: currentSession.user?.email,
              expiresAt: currentSession.expires_at
            });
            break;
          }
          
          // Wait before retry
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        if (session) {
          console.log('✅ Authentication successful, redirecting...');
          setLocation('/');
        } else {
          console.log('❌ No session found after all attempts, redirecting to home...');
          setLocation('/');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setLocation('/');
      }
    };

    handleCallback();
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-white/70">Finalizando login...</p>
      </div>
    </div>
  );
}