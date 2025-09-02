/**
 * Project CRUD Operations Validation Suite
 * Comprehensive testing of project creation, retrieval, updating, and deletion
 */

interface ProjectTestResult {
  operation: string;
  status: 'PASS' | 'FAIL';
  executionTime: number;
  error?: string;
  data?: any;
}

interface ProjectValidationSuite {
  totalOperations: number;
  passed: number;
  failed: number;
  executionTime: number;
  results: ProjectTestResult[];
  crudIntegrity: boolean;
}

interface TestProject {
  id?: number;
  name: string;
  description?: string;
  genre?: string;
  status?: string;
  budget?: number;
  userId: string;
  isPublic?: boolean;
}

class ProjectCRUDValidator {
  private baseUrl = 'http://localhost:3000';
  private results: ProjectTestResult[] = [];
  private testUserId = 'crud_test_user_' + Date.now();
  private createdProjects: number[] = [];

  private async runOperation(
    operationName: string,
    operationFn: () => Promise<any>
  ): Promise<ProjectTestResult> {
    const startTime = Date.now();
    
    try {
      const data = await operationFn();
      
      const result: ProjectTestResult = {
        operation: operationName,
        status: 'PASS',
        executionTime: Date.now() - startTime,
        data
      };
      
      this.results.push(result);
      return result;
    } catch (error) {
      const result: ProjectTestResult = {
        operation: operationName,
        status: 'FAIL',
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      this.results.push(result);
      return result;
    }
  }

  // CREATE Operations
  async testBasicProjectCreation(): Promise<TestProject> {
    const projectData: TestProject = {
      name: 'CRUD Test Project - Basic',
      description: 'Basic project creation test',
      userId: this.testUserId
    };

    const response = await fetch(`${this.baseUrl}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.testUserId}`
      },
      body: JSON.stringify(projectData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Project creation failed: ${response.status} - ${error}`);
    }

    const createdProject = await response.json();
    
    // Validate response structure
    if (!createdProject.id || !createdProject.name || !createdProject.userId) {
      throw new Error('Invalid project creation response structure');
    }

    // Track for cleanup
    this.createdProjects.push(createdProject.id);

    return createdProject;
  }

  async testProjectCreationWithAllFields(): Promise<TestProject> {
    const projectData: TestProject = {
      name: 'CRUD Test Project - Complete',
      description: 'Complete project with all fields',
      genre: 'Drama',
      status: 'esboço',
      budget: 50000,
      userId: this.testUserId,
      isPublic: false
    };

    const response = await fetch(`${this.baseUrl}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.testUserId}`
      },
      body: JSON.stringify(projectData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Complete project creation failed: ${response.status} - ${error}`);
    }

    const createdProject = await response.json();
    this.createdProjects.push(createdProject.id);

    // Validate all fields were saved correctly
    const expectedFields = ['name', 'description', 'genre', 'status', 'userId'];
    for (const field of expectedFields) {
      if (createdProject[field] !== projectData[field]) {
        throw new Error(`Field ${field} not saved correctly: expected ${projectData[field]}, got ${createdProject[field]}`);
      }
    }

