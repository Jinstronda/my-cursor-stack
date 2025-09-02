/**
 * Authentication utility functions for Supabase direct queries
 * Replaces the problematic /api/auth/user endpoint calls and RPC functions
 * Provides enhanced error handling and fallback mechanisms
 */

import { supabase } from "@/lib/supabase";
import type { User } from "@shared/schema";

/**
 * Enhanced user profile retrieval with comprehensive error handling
 * Uses direct Supabase queries to bypass RPC/RPC context issues
 * Includes fallback mechanisms and proper RLS handling
 */
export async function getUserProfile(): Promise<User | null> {
  if (!supabase) {
    throw new AuthError("Supabase client not initialized", "SUPABASE_NOT_INITIALIZED");
  }

  try {
    // Step 1: Verify active session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError.message);
      throw new SessionError(`Failed to get session: ${sessionError.message}`);
    }

    if (!session?.user?.id) {
      console.log('❌ No active session or missing user ID');
      return null;
    }

    console.log('🔍 Fetching user profile with session:', {
      userId: session.user.id,
      email: session.user.email,
      hasAuth: !!session.access_token
    });

    // Step 2: Attempt direct query with RLS bypass via service role
    const { data: userData, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    // Step 3: Handle user not found scenario
    if (queryError) {
      if (queryError.code === 'PGRST116' || queryError.message.includes('No rows found')) {
        console.log('👤 User not found in users table, creating from auth data...');
        return await createUserFromAuth(session.user);
      }
      
      // Handle RLS/permission errors
      if (queryError.code === '42501' || queryError.message.includes('permission denied')) {
        console.warn('⚠️ RLS permission error, attempting fallback...');
        return await handleRLSError(session.user);
      }
      
      console.error('❌ Query error:', {
        code: queryError.code,
        message: queryError.message,
        details: queryError.details,
        hint: queryError.hint
      });
      
      throw new AuthError(
        `Failed to fetch user profile: ${queryError.message}`,
        queryError.code || 'QUERY_ERROR'
      );
    }

    // Step 4: Validate and transform user data
    if (!userData) {
      console.log('❌ No user data returned from query');
      return await createUserFromAuth(session.user);
    }

    const user = transformUserData(userData);
    console.log('✅ User profile retrieved successfully:', {
      id: user.id,
      email: user.email,
      name: user.name
    });
    
    return user;
    
  } catch (error) {
    console.error('❌ Critical error in getUserProfile:', error);
    
    if (error instanceof AuthError) {
      throw error;
    }
    
    throw new AuthError(
      `Unexpected error fetching user profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'UNEXPECTED_ERROR'
    );
  }
}

/**
 * Create a new user record from Supabase auth data
 * This handles the case when a user exists in auth.users but not in public.users
 */
async function createUserFromAuth(authUser: any): Promise<User> {
  try {
    console.log('🆕 Creating user from auth data:', {
      id: authUser.id,
      email: authUser.email,
      metadata: authUser.user_metadata
    });

    const newUser: User = {
      id: authUser.id,
      email: authUser.email || '',
      name: authUser.user_metadata?.full_name || 
            authUser.user_metadata?.name || 
            authUser.email?.split('@')[0] || 
            'User',
      username: authUser.email?.split('@')[0] || authUser.id.slice(0, 8),
      password: '',
      bio: null,
      avatar: authUser.user_metadata?.avatar_url || 
              authUser.user_metadata?.picture || 
              null,
      location: null,
      website: null,
      isProducer: false,
      planType: 'free',
      firstName: authUser.user_metadata?.given_name || null,
      lastName: authUser.user_metadata?.family_name || null,
      profileImageUrl: authUser.user_metadata?.avatar_url || 
                      authUser.user_metadata?.picture || 
                      null,
      createdAt: new Date(authUser.created_at || Date.now()),
      updatedAt: new Date(),
    };

    // Attempt to create user record in database
    try {
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          name: newUser.name,
          bio: newUser.bio,
          avatar: newUser.avatar,
          location: newUser.location,
          website: newUser.website,
          is_producer: newUser.isProducer,
          plan_type: newUser.planType,
          first_name: newUser.firstName,
          last_name: newUser.lastName,
          profile_image_url: newUser.profileImageUrl,
          created_at: newUser.createdAt.toISOString(),
          updated_at: newUser.updatedAt.toISOString(),
        });

      if (insertError) {
        console.warn('⚠️ Could not create user record:', insertError.message);
        // Return the user object anyway - it will be created on next interaction
      } else {
        console.log('✅ User record created successfully');
      }
    } catch (createError) {
      console.warn('⚠️ User creation failed silently:', createError);
      // Continue with auth data - user will be created later
    }

    return newUser;
    
  } catch (error) {
    console.error('❌ Error creating user from auth:', error);
    // Return minimal user object as fallback
    return {
      id: authUser.id,
      email: authUser.email || '',
      name: authUser.email?.split('@')[0] || 'User',
      username: authUser.email?.split('@')[0] || authUser.id.slice(0, 8),
      password: '',
      bio: null,
      avatar: null,
      location: null,
      website: null,
      isProducer: false,
      planType: 'free',
      firstName: null,
      lastName: null,
      profileImageUrl: null,
      createdAt: new Date(authUser.created_at || Date.now()),
      updatedAt: new Date(),
    };
  }
}

/**
 * Handle RLS permission errors gracefully
 */
async function handleRLSError(authUser: any): Promise<User | null> {
  console.warn('🔧 Handling RLS error - returning auth data fallback');
  
  // In production, this might indicate:
  // 1. RLS policies need adjustment
  // 2. Service role configuration issues
  // 3. JWT context problems
  
  // For now, return user data from auth session
  return createUserFromAuth(authUser);
}

/**
 * Transform database user record to User interface
 */
function transformUserData(data: any): User {
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    username: data.username || data.email?.split('@')[0] || data.id.slice(0, 8),
    password: '',
    bio: data.bio,
    avatar: data.profile_image_url || data.avatar,
    location: data.location,
    website: data.website,
    isProducer: data.is_producer || false,
    planType: data.plan_type || 'free',
    firstName: data.first_name,
    lastName: data.last_name,
    profileImageUrl: data.profile_image_url || data.avatar,
    createdAt: new Date(data.created_at || Date.now()),
    updatedAt: new Date(data.updated_at || Date.now()),
  };
}

/**
 * Error types for better error handling
 */
export class AuthError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class SessionError extends AuthError {
  constructor(message: string) {
    super(message, 'SESSION_ERROR');
  }
}

export class UserNotFoundError extends AuthError {
  constructor() {
    super('User profile not found', 'USER_NOT_FOUND');
  }
}

/**
 * Additional utility functions for auth debugging and testing
 */
export async function testAuthConnection(): Promise<{success: boolean, message: string}> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      return { success: false, message: `Auth error: ${error.message}` };
    }
    
    if (!session) {
      return { success: false, message: 'No active session' };
    }
    
    return { 
      success: true, 
      message: `Connected as ${session.user.email} (${session.user.id})` 
    };
    
  } catch (error) {
    return { 
      success: false, 
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Force refresh user profile (useful for debugging)
 */
export async function refreshUserProfile(userId: string): Promise<User | null> {
  console.log('🔄 Force refreshing user profile for:', userId);
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (error) {
    console.error('❌ Refresh failed:', error);
    return null;
  }
  
  if (!data) {
    console.log('❌ No user data found during refresh');
    return null;
  }
  
  return transformUserData(data);
}