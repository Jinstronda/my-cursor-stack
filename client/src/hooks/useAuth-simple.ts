import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserProfile } from '@/lib/auth-utils';
import type { User } from '@shared/schema';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: any) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithProvider: (provider: 'google' | 'github') => Promise<void>;
}

export function useSimpleAuth(): AuthState & AuthActions {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null
  });

  // Enhanced user data fetching with comprehensive error handling
  const fetchUserData = async (): Promise<User | null> => {
    try {
      console.log('🔐 Fetching user data with enhanced error handling...');
      
      const userData = await getUserProfile();
      
      if (!userData) {
        console.log('❌ No user data returned');
        return null;
      }

      console.log('✅ User data received:', { 
        id: userData.id, 
        email: userData.email, 
        isAuthenticated: !!userData 
      });
      return userData;
    } catch (error) {
      console.error('❌ Failed to fetch user data:', error);
      
      if (error instanceof Error) {
        setState(prev => ({ 
          ...prev, 
          error: error.message,
          isLoading: false,
          isAuthenticated: false
        }));
      } else {
        setState(prev => ({ 
          ...prev, 
          error: 'Unknown authentication error',
          isLoading: false,
          isAuthenticated: false
        }));
      }
      
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    if (!supabase) {
      setState(prev => ({ ...prev, isLoading: false, error: 'Supabase not initialized' }));
      return;
    }

    let mounted = true;

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (error) {
          setState({ user: null, isLoading: false, isAuthenticated: false, error: error.message });
          return;
        }

        if (session?.user?.id) {
          console.log('🚀 Initial session found, fetching user data...');
          const userData = await fetchUserData();
          if (mounted) {
            setState({
              user: userData,
              isLoading: false,
              isAuthenticated: !!userData,
              error: null
            });
            console.log('🎯 Initial auth state set:', { isAuthenticated: !!userData, userId: userData?.id });
          }
        } else {
          if (mounted) {
            console.log('❌ No initial session found');
            setState({ user: null, isLoading: false, isAuthenticated: false, error: null });
          }
        }
      } catch (error: any) {
        if (mounted) {
          setState({ user: null, isLoading: false, isAuthenticated: false, error: error.message });
        }
      }
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase!.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('🔄 Auth state change:', event, 'hasSession:', !!session, 'hasUserId:', !!session?.user?.id);

        if (event === 'SIGNED_IN' && session?.user?.id) {
          console.log('✅ SIGNED_IN event detected, fetching user data...');
          const userData = await fetchUserData();
          
          setState({
            user: userData,
            isLoading: false,
            isAuthenticated: !!userData,
            error: null
          });
          
          console.log('🎯 Auth state updated:', { isAuthenticated: !!userData, userId: userData?.id });
        } else if (event === 'SIGNED_OUT' || !session) {
          console.log('❌ SIGNED_OUT or no session, clearing auth state');
          setState({ user: null, isLoading: false, isAuthenticated: false, error: null });
        }
      }
    );

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Auth actions
  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
    if (error) throw error;
  };

  const signOut = async () => {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const signInWithProvider = async (provider: 'google' | 'github') => {
    if (!supabase) throw new Error('Supabase not initialized');
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth-callback`
      }
    });
    
    if (error) throw error;
  };

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    signInWithProvider
  };
}