    return createdProject;
  }

  async testProjectCreationWithAIMetadata(): Promise<TestProject> {
    const projectData: TestProject = {
      name: 'Novo Projeto',
      description: 'Quero criar um filme de drama sobre um jovem que descobre poderes mágicos em uma cidade moderna',
      userId: this.testUserId
    };

    const response = await fetch(`${this.baseUrl}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.testUserId}`
      },
      body: JSON.stringify(projectData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI metadata project creation failed: ${response.status} - ${error}`);
    }

    const createdProject = await response.json();
    this.createdProjects.push(createdProject.id);

    // AI should have generated a better title than "Novo Projeto"
    if (createdProject.name === 'Novo Projeto') {
      console.warn('AI metadata generation may not be working - title unchanged');
    }

    return createdProject;
  }

  async testDuplicateProjectPrevention(): Promise<any> {
    const projectData: TestProject = {
      name: 'Novo Projeto',
      description: 'Duplicate prevention test - same description content',
      userId: this.testUserId
    };

    // Create first project
    const firstResponse = await fetch(`${this.baseUrl}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.testUserId}`
      },
      body: JSON.stringify(projectData)
    });

    if (!firstResponse.ok) {
      throw new Error(`First project creation failed: ${firstResponse.status}`);
    }

    const firstProject = await firstResponse.json();
    this.createdProjects.push(firstProject.id);

    // Try to create duplicate
    const secondResponse = await fetch(`${this.baseUrl}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.testUserId}`
      },
      body: JSON.stringify(projectData)
    });

    if (!secondResponse.ok) {
      throw new Error(`Duplicate project handling failed: ${secondResponse.status}`);
    }

    const secondProject = await secondResponse.json();

    // Should either return same project or create new one with different name
    return {
      firstProjectId: firstProject.id,
      secondProjectId: secondProject.id,
      preventedDuplicate: firstProject.id === secondProject.id,
      firstProjectName: firstProject.name,
      secondProjectName: secondProject.name
    };
  }

  // READ Operations
  async testProjectRetrieval(projectId: number): Promise<TestProject> {
    const response = await fetch(`${this.baseUrl}/api/projects/${projectId}`);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Project retrieval failed: ${response.status} - ${error}`);
    }

    const project = await response.json();

    // Validate project structure
    const requiredFields = ['id', 'name', 'userId', 'createdAt', 'updatedAt'];
    for (const field of requiredFields) {
      if (!(field in project)) {
        throw new Error(`Missing required field in retrieved project: ${field}`);
      }
    }

    if (project.id !== projectId) {
      throw new Error(`Retrieved wrong project: expected ${projectId}, got ${project.id}`);
    }

    return project;
  }

  async testUserProjectsList(): Promise<TestProject[]> {
    const response = await fetch(`${this.baseUrl}/api/projects/my`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.testUserId}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`User projects list failed: ${response.status} - ${error}`);
    }

    const projects = await response.json();

    if (!Array.isArray(projects)) {
      throw new Error('Projects list is not an array');
    }

    // Validate each project in list
    projects.forEach((project, index) => {
      if (!project.id || !project.name || !project.userId) {
        throw new Error(`Invalid project structure at index ${index}`);
      }
      
      if (project.userId !== this.testUserId) {
        throw new Error(`Project ${project.id} belongs to wrong user: ${project.userId}`);
      }
    });

    return projects;
  }

  async testPublicProjectsList(): Promise<TestProject[]> {
    const response = await fetch(`${this.baseUrl}/api/projects/community`);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Public projects list failed: ${response.status} - ${error}`);
    }

    const projects = await response.json();

    if (!Array.isArray(projects)) {
      throw new Error('Public projects list is not an array');
    }

    return projects;
  }

  // UPDATE Operations
  async testProjectUpdate(projectId: number): Promise<TestProject> {
    const updateData = {
      name: 'CRUD Test Project - Updated',
      description: 'Updated project description',
      genre: 'Thriller',
      status: 'pré-produção'
    };

    const response = await fetch(`${this.baseUrl}/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.testUserId}`
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Project update failed: ${response.status} - ${error}`);
    }

    const updatedProject = await response.json();

    // Validate updates were applied
    Object.keys(updateData).forEach(key => {
      if (updatedProject[key] !== updateData[key]) {
        throw new Error(`Update not applied for ${key}: expected ${updateData[key]}, got ${updatedProject[key]}`);
      }
    });

    // Validate updatedAt was changed
    if (!updatedProject.updatedAt) {
      throw new Error('updatedAt field not set after update');
    }

    return updatedProject;
  }

  async testStatusUpdateTriggers(projectId: number): Promise<any> {
    // Test that changing status to 'pré-produção' makes project public
    const response = await fetch(`${this.baseUrl}/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.testUserId}`
      },
      body: JSON.stringify({ status: 'pré-produção' })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Status update failed: ${response.status} - ${error}`);
    }

    const updatedProject = await response.json();

    return {
      status: updatedProject.status,
      isPublic: updatedProject.isPublic,
      automaticallyMadePublic: updatedProject.status === 'pré-produção' && updatedProject.isPublic
    };
  }

  async testUnauthorizedUpdate(): Promise<any> {
    if (this.createdProjects.length === 0) {
      throw new Error('No projects available for unauthorized update test');
    }

    const projectId = this.createdProjects[0];
    const unauthorizedUserId = 'unauthorized_user_' + Date.now();

    const response = await fetch(`${this.baseUrl}/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${unauthorizedUserId}`
      },
      body: JSON.stringify({ name: 'Unauthorized Update Attempt' })
    });

    // Should return 403 (Forbidden) or 404 (Not Found), not 200
    if (response.ok) {
      throw new Error('Unauthorized update was allowed - security issue!');
    }

    if (response.status !== 403 && response.status !== 404) {
      throw new Error(`Unexpected response for unauthorized update: ${response.status}`);
    }

    return {
      status: response.status,
      properlyBlocked: !response.ok
    };
  }

  // DELETE Operations
  async testProjectDeletion(projectId: number): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.testUserId}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Project deletion failed: ${response.status} - ${error}`);
    }

    // Should return 204 No Content
    if (response.status !== 204) {
      throw new Error(`Unexpected deletion response status: ${response.status}`);
    }

    // Verify project is actually deleted
    const getResponse = await fetch(`${this.baseUrl}/api/projects/${projectId}`);
    
    if (getResponse.ok) {
      throw new Error('Project still exists after deletion');
    }

    // Remove from cleanup list
    this.createdProjects = this.createdProjects.filter(id => id !== projectId);

    return {
      deleted: true,
      deletionStatus: response.status,
      verifiedGone: !getResponse.ok
    };
  }

  async testUnauthorizedDeletion(): Promise<any> {
    if (this.createdProjects.length === 0) {
      throw new Error('No projects available for unauthorized deletion test');
    }

    const projectId = this.createdProjects[0];
    const unauthorizedUserId = 'unauthorized_user_' + Date.now();

    const response = await fetch(`${this.baseUrl}/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${unauthorizedUserId}`
      }
    });

    // Should return 403 (Forbidden) or 404 (Not Found), not 204
    if (response.status === 204) {
      throw new Error('Unauthorized deletion was allowed - security issue!');
    }

    if (response.status !== 403 && response.status !== 404) {
      throw new Error(`Unexpected response for unauthorized deletion: ${response.status}`);
    }

    return {
      status: response.status,
      properlyBlocked: response.status !== 204
    };
  }

  async testCascadeDeletion(projectId: number): Promise<any> {
    // First, create a chat session for the project
    const sessionResponse = await fetch(`${this.baseUrl}/api/chat/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.testUserId}`
      },
      body: JSON.stringify({
        title: 'Cascade Test Session',
        userId: this.testUserId,
        projectId: projectId
      })
    });

    let sessionCreated = false;
    let sessionId = null;

    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      sessionCreated = true;
      sessionId = sessionData.session?.id || sessionData.id;
    }

    // Delete the project
    const deleteResponse = await fetch(`${this.baseUrl}/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.testUserId}`
      }
    });

    if (!deleteResponse.ok) {
      throw new Error(`Cascade deletion failed: ${deleteResponse.status}`);
    }

    // Verify related chat session is also deleted (if it was created)
    let sessionDeleted = true;
    if (sessionCreated && sessionId) {
      const sessionCheckResponse = await fetch(`${this.baseUrl}/api/chat/sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${this.testUserId}`
        }
      });
      sessionDeleted = !sessionCheckResponse.ok;
    }

    this.createdProjects = this.createdProjects.filter(id => id !== projectId);

    return {
      projectDeleted: deleteResponse.status === 204,
      sessionWasCreated: sessionCreated,
      sessionDeleted,
      cascadeWorking: !sessionCreated || sessionDeleted
    };
  }

  // Validation Tests
  async testInvalidProjectCreation(): Promise<any> {
    const invalidScenarios = [
      { name: 'Empty Name', data: { name: '', userId: this.testUserId } },
      { name: 'Missing User ID', data: { name: 'Test Project' } },
      { name: 'Invalid Genre', data: { name: 'Test', userId: this.testUserId, genre: '' } },
      { name: 'Negative Budget', data: { name: 'Test', userId: this.testUserId, budget: -1000 } }
    ];

    const results = await Promise.all(
      invalidScenarios.map(async scenario => {
        try {
          const response = await fetch(`${this.baseUrl}/api/projects`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.testUserId}`
            },
            body: JSON.stringify(scenario.data)
          });

          return {
            scenario: scenario.name,
            status: response.status,
            properlyValidated: response.status === 400 // Should return 400 Bad Request
          };
        } catch (error) {
          return {
            scenario: scenario.name,
            status: 0,
            properlyValidated: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    const properlyValidated = results.filter(r => r.properlyValidated).length;
    const totalScenarios = invalidScenarios.length;

    return {
      scenariosTested: totalScenarios,
      properlyValidated,
      validationWorking: properlyValidated === totalScenarios,
      results
    };
  }

  // Main test runner
  async runFullCRUDValidation(): Promise<ProjectValidationSuite> {
    console.log('📁 Starting comprehensive project CRUD validation...');
    this.results = [];
    this.createdProjects = [];
    const startTime = Date.now();

    // CREATE tests
    const basicProject = await this.runOperation('Basic Project Creation', 
      () => this.testBasicProjectCreation());
    
    const completeProject = await this.runOperation('Complete Project Creation', 
      () => this.testProjectCreationWithAllFields());
    
    await this.runOperation('AI Metadata Project Creation', 
      () => this.testProjectCreationWithAIMetadata());
    
    await this.runOperation('Duplicate Prevention', 
      () => this.testDuplicateProjectPrevention());
    
    await this.runOperation('Invalid Project Validation', 
      () => this.testInvalidProjectCreation());

    // READ tests
    if (basicProject.status === 'PASS') {
      await this.runOperation('Project Retrieval', 
        () => this.testProjectRetrieval(basicProject.data.id));
    }

    await this.runOperation('User Projects List', 
      () => this.testUserProjectsList());
    
    await this.runOperation('Public Projects List', 
      () => this.testPublicProjectsList());

    // UPDATE tests
    if (completeProject.status === 'PASS') {
      await this.runOperation('Project Update', 
        () => this.testProjectUpdate(completeProject.data.id));
      
      await this.runOperation('Status Update Triggers', 
        () => this.testStatusUpdateTriggers(completeProject.data.id));
    }

    await this.runOperation('Unauthorized Update Prevention', 
      () => this.testUnauthorizedUpdate());

    // DELETE tests
    await this.runOperation('Unauthorized Deletion Prevention', 
      () => this.testUnauthorizedDeletion());

    // Test cascade deletion with remaining project
    if (this.createdProjects.length > 0) {
      const projectForCascade = this.createdProjects[0];
      await this.runOperation('Cascade Deletion', 
        () => this.testCascadeDeletion(projectForCascade));
    }

    // Test regular deletion with remaining projects
    if (this.createdProjects.length > 0) {
      const projectForDeletion = this.createdProjects[0];
      await this.runOperation('Project Deletion', 
        () => this.testProjectDeletion(projectForDeletion));
    }

    // Cleanup remaining test projects
    await this.cleanup();

    const totalExecutionTime = Date.now() - startTime;
    const failed = this.results.filter(r => r.status === 'FAIL');

    const suite: ProjectValidationSuite = {
      totalOperations: this.results.length,
      passed: this.results.filter(r => r.status === 'PASS').length,
      failed: failed.length,
      executionTime: totalExecutionTime,
      results: this.results,
      crudIntegrity: failed.length === 0
    };

    this.logCRUDResults(suite);
    return suite;
  }

  private async cleanup(): Promise<void> {
    console.log(`🧹 Cleaning up ${this.createdProjects.length} test projects...`);
    
    for (const projectId of this.createdProjects) {
      try {
        await fetch(`${this.baseUrl}/api/projects/${projectId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.testUserId}`
          }
        });
      } catch (error) {
        console.warn(`Failed to cleanup project ${projectId}:`, error);
      }
    }
    
    this.createdProjects = [];
  }

  private logCRUDResults(suite: ProjectValidationSuite): void {
    console.log('\n📁 PROJECT CRUD VALIDATION RESULTS');
    console.log('==================================');
    console.log(`📊 Total Operations: ${suite.totalOperations}`);
    console.log(`✅ Passed: ${suite.passed}`);
    console.log(`❌ Failed: ${suite.failed}`);
    console.log(`⏱️  Execution Time: ${suite.executionTime}ms`);
    console.log(`🔄 CRUD Integrity: ${suite.crudIntegrity ? 'INTACT' : 'COMPROMISED'}`);

    console.log('\n📋 Operation Results:');
    console.log('=====================');
    
    suite.results.forEach(result => {
      const statusIcon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${statusIcon} ${result.operation} (${result.executionTime}ms)`);
      
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });

    if (!suite.crudIntegrity) {
      console.log('\n🚨 CRUD INTEGRITY COMPROMISED - Critical operations failing!');
      console.log('Failed operations:');
      
      suite.results
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          console.log(`  • ${result.operation}: ${result.error}`);
        });
    } else {
      console.log('\n🎉 All CRUD operations working correctly - Data integrity maintained!');
    }
  }
}

// Export for use in CI/CD and other test suites
export { ProjectCRUDValidator, type ProjectTestResult, type ProjectValidationSuite };

// Browser console integration
if (typeof window !== 'undefined') {
  const crudValidator = new ProjectCRUDValidator();
  
  (window as any).runProjectCRUDTests = () => crudValidator.runFullCRUDValidation();
}