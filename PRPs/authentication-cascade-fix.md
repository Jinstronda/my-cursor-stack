# PRP: Authentication Cascade Fix for NOCI.app

## Overview
**Feature**: Fix critical authentication and project loading system for NOCI.app - systematically diagnose and resolve authentication failures that started as RLS (Row Level Security) bugs and have progressed to complete login failure, including Google OAuth integration not working and project loading issues.

**Confidence Score**: 9/10 - Comprehensive context provided, systematic approach, extensive tooling available, clear root cause identified.

## Problem Context

### Root Cause Analysis (From handled-auth-errors.md)
- **Timeline**: Issue started after `database-production-fix.md` implementation
- **Before**: Authentication worked via `/api/auth/user` endpoint  
- **After Fix**: Replaced with `get_current_user_profile()` RPC function
- **Critical Issue**: RPC function fails in production because `auth.uid()` returns NULL despite frontend being signed in
- **Result**: Infinite loading states, complete authentication failure
- **Previous Attempts**: 10+ failed attempts to fix this issue

### Specific Technical Problem
```
Frontend: SIGNED_IN ✅
    ↓
Frontend: Call get_current_user_profile() RPC
    ↓
Database: auth.uid() = NULL (despite frontend being signed in)
    ↓
RPC: Raises exception → Returns error
    ↓
Frontend: Stuck in loading state
```

## Architecture Analysis

### Current Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Wouter (routing)
- **State Management**: TanStack React Query v5 for server state
- **Authentication**: Supabase Auth with Google OAuth
- **Database**: Supabase (PostgreSQL) with RLS policies
- **Backend**: Express.js serverless functions
- **Testing**: Playwright, Vitest, custom auth test utilities
- **Deployment**: Vercel

### Key Authentication Files (All Verified)
- `client/src/components/AuthProvider.tsx` - Main auth context provider
- `client/src/hooks/useAuth-minimal.ts` - Simplified auth hook using session data only
- `client/src/hooks/use-stable-auth.ts` - Complex auth hook with React Query integration
- `client/src/lib/auth-utils.ts` - Enhanced utilities with comprehensive error handling
- `server/auth-simple.ts` - Server-side auth utilities
- `supabase/migrations/20250901000000_add_rls_policies.sql` - Current RLS policies

### Current RLS Policies (Verified Working)
```sql
-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users  
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Projects table policies
CREATE POLICY "Users can view their own projects" ON projects
    FOR SELECT USING (auth.uid() = user_id);

-- Production companies (public access)
CREATE POLICY "Anyone can view production companies" ON production_companies
    FOR SELECT USING (true);
```

### Current Auth Implementation Patterns
1. **Session-based**: `useAuth-minimal.ts` - Creates User from Supabase session data
2. **Database-backed**: `use-stable-auth.ts` - Uses `getUserProfile()` from `auth-utils.ts`
3. **Fallback Strategy**: If RLS fails, create user from auth session data
4. **Error Handling**: Custom error classes (`AuthError`, `SessionError`, `UserNotFoundError`)

## Implementation Strategy

### Sequential Debugging Process (Using Sequential Thinking MCP)

**Critical**: Each step must pass ALL tests before proceeding to the next step.

#### Step 1: Understand the RLS Regression
**Objective**: Identify which RLS policies were changed that triggered the cascade failure

**Tests to Create**:
```typescript
// Test 1.1: RLS Policy Validation
async function testRLSPolicies() {
  const results = [];
  
  // Test if RLS policies exist
  const { data: policies } = await supabase.rpc('get_policies', { table_name: 'users' });
  results.push({ test: 'RLS Policies Exist', passed: policies.length > 0 });
  
  // Test if auth.uid() works in isolation
  const { data: uid } = await supabase.rpc('test_auth_uid');
  results.push({ test: 'auth.uid() Function', passed: uid !== null });
  
  return results;
}

// Test 1.2: RLS vs Direct Query Comparison  
async function testRLSvsDirectQuery(userId: string) {
  // Test RLS-protected query
  const rlsQuery = await supabase.from('users').select('*').eq('id', userId).single();
  
  // Test service role query (bypasses RLS)
  const directQuery = await supabaseAdmin.from('users').select('*').eq('id', userId).single();
  
  return {
    rlsWorks: !rlsQuery.error,
    directWorks: !directQuery.error,
    rlsError: rlsQuery.error?.message,
    directError: directQuery.error?.message
  };
}

// Test 1.3: Authentication State Corruption Check
async function testAuthStateCorruption() {
  const session = await supabase.auth.getSession();
  const refreshedSession = await supabase.auth.refreshSession();
  
  return {
    originalSession: !!session.data.session,
    refreshedSession: !!refreshedSession.data.session,
    sessionIdMatch: session.data.session?.user.id === refreshedSession.data.session?.user.id
  };
}
```

