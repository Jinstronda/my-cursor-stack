/**
 * Minimal authentication hook - Maximum simplicity, maximum reliability
 * Direct Supabase queries only - no complex caching or middleware
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-simple';
import type { User } from '@shared/schema';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface MinimalAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useMinimalAuth(): MinimalAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert Supabase user to our User type
  const createUserFromSupabase = (supabaseUser: SupabaseUser): User => {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: supabaseUser.user_metadata?.full_name || 
            supabaseUser.user_metadata?.name || 
            supabaseUser.email?.split('@')[0] || 
            'User',
      username: supabaseUser.email?.split('@')[0] || supabaseUser.id.slice(0, 8),
      password: '', // Not used for OAuth users
      bio: null,
      avatar: supabaseUser.user_metadata?.avatar_url || 
              supabaseUser.user_metadata?.picture || 
              null,
      location: null,
      website: null,
      isProducer: false,
      planType: 'free',
      firstName: supabaseUser.user_metadata?.given_name || null,
      lastName: supabaseUser.user_metadata?.family_name || null,
      profileImageUrl: supabaseUser.user_metadata?.avatar_url || 
                      supabaseUser.user_metadata?.picture || 
                      null,
      createdAt: new Date(supabaseUser.created_at || Date.now()),
      updatedAt: new Date(),
    };
  };

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError.message);
          setError(sessionError.message);
        } else if (session?.user) {
          const userData = createUserFromSupabase(session.user);
          setUser(userData);
          console.log('✅ User authenticated:', userData.email);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, session?.user?.email);
        
        if (session?.user) {
          const userData = createUserFromSupabase(session.user);
          setUser(userData);
          setError(null);
        } else {
          setUser(null);
        }
        
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Google OAuth sign in
  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const redirectUrl = `${window.location.origin}/auth-callback`;
      console.log('🔄 Starting Google OAuth with redirect:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          // Ensure we get the tokens in the URL fragment for client-side apps
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });
      
      if (error) {
        console.error('Google sign-in error:', error.message);
        setError(error.message);
      } else {
        console.log('✅ OAuth initiated successfully:', data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Sign-in error:', message);
      setError(message);
    } finally {
      // Don't set loading false here - let the callback handle it
      // setIsLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign-out error:', error.message);
        setError(error.message);
      } else {
        setUser(null);
        console.log('✅ User signed out');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Sign-out error:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    signInWithGoogle,
    signOut,
  };
}