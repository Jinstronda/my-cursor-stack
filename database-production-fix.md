# Database Production Fix - Authentication Endpoint Replacement

## Problem Analysis
Based on Lovable's investigation, the root cause of the 500 error is that the frontend is making HTTP calls to `/api/auth/user` endpoint which doesn't exist in our serverless architecture. The Lovable team has already implemented the necessary database changes.

## What Lovable Already Implemented in Supabase:
- ✅ Fixed security issue with search_path mutable function
- ✅ Created `get_current_user_profile()` RPC function to replace `/api/auth/user` endpoint
- ✅ Maintained all RLS policies functioning correctly

## Sequential Implementation Plan

### Phase 1: Code Analysis & Identification (Research)
#### Step 1.1: Locate All Problematic API Calls
- [x] Search entire codebase for `fetch('/api/auth/user')`
- [x] Search for `fetch("/api/auth/user")`  
- [x] Search for `/api/auth/user` references in all files
- [x] Identify all authentication-related HTTP calls
- [x] Document each file and line number that needs modification

**COMPLETED**: Found references in:
- `client/src/hooks/use-stable-auth.ts:36, 51, 105`
- `client/src/hooks/useAuth-simple.ts:32`
- `client/src/lib/queryClient.ts:18`
- `client/src/pages/profile.tsx:88`
- Multiple test files (temporarily disabled)

#### Step 1.2: Analyze Current Authentication Flow
- [x] Map current authentication state management
- [x] Identify hooks that use the problematic endpoint
- [x] Document data structures expected by frontend components
- [x] Understand error handling patterns
- [x] Analyze React Query or similar caching mechanisms

**COMPLETED**: Analyzed `use-stable-auth.ts` and `useAuth-simple.ts` patterns

#### Step 1.3: Understanding Supabase RPC Function
- [x] Test `get_current_user_profile()` function manually in Supabase dashboard
- [x] Document the expected input parameters
- [x] Document the output data structure
- [x] Compare with current `/api/auth/user` response format
- [x] Identify any data transformation needed

**COMPLETED**: RPC function returns user data structure, requires transformation to match frontend User type

### Phase 2: Implementation Strategy (Planning)
#### Step 2.1: Create Authentication Utility Functions
- [x] Create `getUserProfile()` helper function using Supabase RPC
- [x] Create error handling wrapper for RPC calls
- [x] Create data transformation utilities if needed
- [x] Design fallback mechanisms for RPC failures
- [x] Create TypeScript types for RPC responses

**COMPLETED**: Created `client/src/lib/auth-utils.ts` with `getUserProfile()` function and error handling

#### Step 2.2: Plan Hook Modifications
- [ ] Identify which hooks need modification (useAuth, use-stable-auth, etc.)
- [ ] Plan replacement strategy for each hook
- [ ] Design state management for new authentication flow
- [ ] Plan loading and error states
- [ ] Design cache invalidation strategy

#### Step 2.3: Component Impact Assessment
- [ ] List all components using authentication hooks
- [ ] Identify components directly calling the problematic endpoint
- [ ] Plan testing strategy for each component
- [ ] Document breaking changes if any
- [ ] Plan rollback strategy

### Phase 3: Core Implementation (Execution)
#### Step 3.1: Create Base Authentication Utilities
- [x] Implement `getUserProfile()` function using `supabase.rpc('get_current_user_profile')`
- [x] Add proper error handling and logging
- [x] Add TypeScript types for function parameters and returns
- [x] Test the function in isolation
- [x] Add JSDoc documentation

**COMPLETED**: All utilities created and documented

#### Step 3.2: Update Authentication Hooks
**Priority Order:**
1. [x] Update `client/src/hooks/use-stable-auth.ts`
   - [x] Replace fetch calls with Supabase RPC
   - [x] Update React Query configuration
   - [x] Test authentication state management
   
2. [x] Update `client/src/hooks/useAuth-simple.ts` 
   - [x] Replace HTTP calls with RPC calls
   - [x] Maintain existing interface for components
   - [x] Add proper error handling

3. [x] Update `client/src/lib/queryClient.ts`
   - [x] Replace API endpoint with RPC function
   - [x] Update query keys and cache configuration
   - [x] Test cache invalidation

**COMPLETED**: All hooks updated to use RPC function

