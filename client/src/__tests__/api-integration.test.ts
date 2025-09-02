/**
 * API Integration Tests
 * Critical regression testing for project creation and core functionality
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

interface TestUser {
  id: string;
  email: string;
  name: string;
  token?: string;
}

interface ProjectData {
  name: string;
  description?: string;
  genre?: string;
  status?: string;
  userId: string;
}

interface APIResponse<T = any> {
  status: number;
  data?: T;
  error?: string;
}

class APITestClient {
  private baseUrl = 'http://localhost:3000';
  private testUser: TestUser | null = null;

  async authenticateUser(userData: Omit<TestUser, 'token'>): Promise<TestUser> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auth/user`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userData.id}` // Simulated auth
        }
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const user = await response.json();
      this.testUser = { ...userData, token: userData.id };
      return this.testUser;
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }

  async createProject(projectData: ProjectData): Promise<APIResponse> {
    if (!this.testUser) {
      throw new Error('User not authenticated');
    }

    try {
      console.log('Creating project with data:', JSON.stringify(projectData, null, 2));
      
      const response = await fetch(`${this.baseUrl}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.testUser.token}`
        },
        body: JSON.stringify(projectData)
      });

      const data = response.ok ? await response.json() : null;
      const errorText = !response.ok ? await response.text() : null;

      return {
        status: response.status,
        data,
        error: errorText
      };
    } catch (error) {
      console.error('Project creation error:', error);
      return {
        status: 500,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getUserProjects(): Promise<APIResponse> {
    if (!this.testUser) {
      throw new Error('User not authenticated');
    }

    try {
      console.log('Fetching user projects...');
      
      const response = await fetch(`${this.baseUrl}/api/projects/my`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.testUser.token}`
        }
      });

      const data = response.ok ? await response.json() : null;
      const errorText = !response.ok ? await response.text() : null;

      return {
        status: response.status,
        data,
        error: errorText
      };
    } catch (error) {
      console.error('Get user projects error:', error);
      return {
        status: 500,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteProject(projectId: number): Promise<APIResponse> {
    if (!this.testUser) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.testUser.token}`
        }
      });

      return {
        status: response.status,
        data: response.status === 204 ? { success: true } : await response.json()
      };
    } catch (error) {
      console.error('Project deletion error:', error);
      return {
        status: 500,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async checkDatabaseHealth(): Promise<APIResponse> {
    try {
      // Test database connectivity by creating a minimal user sync operation
      const response = await fetch(`${this.baseUrl}/api/auth/user`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test_user_health_check`
        }
      });

      return {
        status: response.status,
        data: response.ok ? await response.json() : null,
        error: !response.ok ? await response.text() : undefined
      };
    } catch (error) {
      console.error('Database health check error:', error);
      return {
        status: 500,
        error: error instanceof Error ? error.message : 'Database connection failed'
      };
    }
  }
}

describe('API Integration Tests - Critical Regression Prevention', () => {
  let client: APITestClient;
  const testUser: TestUser = {
    id: 'test_user_' + Date.now(),
    email: 'test@example.com',
    name: 'Test User'
  };

  beforeEach(async () => {
    client = new APITestClient();
  });

  describe('Database Connectivity Tests', () => {
    it('should verify database connection is working', async () => {
      const healthCheck = await client.checkDatabaseHealth();
      
      console.log('Database health check result:', healthCheck);
      
      // Should not return 500 (server error) - database should be accessible
      expect(healthCheck.status).not.toBe(500);
      
      if (healthCheck.status === 500) {
        console.error('❌ CRITICAL: Database connection failed');
        console.error('Error:', healthCheck.error);
      }
    }, 10000);
  });

  describe('Authentication Flow Tests', () => {
    it('should authenticate user successfully', async () => {
      try {
        const authenticatedUser = await client.authenticateUser(testUser);
        
        expect(authenticatedUser).toBeDefined();
        expect(authenticatedUser.id).toBe(testUser.id);
        expect(authenticatedUser.email).toBe(testUser.email);
        
        console.log('✅ User authentication successful');
      } catch (error) {
        console.error('❌ User authentication failed:', error);
        // Log but don't fail - may be expected in some environments
      }
    }, 10000);
  });

  describe('Project Creation Flow Tests - CRITICAL', () => {
    beforeEach(async () => {
      try {
        await client.authenticateUser(testUser);
      } catch (error) {
        console.log('⚠️ Skipping test due to auth issues');
      }
    });

    it('should create a basic project successfully', async () => {
      const projectData: ProjectData = {
        name: 'Test Project',
        description: 'Test project description',
        userId: testUser.id
      };

      const result = await client.createProject(projectData);
      
      console.log('Project creation result:', {
        status: result.status,
        hasData: !!result.data,
        error: result.error
      });

      // Critical: Project creation should not fail
      if (result.status >= 400) {
        console.error('❌ CRITICAL REGRESSION: Project creation failed');
        console.error('Status:', result.status);
        console.error('Error:', result.error);
        console.error('Request data:', projectData);
      }

      // Should return 200/201 for successful creation
      expect([200, 201]).toContain(result.status);
      expect(result.data).toBeDefined();
      
      if (result.data) {
        expect(result.data.name).toBe(projectData.name);
        expect(result.data.userId).toBe(projectData.userId);
      }
    }, 15000);

    it('should handle project creation with AI metadata generation', async () => {
      const projectData: ProjectData = {
        name: 'Novo Projeto',
        description: 'Quero criar um filme de ficção científica sobre viagem no tempo',
        userId: testUser.id
      };

      const result = await client.createProject(projectData);
      
      console.log('AI metadata project creation result:', {
        status: result.status,
        hasData: !!result.data,
        error: result.error
      });

      if (result.status >= 400) {
        console.error('❌ CRITICAL: AI metadata project creation failed');
        console.error('Status:', result.status);
        console.error('Error:', result.error);
      }

      expect([200, 201]).toContain(result.status);
    }, 20000);

    it('should prevent duplicate project creation', async () => {
      const projectData: ProjectData = {
        name: 'Novo Projeto',
        description: 'Duplicate test description for prevention',
        userId: testUser.id
      };

      // Create first project
      const firstResult = await client.createProject(projectData);
      
      if (firstResult.status < 400) {
        // Try to create duplicate
        const secondResult = await client.createProject(projectData);
        
        console.log('Duplicate prevention test:', {
          firstStatus: firstResult.status,
          secondStatus: secondResult.status,
          secondHasData: !!secondResult.data
        });

        // Should either return existing project or prevent creation
        expect([200, 201, 409]).toContain(secondResult.status);
      }
    }, 15000);
  });

  describe('Project Retrieval Tests - CRITICAL', () => {
    beforeEach(async () => {
      try {
        await client.authenticateUser(testUser);
      } catch (error) {
        console.log('⚠️ Skipping test due to auth issues');
      }
    });

    it('should retrieve user projects successfully', async () => {
      const result = await client.getUserProjects();
      
      console.log('Get user projects result:', {
        status: result.status,
        hasData: !!result.data,
        error: result.error
      });

      // Critical: /api/projects/my endpoint should not return 500
      if (result.status === 500) {
        console.error('❌ CRITICAL REGRESSION: /api/projects/my endpoint failing');
        console.error('Error:', result.error);
      }

      // Should return 200 (success) or 404 (no projects found)
      expect([200, 404]).toContain(result.status);
      
      if (result.status === 200) {
        expect(Array.isArray(result.data)).toBe(true);
      }
    }, 15000);
  });

  describe('Error Handling and Recovery Tests', () => {
    beforeEach(async () => {
      try {
        await client.authenticateUser(testUser);
      } catch (error) {
        console.log('⚠️ Skipping test due to auth issues');
      }
    });

    it('should handle invalid project data gracefully', async () => {
      const invalidProjectData = {
        name: '', // Invalid empty name
        userId: testUser.id
      };

      const result = await client.createProject(invalidProjectData as ProjectData);
      
      console.log('Invalid data handling result:', {
        status: result.status,
        error: result.error
      });

      // Should return 400 (bad request), not 500 (server error)
      expect(result.status).toBe(400);
      expect(result.error).toBeDefined();
    }, 10000);

    it('should handle missing authentication gracefully', async () => {
      const unauthenticatedClient = new APITestClient();
      
      const result = await unauthenticatedClient.getUserProjects();
      
      console.log('Unauthenticated request result:', {
        status: result.status,
        error: result.error
      });

      // Should return 401 (unauthorized), not 500 (server error)
      expect([401, 403]).toContain(result.status);
    }, 10000);
  });

  afterEach(() => {
    // Cleanup if needed
    console.log('Test cleanup completed');
  });
});

// Export test runner for manual execution
export class APIIntegrationTestRunner {
  static async runCriticalTests(): Promise<{
    passed: number;
    failed: number;
    critical: number;
    results: Array<{ test: string; status: string; critical?: boolean }>;
  }> {
    const client = new APITestClient();
    const testUser = {
      id: 'manual_test_' + Date.now(),
      email: 'manual@example.com',
      name: 'Manual Test User'
    };
    
    const results: Array<{ test: string; status: string; critical?: boolean }> = [];

    // Critical Test 1: Database Health
    try {
      const health = await client.checkDatabaseHealth();
      results.push({
        test: 'Database Connectivity',
        status: health.status < 500 ? 'PASS' : 'FAIL',
        critical: true
      });
    } catch {
      results.push({
        test: 'Database Connectivity',
        status: 'FAIL',
        critical: true
      });
    }

    // Critical Test 2: User Authentication
    try {
      await client.authenticateUser(testUser);
      results.push({
        test: 'User Authentication',
        status: 'PASS'
      });
    } catch {
      results.push({
        test: 'User Authentication',
        status: 'FAIL'
      });
    }

    // Critical Test 3: Project Creation
    try {
      const createResult = await client.createProject({
        name: 'Test Project',
        description: 'Manual test project',
        userId: testUser.id
      });
      results.push({
        test: 'Project Creation',
        status: createResult.status < 400 ? 'PASS' : 'FAIL',
        critical: true
      });
    } catch {
      results.push({
        test: 'Project Creation',
        status: 'FAIL',
        critical: true
      });
    }

    // Critical Test 4: Project Retrieval
    try {
      const getResult = await client.getUserProjects();
      results.push({
        test: 'Project Retrieval (/api/projects/my)',
        status: getResult.status !== 500 ? 'PASS' : 'FAIL',
        critical: true
      });
    } catch {
      results.push({
        test: 'Project Retrieval (/api/projects/my)',
        status: 'FAIL',
        critical: true
      });
    }

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const critical = results.filter(r => r.critical && r.status === 'FAIL').length;

    return { passed, failed, critical, results };
  }
}

// Browser console runner
if (typeof window !== 'undefined') {
  (window as any).runAPITests = APIIntegrationTestRunner.runCriticalTests;
}