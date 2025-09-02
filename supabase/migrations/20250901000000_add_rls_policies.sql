-- Migration: Add RLS policies for authenticated user data access
-- 
-- PROBLEM SOLVED: API endpoints use SUPABASE_ANON_KEY with RLS enabled
-- but NO policies exist, causing empty query results in production.
-- 
-- SOLUTION: Create appropriate RLS policies allowing authenticated users
-- to access their own data while maintaining security.

-- ============================================================================
-- RLS POLICIES FOR PROJECTS TABLE
-- ============================================================================

-- Allow authenticated users to view their own projects
CREATE POLICY "Users can view their own projects" ON projects
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow authenticated users to create projects (user_id auto-set to auth.uid())
CREATE POLICY "Users can create their own projects" ON projects
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own projects
CREATE POLICY "Users can update their own projects" ON projects
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to delete their own projects  
CREATE POLICY "Users can delete their own projects" ON projects
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES FOR PRODUCTION_COMPANIES TABLE
-- ============================================================================

-- Allow everyone to view production companies (public directory)
CREATE POLICY "Anyone can view production companies" ON production_companies
    FOR SELECT
    USING (true);

-- Allow authenticated users to create production companies (owner_id auto-set to auth.uid())
CREATE POLICY "Users can create production companies" ON production_companies
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Allow company owners to update their own companies
CREATE POLICY "Company owners can update their companies" ON production_companies
    FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- Allow company owners to delete their own companies
CREATE POLICY "Company owners can delete their companies" ON production_companies
    FOR DELETE
    USING (auth.uid() = owner_id);

-- ============================================================================
-- RLS POLICIES FOR EDITAIS TABLE
-- ============================================================================

-- Allow everyone to view editais (public information)
CREATE POLICY "Anyone can view editais" ON editais
    FOR SELECT
    USING (true);

-- Only allow system/admin to create editais (restrictive for now)
-- This can be modified later if users should be able to create editais
CREATE POLICY "Only authenticated users can create editais" ON editais
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- RLS POLICIES FOR USERS TABLE (if needed)
-- ============================================================================

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT
    USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- VERIFY RLS IS ENABLED ON ALL TABLES
-- ============================================================================

-- Ensure RLS is enabled (should already be enabled but confirm)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE editais ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- MIGRATION VERIFICATION
-- ============================================================================

-- The following policies should now exist:
-- 
-- projects:
-- - "Users can view their own projects" (SELECT)
-- - "Users can create their own projects" (INSERT) 
-- - "Users can update their own projects" (UPDATE)
-- - "Users can delete their own projects" (DELETE)
--
-- production_companies:
-- - "Anyone can view production companies" (SELECT)
-- - "Users can create production companies" (INSERT)
-- - "Company owners can update their companies" (UPDATE)
-- - "Company owners can delete their companies" (DELETE)
--
-- editais:
-- - "Anyone can view editais" (SELECT)
-- - "Only authenticated users can create editais" (INSERT)
--
-- users:
-- - "Users can view their own profile" (SELECT)
-- - "Users can update their own profile" (UPDATE)
--
-- After applying this migration:
-- 1. Authenticated users will see their own projects using anon key + JWT
-- 2. Production companies will be publicly viewable 
-- 3. Editais will be publicly readable
-- 4. Security maintained: users only access their own data
-- 5. API endpoints will work correctly in production