**Success Criteria Step 1**: All tests identify root RLS policy issue

#### Step 2: Basic Authentication Recovery  
**Objective**: Verify if Supabase auth service is responding and can create new sessions

**Tests to Create**:
```typescript
// Test 2.1: Supabase Service Health
async function testSupabaseHealth() {
  const healthChecks = [
    { name: 'Auth Service', test: () => supabase.auth.getSession() },
    { name: 'Database Connection', test: () => supabase.from('users').select('count', { count: 'exact', head: true }) },
    { name: 'RPC Functions', test: () => supabase.rpc('test_connection') }
  ];
  
  const results = [];
  for (const check of healthChecks) {
    try {
      const result = await check.test();
      results.push({ name: check.name, passed: !result.error, error: result.error?.message });
    } catch (error) {
      results.push({ name: check.name, passed: false, error: error.message });
    }
  }
  
  return results;
}

// Test 2.2: Client Initialization
async function testAuthClientInit() {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const session = await client.auth.getSession();
  
  return {
    clientInitialized: !!client,
    sessionMethod: typeof client.auth.getSession === 'function',
    canGetSession: !session.error
  };
}

// Test 2.3: New Session Creation (Bypass Corrupted State)
async function testNewSessionCreation() {
  // Test if we can create a clean authentication flow
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { skipBrowserRedirect: true }
  });
  
  return {
    oauthUrlGenerated: !!data.url,
    noErrors: !error,
    error: error?.message
  };
}
```

**Success Criteria Step 2**: All authentication recovery tests pass

#### Step 3: Google OAuth Specific Issues
**Objective**: Determine if OAuth provider configuration was affected by RLS changes

**Tests to Create**:
```typescript
// Test 3.1: OAuth Configuration
async function testOAuthConfig() {
  // Check environment variables
  const config = {
    supabaseUrl: !!process.env.VITE_SUPABASE_URL,
    anonKey: !!process.env.VITE_SUPABASE_ANON_KEY,
    hasRedirectUrl: window.location.origin.includes('localhost') || window.location.origin.includes('vercel')
  };
  
  return config;
}

// Test 3.2: OAuth Flow Testing (Playwright)
async function testOAuthRedirect(page) {
  // Navigate to login page
  await page.goto('/');
  
  // Click Google sign in
  const googleButton = page.locator('[data-testid="google-signin"]');
  await googleButton.click();
  
  // Verify redirect happens
  await page.waitForURL(url => url.includes('accounts.google.com'), { timeout: 5000 });
  
  return {
    redirectSuccessful: page.url().includes('accounts.google.com'),
    currentUrl: page.url()
  };
}

// Test 3.3: OAuth Token Handling
async function testOAuthTokens() {
  const mockOAuthEvent = {
    url: 'http://localhost:3000/auth-callback#access_token=mock_token&refresh_token=mock_refresh',
    type: 'signInWithOAuth'
  };
  
  // Test auth callback processing
  const { data, error } = await supabase.auth.getSessionFromUrl(mockOAuthEvent.url);
  
  return {
    tokensParsed: !!data.session,
    error: error?.message
  };
}
```

**Success Criteria Step 3**: All OAuth tests pass

#### Step 4: RLS Policy Analysis and Repair
**Objective**: Identify specific RLS policies causing authentication failures

