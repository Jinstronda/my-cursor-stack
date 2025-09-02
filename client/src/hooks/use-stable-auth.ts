import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useMemo, useEffect, useState } from "react";
import { useNavigationCoordinator } from "./use-navigation-coordinator";
import { supabase } from "@/lib/supabase";
import { getUserProfile } from "@/lib/auth-utils";
import type { User } from "@shared/schema";
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { logOAuthEvent, logAuthState } from "@/utils/debug-logger";

interface StableAuthReturn {
  user: User | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: any) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithProvider: (provider: 'google' | 'github') => Promise<void>;
}

export function useStableAuth(): StableAuthReturn {
  const { isStable } = useNavigationCoordinator();
  const cachedStateRef = useRef<StableAuthReturn | null>(null);
  const queryClient = useQueryClient();
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Log auth hook initialization
  logOAuthEvent('HOOK_INIT', { 
    isStable, 
    hasSupabase: !!supabase,
    path: window.location.pathname 
  });

  // Enhanced user profile fetching with comprehensive error handling
  const { data: user, error, isLoading: queryLoading, refetch } = useQuery<User>({
    queryKey: ["user-profile", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) {
        console.log('❌ No user ID available for profile fetch');
        throw new Error("No user session");
      }

      if (import.meta.env.VITE_DEBUG_AUTH === 'true') {
        console.log('🔐 Fetching user profile:', { 
          userId: session.user.id,
          email: session.user.email,
          timestamp: new Date().toISOString()
        });
      }

      try {
        // Use enhanced getUserProfile with error handling and fallbacks
        const userData = await getUserProfile();
        
        if (!userData) {
          console.log('❌ No user data returned from getUserProfile');
          throw new Error("User profile not found");
        }

        if (import.meta.env.VITE_DEBUG_AUTH === 'true') {
          console.log('✅ User profile retrieved successfully:', {
            id: userData.id,
            email: userData.email,
            name: userData.name
          });
        }
        
        return userData;
      } catch (error) {
        console.error('❌ Error fetching user profile:', error);
        
        // Provide more detailed error information
        if (error instanceof Error) {
          throw new Error(`Failed to fetch user profile: ${error.message}`);
        }
        
        throw new Error("Unknown error fetching user profile");
      }
    },
    enabled: !!session?.user?.id,
    retry: (failureCount, error) => {
      // Retry only on network errors, not on 4xx errors
      const message = error instanceof Error ? error.message : '';
      const shouldRetry = failureCount < 2 && 
        (message.includes('network') || message.includes('timeout'));
      
      if (shouldRetry) {
        console.log(`🔄 Retrying user profile fetch (attempt ${failureCount + 1})...`);
      }
      
      return shouldRetry;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 15 * 60 * 1000, // 15 minutes cache
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
    onError: (error) => {
      console.error('🚨 User profile fetch failed:', {
        error: error.message,
        userId: session?.user?.id,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Listen to Supabase auth changes
  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      logOAuthEvent('AUTH_STATE_CHANGE', { 
        event: _event, 
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email
      });
      
      setSession(session);
      setIsLoading(false);
      
      // Clear user data when session changes
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  // Auth methods
  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error("Supabase not initialized");
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    if (!supabase) throw new Error("Supabase not initialized");
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
    
    if (error) throw error;
  };

  const signOut = async () => {
    if (!supabase) throw new Error("Supabase not initialized");
    
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Clear local cache
    queryClient.clear();
  };

  const signInWithProvider = async (provider: 'google' | 'github') => {
    if (!supabase) {
      logOAuthEvent('ERROR_NO_SUPABASE', { provider });
      throw new Error("Supabase not initialized");
    }

    const redirectUrl = `${window.location.origin}/auth-callback`;
    logOAuthEvent('OAUTH_START', { 
      provider, 
      redirectUrl,
      currentUrl: window.location.href 
    });
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });
    
    if (error) {
      logOAuthEvent('OAUTH_ERROR', { provider, error: error.message });
      throw error;
    }
    
    logOAuthEvent('OAUTH_REDIRECT_INITIATED', { provider, redirectUrl });
  };

  // Handle 401 errors by invalidating cache and clearing auth state
  const is401Error = error && error.message.includes('401');
  
  if (is401Error && session) {
    console.log("🔄 Detected 401 error, signing out...");
    signOut();
  }

  // Create current auth state
  const currentState: StableAuthReturn = useMemo(() => {
    const finalIsLoading = isLoading || queryLoading;
    const authUser = is401Error ? undefined : user;
    const authState = {
      user: authUser,
      isLoading: finalIsLoading,
      isAuthenticated: !!authUser && !!session && !is401Error,
      error: error as Error | null,
      signIn,
      signUp,
      signOut,
      signInWithProvider,
    };
    
    // Debug logging - reduced frequency
    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_AUTH === 'true') {
      console.log('🔐 Auth State:', {
        hasUser: !!authUser,
        hasSession: !!session,
        isAuthenticated: authState.isAuthenticated,
        isLoading: authState.isLoading,
        is401Error,
        errorMessage: error?.message,
        isStable
      });
    }
    
    return authState;
  }, [user, isLoading, queryLoading, error, is401Error, session, isStable]);

  // Log auth state changes
  logAuthState(currentState);

  // During navigation transitions, return cached state to prevent re-renders
  // EXCEPTION: Don't use cached state if we're processing an OAuth callback
  const isAuthCallback = window.location.pathname === '/auth-callback';
  
  if (!isStable && cachedStateRef.current && !isAuthCallback) {
    logOAuthEvent('RETURNING_CACHED_STATE', { isStable, isAuthCallback });
    return cachedStateRef.current;
  }

  // Update cache when stable or when processing auth callback
  if (isStable || isAuthCallback) {
    cachedStateRef.current = currentState;
  }

  return currentState;
}

// Enhanced auth hook with navigation coordination
export function useAuth() {
  return useStableAuth();
}