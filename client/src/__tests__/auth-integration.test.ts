/**
 * Integration tests for authentication system
 * Tests the complete authentication flow including edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useStableAuth } from '@/hooks/use-stable-auth';
import { useSimpleAuth } from '@/hooks/useAuth-simple';
import { AuthTestSuite } from '@/lib/auth-test-utils';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      signInWithOAuth: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          limit: vi.fn()
        }))
      })),
      insert: vi.fn()
    }))
  }
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Authentication System Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useStableAuth Hook', () => {
    it('should handle successful authentication flow', async () => {
      const mockSession = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          created_at: '2023-01-01T00:00:00Z',
          user_metadata: { name: 'Test User' }
        },
        access_token: 'test-token'
      };

      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        bio: null,
        avatar: null,
        location: null,
        website: null,
        isProducer: false,
        planType: 'free',
        firstName: 'Test',
        lastName: 'User',
        profileImageUrl: null,
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date()
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null
            })
          })
        })
      });

      const { result } = renderHook(() => useStableAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.error).toBeNull();
    });

    it('should handle user not found scenario', async () => {
      const mockSession = {
        user: {
          id: 'new-user-id',
          email: 'new@example.com',
          created_at: '2023-01-01T00:00:00Z',
          user_metadata: { name: 'New User' }
        },
        access_token: 'test-token'
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'No rows found' }
            })
          })
        }),
        insert: vi.fn().mockResolvedValue({ error: null })
      });

      const { result } = renderHook(() => useStableAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toBeDefined();
      expect(result.current.user?.email).toBe('new@example.com');
    });

    it('should handle RLS permission errors gracefully', async () => {
      const mockSession = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          created_at: '2023-01-01T00:00:00Z',
          user_metadata: { name: 'Test User' }
        },
        access_token: 'test-token'
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '42501', message: 'permission denied for relation users' }
            })
          })
        })
      });

      const { result } = renderHook(() => useStableAuth(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should still authenticate with auth data fallback
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toBeDefined();
      expect(result.current.user?.email).toBe('test@example.com');
    });
  });

  describe('useSimpleAuth Hook', () => {
    it('should handle authentication state changes', async () => {
      const mockSession = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          created_at: '2023-01-01T00:00:00Z',
          user_metadata: { name: 'Test User' }
        },
        access_token: 'test-token'
      };

      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        bio: null,
        avatar: null,
        location: null,
        website: null,
        isProducer: false,
        planType: 'free',
        firstName: 'Test',
        lastName: 'User',
        profileImageUrl: null,
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date()
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null
            })
          })
        })
      });

      const { result } = renderHook(() => useSimpleAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });

    it('should handle sign in correctly', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' }, session: {} as any },
        error: null
      });

      const { result } = renderHook(() => useSimpleAuth());

      await act(async () => {
        await result.current.signIn('test@example.com', 'password');
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password'
      });
    });
  });

  describe('AuthTestSuite', () => {
    it('should run complete test suite successfully', async () => {
      const mockSession = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          created_at: '2023-01-01T00:00:00Z',
          user_metadata: { name: 'Test User' }
        },
        access_token: 'test-token'
      };

      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        is_producer: false,
        plan_type: 'free'
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null
            }),
            limit: vi.fn().mockReturnValue({
              data: [mockUser],
              error: null
            })
          })
        })
      });

      const testSuite = new AuthTestSuite();
      const results = await testSuite.runCompleteTests();

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.some(r => r.testName === 'Connection Test')).toBe(true);
      expect(results.some(r => r.testName === 'User Profile Test')).toBe(true);
    });
  });

  describe('Auth Flow Scenarios', () => {
    it('should handle complete login flow', async () => {
      const mockSession = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          created_at: '2023-01-01T00:00:00Z',
          user_metadata: { name: 'Test User' }
        },
        access_token: 'test-token'
      };

      const mockUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        is_producer: false,
        plan_type: 'free'
      };

      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockSession.user, session: mockSession },
        error: null
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null
            })
          })
        })
      });

      const { result } = renderHook(() => useStableAuth(), {
        wrapper: createWrapper()
      });

      // Simulate login
      await act(async () => {
        await result.current.signIn('test@example.com', 'password');
      });

      // Verify the authentication flow
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password'
      });
    });
  });
});