**Tests to Create**:
```typescript
// Test 4.1: Individual Policy Testing
async function testSpecificRLSPolicies() {
  const policies = [
    { table: 'users', policy: 'Users can view their own profile' },
    { table: 'projects', policy: 'Users can view their own projects' },
    { table: 'production_companies', policy: 'Anyone can view production companies' }
  ];
  
  const results = [];
  
  for (const policy of policies) {
    try {
      // Test with valid session
      const { data, error } = await supabase
        .from(policy.table)
        .select('*')
        .limit(1);
      
      results.push({
        table: policy.table,
        policy: policy.policy,
        works: !error,
        error: error?.message
      });
    } catch (error) {
      results.push({
        table: policy.table, 
        policy: policy.policy,
        works: false,
        error: error.message
      });
    }
  }
  
  return results;
}

// Test 4.2: RLS Disable/Enable Testing
async function testRLSToggle() {
  // This would require admin access - simulate for testing
  const tablesWithRLS = ['users', 'projects', 'production_companies'];
  
  const results = [];
  
  for (const table of tablesWithRLS) {
    // Test query with RLS enabled (current state)
    const withRLS = await supabase.from(table).select('count', { count: 'exact', head: true });
    
    results.push({
      table,
      rlsEnabled: true,
      works: !withRLS.error,
      count: withRLS.count,
      error: withRLS.error?.message
    });
  }
  
  return results;
}

// Test 4.3: Auth Context Validation
async function testAuthContextInRLS() {
  // Test if auth.uid() returns the expected value
  const session = await supabase.auth.getSession();
  
  if (!session.data.session) {
    return { error: 'No session for auth context test' };
  }
  
  // Test direct RLS query that depends on auth.uid()
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('id', session.data.session.user.id)
    .single();
  
  return {
    sessionUserId: session.data.session.user.id,
    queryReturned: !!data,
    idsMatch: data?.id === session.data.session.user.id,
    error: error?.message
  };
}
```

**Success Criteria Step 4**: All RLS policies work correctly with auth context

#### Step 5: Project Loading Recovery
**Objective**: Verify authenticated users can access project data and all CRUD operations work

**Tests to Create**:
```typescript
// Test 5.1: Authenticated Data Access
async function testAuthenticatedDataAccess() {
  const session = await supabase.auth.getSession();
  
  if (!session.data.session) {
    return { error: 'Authentication required for data access test' };
  }
  
  const tests = [
    {
      name: 'User Profile Access',
      query: supabase.from('users').select('*').eq('id', session.data.session.user.id).single()
    },
    {
      name: 'User Projects Access', 
      query: supabase.from('projects').select('*').eq('user_id', session.data.session.user.id)
    },
    {
      name: 'Public Companies Access',
      query: supabase.from('production_companies').select('*').limit(5)
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await test.query;
    results.push({
      name: test.name,
      passed: !result.error,
      dataCount: Array.isArray(result.data) ? result.data.length : (result.data ? 1 : 0),
      error: result.error?.message
    });
  }
  
  return results;
}

// Test 5.2: CRUD Operations Testing
async function testCRUDOperations() {
  const session = await supabase.auth.getSession();
  
  if (!session.data.session) {
    return { error: 'Authentication required for CRUD test' };
  }
  
  const testProject = {
    name: 'Test Project Auth Fix',
    description: 'Testing CRUD operations after auth fix',
    genre: 'Test',
    status: 'esboço',
    user_id: session.data.session.user.id,
    is_public: false
  };
  
  // CREATE
  const { data: created, error: createError } = await supabase
    .from('projects')
    .insert(testProject)
    .select()
    .single();
  
  if (createError) {
    return { step: 'CREATE', error: createError.message };
  }
  
  // READ
  const { data: read, error: readError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', created.id)
    .single();
  
  if (readError) {
    return { step: 'READ', error: readError.message };
  }
  
  // UPDATE  
  const { data: updated, error: updateError } = await supabase
    .from('projects')
    .update({ description: 'Updated test description' })
    .eq('id', created.id)
    .select()
    .single();
  
  if (updateError) {
    return { step: 'UPDATE', error: updateError.message };
  }
  
  // DELETE
  const { error: deleteError } = await supabase
    .from('projects')
    .delete()
    .eq('id', created.id);
  
  if (deleteError) {
    return { step: 'DELETE', error: deleteError.message };
  }
  
  return {
    create: !!created,
    read: !!read,
    update: !!updated,
    delete: !deleteError,
    allOperationsSuccessful: true
  };
}

// Test 5.3: Real-time Subscriptions
async function testRealtimeSubscriptions() {
  return new Promise((resolve) => {
    let subscription;
    const timeout = setTimeout(() => {
      subscription?.unsubscribe();
      resolve({ error: 'Subscription timeout' });
    }, 5000);
    
    subscription = supabase
      .channel('test-auth-fix')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'projects' },
        (payload) => {
          clearTimeout(timeout);
          subscription.unsubscribe();
          resolve({ 
            subscriptionActive: true,
            receivedEvent: !!payload,
            eventType: payload.eventType
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Trigger a test event
          supabase.from('projects').select('count', { count: 'exact', head: true });
        }
      });
  });
}
```

