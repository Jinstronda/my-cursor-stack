## FEATURE:

Fix critical authentication and project loading system for NOCI.app - systematically diagnose and resolve authentication failures that started as RLS (Row Level Security) bugs and have progressed to complete login failure, including Google OAuth integration not working and project loading issues.

## EXAMPLES:

No examples exist in the repository - create debugging examples during the investigation process.

## DOCUMENTATION:

- Supabase Authentication Guide: https://supabase.com/docs/guides/auth
- Supabase JavaScript Client: https://supabase.com/docs/reference/javascript  
- Google OAuth Setup: https://supabase.com/docs/guides/auth/social-login/auth-google
- Supabase RLS Documentation: https://supabase.com/docs/guides/auth/row-level-security
- Sequential Thinking MCP for systematic debugging approach
- Supabase MCP Server Documentation for database debugging
- Playwright Documentation: https://playwright.dev/docs
- Playwright Authentication Testing: https://playwright.dev/docs/auth
- NOCI.app repository README.md and package.json for project-specific configuration

## OTHER CONSIDERATIONS:

**Use Sequential Thinking MCP for Step-by-Step Debug Process:**

**Step 1: Understand the RLS Regression**
- Create test to identify which RLS policies were changed that triggered the cascade failure
- Create test to determine if the RLS bug caused authentication state corruption
- Create test to check if database permissions are completely broken or partially working
- Validate each test passes before proceeding to Step 2

**Step 2: Basic Authentication Recovery**
- Create test to verify if Supabase auth service is responding
- Create test to check if authentication client initialization works
- Create test to verify if new sessions can be created (bypassing existing corrupted state)
- Validate all authentication recovery tests pass before proceeding to Step 3

**Step 3: Google OAuth Specific Issues**
- Create test to determine if OAuth provider configuration was affected by RLS changes
- Create test to verify if OAuth redirects work properly
- Create test to check if OAuth tokens are being accepted
- Create test to verify Google OAuth tab/popup opens correctly
- Validate all OAuth tests pass before proceeding to Step 4

**Step 4: RLS Policy Analysis and Repair**
- Create test to identify which specific RLS policies are causing authentication failures
- Create test suite with RLS policies temporarily disabled to restore basic login
- Create test to systematically re-enable policies one by one
- Create test to validate the root RLS policy fix doesn't break authentication
- Validate all RLS repair tests pass before proceeding to Step 5

**Step 5: Project Loading Recovery**
- Create test to verify authenticated users can access project data
- Create test for project creation functionality
- Create test to validate all CRUD operations work properly
- Create test for real-time subscriptions and collaborative features
- Validate all project functionality tests pass

**Critical Testing Requirements:**
- Use Playwright to create automated tests for each step
- Use Supabase MCP to validate database state at each step
- Use Sequential Thinking MCP to ensure logical progression through debugging steps
- Create comprehensive test coverage that can be re-run after each fix
- Don't proceed to next step until all tests in current step pass

**RLS Bug Cascade Failure Testing Focus:**
- Test if RLS policy changes broke auth-related table access
- Test if bad RLS policies prevent OAuth token storage/retrieval
- Test for authentication state corruption requiring session cleanup
- Test for client-side authentication caching issues from the RLS bug

**Tool Integration:**
- **Sequential Thinking MCP**: Guide the systematic debugging approach
- **Supabase MCP**: Test database queries and RLS policies directly
- **Playwright**: Automate UI authentication flow testing
- **Create validation tests**: For each fix before moving to next debugging step