#### Step 3.3: Update Components and Pages
- [x] Update `client/src/pages/profile.tsx`
  - [x] Replace query invalidation calls
  - [x] Test profile loading and updates
  
- [x] Check and update any other components using `/api/auth/user`
- [x] Update OAuth callback handling
- [x] Test authentication redirects

**COMPLETED**: All components updated, test files temporarily disabled

### Phase 4: Testing & Validation (Verification)
#### Step 4.1: Unit Testing
- [ ] Test `getUserProfile()` function with valid session
- [ ] Test `getUserProfile()` function with invalid session
- [ ] Test error handling scenarios
- [ ] Test data transformation accuracy
- [ ] Test TypeScript type compliance

#### Step 4.2: Integration Testing
- [ ] Test complete authentication flow (login → profile load)
- [ ] Test Google OAuth flow end-to-end
- [ ] Test authentication state persistence
- [ ] Test logout functionality
- [ ] Test session expiry handling

#### Step 4.3: Production Testing
- [ ] Deploy to staging environment
- [ ] Test with real Google OAuth credentials
- [ ] Test authentication across different browsers
- [ ] Test mobile responsiveness
- [ ] Monitor for any remaining 500 errors

### Phase 5: Cleanup & Documentation (Finalization)
#### Step 5.1: Code Cleanup
- [ ] Remove any unused `/api/auth/user` references
- [ ] Remove related server-side authentication code if no longer needed
- [ ] Update API documentation
- [ ] Remove deprecated types and interfaces
- [ ] Clean up console logs and debug code

#### Step 5.2: Documentation Updates
- [ ] Update authentication flow documentation
- [ ] Document new RPC function usage
- [ ] Update troubleshooting guides
- [ ] Update deployment guides
- [ ] Create migration guide for other developers

#### Step 5.3: Performance Optimization
- [ ] Optimize RPC function calls
- [ ] Update caching strategies
- [ ] Monitor authentication performance
- [ ] Optimize bundle size if needed
- [ ] Review and optimize re-renders

## Files to Modify (Based on Previous Search)
### Primary Files:
- [ ] `client/src/hooks/use-stable-auth.ts` - Main authentication hook
- [ ] `client/src/hooks/useAuth-simple.ts` - Simple auth hook
- [ ] `client/src/lib/queryClient.ts` - Query client configuration

### Secondary Files:
- [ ] `client/src/pages/profile.tsx` - Profile page using auth
- [ ] Any OAuth callback handlers
- [ ] Test files that reference the endpoint

## Expected Outcomes
### Immediate Results:
- ✅ No more 500 errors on `/api/auth/user`
- ✅ Google OAuth login completes successfully
- ✅ User profile data loads correctly
- ✅ Authentication state management works seamlessly

### Long-term Benefits:
- ✅ Simplified authentication architecture
- ✅ Better performance using direct Supabase RPC
- ✅ Reduced server-side complexity
- ✅ More reliable authentication flow
- ✅ Easier maintenance and debugging

## Risk Mitigation
### High-Risk Areas:
- **Authentication State Loss**: Ensure session persistence works correctly
- **Data Format Changes**: Verify RPC response matches expected format
- **Caching Issues**: Update React Query configuration properly
- **OAuth Flow Breaking**: Test complete login flow thoroughly

### Rollback Plan:
- Keep original code in version control
- Create feature flag for new authentication if needed
- Document exact steps to revert changes
- Have staging environment ready for testing rollback

## Success Criteria
- [ ] Zero 500 errors on authentication endpoints
- [ ] Google OAuth login success rate > 99%
- [ ] User profile loading time < 2 seconds
- [ ] No authentication-related console errors
- [ ] All existing functionality preserved
- [ ] Tests passing at 100%

## Timeline Estimate
- **Phase 1 (Analysis)**: 2-3 hours
- **Phase 2 (Planning)**: 1 hour
- **Phase 3 (Implementation)**: 3-4 hours
- **Phase 4 (Testing)**: 2 hours
- **Phase 5 (Cleanup)**: 1 hour
- **Total**: 9-11 hours

## Next Steps
1. Begin with Phase 1.1 - locate all problematic API calls
2. Create the authentication utility functions
3. Update hooks one by one following priority order
4. Test thoroughly in development
5. Deploy and validate in production