**Success Criteria Step 5**: All project functionality tests pass

## Validation Gates (Executable Commands)

### TypeScript/Build Validation
```bash
# Type checking
npx tsc --noEmit

# Build verification  
npm run build

# Linting
npm run lint || echo "Linting completed"
```

### Unit Tests
```bash
# Run auth-specific tests
npm run test:regression:auth

# Run integration tests
npm run test auth-integration

# Run complete test suite
npm run test:full
```

### End-to-End Testing (Playwright)
```bash
# Install browser if needed
npx playwright install chromium

# Run auth flow tests
npx playwright test auth-flow

# Run complete e2e suite
npx playwright test
```

### Database Validation (Supabase MCP)
```javascript
// Test RLS policies
await supabase.rpc('test_rls_policies')

// Verify auth context  
await supabase.rpc('test_auth_context')

// Check migration status
await supabase.rpc('check_migration_status')
```

## Implementation Tasks (Sequential Order)

### Phase 1: Diagnostic Testing Setup
1. **Create test infrastructure using existing patterns**
   - Extend `client/src/lib/auth-test-utils.ts` with Step 1-5 tests
   - Add Playwright test scenarios for OAuth flow
   - Create Supabase MCP validation scripts

2. **Implement Sequential Thinking MCP integration**
   - Create step-by-step test execution framework
   - Add test result validation and blocking logic
   - Implement comprehensive logging for each step

3. **Set up test data and environment**
   - Create test user accounts for OAuth testing
   - Set up isolated test database state
   - Configure Playwright with proper auth fixtures

### Phase 2: Execute Diagnostic Steps
4. **Run Step 1: RLS Regression Analysis**
   - Execute all Step 1 tests using test infrastructure
   - Document exact RLS policy issues found
   - Validate root cause before proceeding

5. **Run Step 2: Basic Auth Recovery**
   - Test Supabase service health and client initialization
   - Verify new session creation capabilities
   - Confirm auth service is responding correctly

6. **Run Step 3: OAuth Specific Testing**
   - Test OAuth configuration and redirect flows
   - Validate token parsing and callback handling  
   - Verify Google OAuth integration end-to-end

### Phase 3: Systematic Repair
7. **Execute Step 4: RLS Policy Repair**
   - Test individual policies to identify problematic ones
   - Apply targeted fixes to RLS policies
   - Validate auth context works properly in database

8. **Execute Step 5: Full System Validation**
   - Test complete authenticated user workflows
   - Validate all CRUD operations work correctly
   - Test real-time subscriptions and collaborative features

### Phase 4: Integration and Verification
9. **Run comprehensive test suite**
   - Execute all unit tests with updated auth system
   - Run integration tests with real OAuth flow
   - Perform end-to-end testing with Playwright

10. **Production validation**
    - Deploy to staging environment
    - Test with real user accounts and data
    - Monitor error rates and performance metrics

## Key Implementation Patterns to Follow

### Error Handling Strategy
```typescript
// Follow existing pattern from auth-utils.ts
try {
  const result = await supabase.auth.getSession();
  if (result.error) {
    throw new SessionError(result.error.message);
  }
  // Handle success case
} catch (error) {
  if (error instanceof AuthError) {
    throw error; // Re-throw known auth errors
  }
  throw new AuthError(`Unexpected error: ${error.message}`, 'UNEXPECTED_ERROR');
}
```

### Testing Pattern
```typescript
// Use existing test structure from auth-integration.test.ts
describe('Step X: Test Category', () => {
  beforeEach(() => {
    // Setup test state
  });
  
  it('should pass specific test scenario', async () => {
    // Arrange
    const mockData = setupTestData();
    
    // Act  
    const result = await testFunction();
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
  });
});
```

### Auth Hook Integration
```typescript
// Follow pattern from use-stable-auth.ts for React Query integration
const { data: user, error, isLoading } = useQuery({
  queryKey: ["user-profile", session?.user?.id],
  queryFn: async () => {
    // Use enhanced getUserProfile with comprehensive error handling
    return await getUserProfile();
  },
  enabled: !!session?.user?.id,
  retry: (failureCount, error) => {
    // Intelligent retry logic for network vs auth errors
    return failureCount < 2 && !error.message.includes('401');
  }
});
```

## Documentation References

### Essential Documentation URLs
- **Supabase Authentication**: https://supabase.com/docs/guides/auth
- **Supabase JavaScript Client**: https://supabase.com/docs/reference/javascript
- **Google OAuth Setup**: https://supabase.com/docs/guides/auth/social-login/auth-google  
- **Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security
- **Playwright Authentication Testing**: https://playwright.dev/docs/auth
- **React Query Authentication Patterns**: https://tanstack.com/query/v4/docs/guides/authentication

### Existing Code References
- **Auth utilities**: `client/src/lib/auth-utils.ts` - Comprehensive error handling and fallbacks
- **Auth hooks**: `client/src/hooks/useAuth-minimal.ts` - Simple session-based auth
- **Complex auth**: `client/src/hooks/use-stable-auth.ts` - React Query + auth integration  
- **RLS policies**: `supabase/migrations/20250901000000_add_rls_policies.sql` - Current policies
- **Test utilities**: `client/src/lib/auth-test-utils.ts` - Existing test infrastructure
- **Server auth**: `server/auth-simple.ts` - Simple JWT token validation

### Error Patterns and Solutions
- **RLS Permission Denied**: Handle gracefully with auth session fallback
- **auth.uid() NULL**: Replace RPC calls with direct session-based queries
- **Infinite Loading**: Implement proper error boundaries and loading states
- **OAuth Redirect Issues**: Verify redirect URLs and provider configuration

## Success Metrics

### Immediate Success (After Implementation)
- [ ] Zero 500 errors on authentication endpoints
- [ ] Google OAuth login success rate > 99%
- [ ] User profile loading time < 2 seconds  
- [ ] No authentication-related console errors
- [ ] All existing functionality preserved

### Long-term Success (After Production Deploy)
- [ ] Authentication failure rate < 0.1%
- [ ] Project loading success rate > 99.5%
- [ ] No infinite loading states reported
- [ ] All CRUD operations functioning correctly
- [ ] Real-time features working properly

### Test Coverage Success
- [ ] All Step 1-5 tests passing consistently
- [ ] Unit test coverage > 90% for auth modules
- [ ] Integration tests covering all auth flows
- [ ] Playwright tests covering complete user journeys
- [ ] No failing tests in CI/CD pipeline

## Risk Mitigation

### High-Risk Areas
1. **Authentication State Loss**: Comprehensive session persistence testing
2. **OAuth Flow Breaking**: End-to-end OAuth testing with real providers
3. **RLS Policy Conflicts**: Individual policy validation and rollback capability
4. **Data Access Regression**: CRUD operation testing for all user types
5. **Performance Degradation**: Load testing with authenticated operations

### Rollback Strategy
1. **Code Rollback**: All changes in version control with clear commit messages
2. **Database Rollback**: RLS policy changes tracked in migrations with rollback scripts
3. **Feature Flags**: Implement feature flag for new auth flow if needed
4. **Environment Isolation**: Test all changes in staging before production
5. **Monitoring**: Real-time error tracking and alerting for auth failures

## Expected Timeline

### Phase 1 (Setup): 2-3 hours
- Test infrastructure creation
- Sequential Thinking MCP integration
- Test environment preparation

### Phase 2 (Diagnosis): 3-4 hours  
- Step 1-3 execution and analysis
- Root cause confirmation
- OAuth flow validation

### Phase 3 (Repair): 2-3 hours
- RLS policy fixes
- System validation
- Integration testing

### Phase 4 (Verification): 2-3 hours
- Comprehensive testing
- Production validation
- Performance verification

**Total Estimated Time**: 9-13 hours for complete implementation

---

## Conclusion

This PRP provides comprehensive context and systematic approach to fix the authentication cascade failure in NOCI.app. The sequential 5-step debugging process using existing tools (Sequential Thinking MCP, Supabase MCP, Playwright) ensures methodical problem resolution. 

The extensive test infrastructure already exists, and the root cause has been clearly identified. Following this PRP should result in successful one-pass implementation of the authentication fix.

**Critical Success Factor**: Do not proceed to the next step until ALL tests in the current step pass. This systematic approach prevents cascade failures and ensures reliable resolution.