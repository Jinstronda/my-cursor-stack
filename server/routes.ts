import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./supabaseAuth";
import { generateChatResponse, generateDocument, generateProjectMetadata } from "./services/openai";
import { insertChatSessionSchema, insertMessageSchema, insertDocumentSchema, insertProjectSchema } from "@shared/schema";
import { saveBase64Image } from "./uploads";
import editaisRoutes from "./editais-routes";

// Type for authenticated user
type AuthenticatedUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  profileImageUrl?: string;
  [key: string]: any;
};

// Helper function to get authenticated user from request
const getAuthenticatedUser = (req: any): AuthenticatedUser => {
  return req.user as AuthenticatedUser;
};

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('🚀 Registering server routes...');
  
  // Setup auth middleware
  await setupAuth(app);

  // Auth routes are handled by setupAuth() - no need to duplicate
  console.log('✅ Auth routes registered');

  console.log('🔧 Registering API routes...');

  // Mount editais routes
  app.use('/api/editais', editaisRoutes);
  console.log('✅ Editais routes registered');

  // Update user profile
  app.patch('/api/users/profile', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as AuthenticatedUser;

      const { name, bio, location, website, isProducer } = req.body;
      
      const updatedUser = await storage.updateUser(user.id, {
        name,
        bio,
        location,
        website,
        isProducer,
        updatedAt: new Date(),
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Get user projects/chat sessions
  app.get("/api/chat/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as AuthenticatedUser;
      
      const sessions = await storage.getChatSessionsByUser(user.id);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Create new chat session (protected) - uses existing project or creates new one
  app.post("/api/chat/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const user = getAuthenticatedUser(req);
      
      let project;
      
      // If projectId is provided, use existing project
      if (req.body.projectId) {
        console.log("Using existing project ID:", req.body.projectId);
        project = await storage.getProject(req.body.projectId);
        if (!project || project.userId !== user.id) {
          return res.status(404).json({ message: "Projeto não encontrado ou acesso negado" });
        }
      } else {
        // Only create new project if no projectId provided
        console.log("Creating new project for session");
        project = await storage.createProject({
          name: req.body.title || "Novo Projeto",
          description: "Projeto criado automaticamente",
          userId: user.id
        });
      }
      
      // Create chat session linked to the project
      const validatedData = insertChatSessionSchema.parse({
        ...req.body,
        userId: user.id,
        projectId: project.id
      });
      const session = await storage.createChatSession(validatedData);
      console.log("Created session for project:", project.id, "session:", session.id);
      res.json({ session, project });
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(400).json({ message: "Dados inválidos para criar sessão" });
    }
  });

  // Get chat session (protected)
  app.get("/api/chat/sessions/:id", isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.getChatSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Sessão não encontrada" });
      }
      
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar sessão" });
    }
  });

  // Get chat session by project (protected)
  app.get("/api/projects/:projectId/chat-session", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const user = req.user as AuthenticatedUser;
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if project exists and belongs to user
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== user.id) {
        return res.status(404).json({ message: "Projeto não encontrado" });
      }

      const session = await storage.getChatSessionByProject(projectId);
      
      if (!session) {
        return res.status(404).json({ message: "Sessão não encontrada para este projeto" });
      }
      
      res.json(session);
    } catch (error) {
      console.error("Error getting session by project:", error);
      res.status(500).json({ message: "Erro ao buscar sessão do projeto" });
    }
  });

  // Get messages for a session (protected)
  app.get("/api/chat/sessions/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const user = req.user as AuthenticatedUser;
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Verify user owns this session
      const session = await storage.getChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Sessão não encontrada" });
      }

      // Check if user owns the project that owns this session
      if (!session.projectId) {
        return res.status(400).json({ message: "Sessão inválida - sem projeto associado" });
      }
      const project = await storage.getProject(session.projectId);
      if (!project || project.userId !== user.id) {
        return res.status(403).json({ message: "Acesso negado à sessão" });
      }

      const messages = await storage.getMessagesBySession(sessionId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Erro ao buscar mensagens" });
    }
  });

  // Send message and get AI response (protected)
  app.post("/api/chat/sessions/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const user = req.user as AuthenticatedUser;
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Verify user owns this session
      const session = await storage.getChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Sessão não encontrada" });
      }

      // Check if user owns the project that owns this session
      if (!session.projectId) {
        return res.status(400).json({ message: "Sessão inválida - sem projeto associado" });
      }
      
      const project = await storage.getProject(session.projectId);
      if (!project || project.userId !== user.id) {
        return res.status(403).json({ message: "Acesso negado à sessão" });
      }

      const validatedData = insertMessageSchema.parse({
        ...req.body,
        sessionId,
      });

      // Save user message
      const userMessage = await storage.createMessage(validatedData);

      // Get conversation history for context
      const messageHistory = await storage.getMessagesBySession(sessionId);
      const conversationContext = messageHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));

      // Generate AI response
      const aiResponse = await generateChatResponse(conversationContext);

      // Save AI message
      const aiMessage = await storage.createMessage({
        sessionId,
        role: "assistant",
        content: aiResponse.content,
      });

      // Handle 3-step document creation flow
      console.log("AI Response:", JSON.stringify(aiResponse, null, 2));
      
      // If this is step 1 (nextStep: 'creating'), automatically generate step 2 and 3
      if (aiResponse.nextStep === 'creating') {
        console.log("Step 1 completed, generating step 2 automatically...");
        
        // Wait a bit to simulate thinking
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Generate step 2 message (creating document)
        const step2Message = await storage.createMessage({
          sessionId,
          role: "assistant",
          content: "Agora estou criando o seu documento... Analisando todos os detalhes do seu projeto para gerar um documento completo e profissional.",
        });
        
        // Determine document type based on context
        const projectContext = conversationContext
          .filter(msg => msg.role === "user")
          .map(msg => msg.content)
          .join(" ").toLowerCase();
          
        let documentType = "overview";
        if (projectContext.includes("personagem") || projectContext.includes("character")) {
          documentType = "character";
        } else if (projectContext.includes("orçamento") || projectContext.includes("budget")) {
          documentType = "budget";
        } else if (projectContext.includes("cronograma") || projectContext.includes("schedule")) {
          documentType = "schedule";
        }
        
        // Generate the actual document
        try {
          const documentContent = await generateDocument(documentType, conversationContext
            .filter(msg => msg.role === "user")
            .map(msg => msg.content)
            .join(" "));
          console.log("Document content generated:", documentContent);
          
          const upsertedDocument = await storage.upsertDocument(sessionId, documentType, {
            title: documentContent.title,
            type: documentType,
            content: documentContent,
          });
          console.log("Document upserted in database:", upsertedDocument);

          // Get folder name based on document type
          const folderNames = {
            overview: "Pré-produção",
            character: "Pré-produção", 
            budget: "Produção",
            schedule: "Produção",
            script: "Pós-produção",
            treatment: "Pós-produção"
          };
          const folderName = folderNames[documentType as keyof typeof folderNames] || "Pré-produção";

          // Auto-update project status based on document type
          if (project && session?.projectId) {
            let newStatus = project.status;
            
            if (documentType === 'overview' || documentType === 'character') {
              newStatus = 'pré-produção';
            } else if (documentType === 'budget' || documentType === 'schedule') {
              newStatus = 'produção';
            } else if (documentType === 'script' || documentType === 'treatment') {
              newStatus = 'pós-produção';
            }
            
            // Update project status if it changed
            if (newStatus !== project.status) {
              console.log(`Updating project ${session.projectId} status from "${project.status}" to "${newStatus}"`);
              await storage.updateProject(session.projectId, { status: newStatus });
            }
          }

          // Create step 3 message (confirmation)
          const step3Message = await storage.createMessage({
            sessionId,
            role: "assistant",
            content: `Pronto! Criei o seu documento e adicionei na pasta "${folderName}". Você pode visualizá-lo na barra lateral direita. O que achou?`,
          });
          console.log("Step 3 message created:", step3Message);
        } catch (docError) {
          console.error("Erro ao gerar documento:", docError);
          // Create error message
          await storage.createMessage({
            sessionId,
            role: "assistant",
            content: "Ops! Houve um problema ao gerar o documento. Vamos tentar novamente?",
          });
        }
      }
      // Handle direct document generation (legacy support)
      else if (aiResponse.shouldGenerateDocument && aiResponse.documentType) {
        console.log("Generating document of type:", aiResponse.documentType);
        const projectContext = conversationContext
          .filter(msg => msg.role === "user")
          .map(msg => msg.content)
          .join(" ");

        try {
          const documentContent = await generateDocument(aiResponse.documentType, projectContext);
          console.log("Document content generated:", documentContent);
          
          const upsertedDocument = await storage.upsertDocument(sessionId, aiResponse.documentType, {
            title: documentContent.title,
            type: aiResponse.documentType,
            content: documentContent,
          });
          console.log("Document upserted in database:", upsertedDocument);

          // Auto-update project status based on document type
          if (project && session?.projectId) {
            let newStatus = project.status;
            
            if (aiResponse.documentType === 'overview' || aiResponse.documentType === 'character') {
              newStatus = 'pré-produção';
            } else if (aiResponse.documentType === 'budget' || aiResponse.documentType === 'schedule') {
              newStatus = 'produção';
            } else if (aiResponse.documentType === 'script' || aiResponse.documentType === 'treatment') {
              newStatus = 'pós-produção';
            }
            
            // Update project status if it changed
            if (newStatus !== project.status) {
              console.log(`Updating project ${session.projectId} status from "${project.status}" to "${newStatus}" (legacy path)`);
              await storage.updateProject(session.projectId, { status: newStatus });
            }
          }

          // Create follow-up message after document generation
          const followUpMessage = await storage.createMessage({
            sessionId,
            role: "assistant",
            content: "Acabei de construir os documentos. Dá uma olhada e veja o que achou!",
          });
          console.log("Follow-up message created:", followUpMessage);
        } catch (docError) {
          console.error("Erro ao gerar documento:", docError);
          // Continue without failing the chat response
        }
      } else {
        console.log("No document generation requested");
      }

      res.json({ 
        userMessage, 
        aiMessage,
        documentGenerated: aiResponse.shouldGenerateDocument || aiResponse.nextStep === 'creating',
        documentType: aiResponse.documentType || 'overview',
        nextStep: aiResponse.nextStep
      });
    } catch (error) {
      console.error("Erro ao processar mensagem:", error);
      res.status(500).json({ message: "Erro ao processar mensagem" });
    }
  });

  // Get documents for a session (protected)
  app.get("/api/chat/sessions/:id/documents", isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const user = req.user as AuthenticatedUser;
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Verify user owns this session
      const session = await storage.getChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Sessão não encontrada" });
      }

      // Check if user owns the project that owns this session
      if (!session.projectId) {
        return res.status(400).json({ message: "Sessão inválida - sem projeto associado" });
      }
      const project = await storage.getProject(session.projectId);
      if (!project || project.userId !== user.id) {
        return res.status(403).json({ message: "Acesso negado à sessão" });
      }

      console.log("Fetching documents for session:", sessionId);
      const documents = await storage.getDocumentsBySession(sessionId);
      console.log("Found documents:", documents);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Erro ao buscar documentos" });
    }
  });

  // Get specific document by type (protected)
  app.get("/api/chat/sessions/:id/documents/:type", isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const { type } = req.params;
      const user = req.user as AuthenticatedUser;
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Verify user owns this session
      const session = await storage.getChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Sessão não encontrada" });
      }

      // Check if user owns the project that owns this session
      if (!session.projectId) {
        return res.status(400).json({ message: "Sessão inválida - sem projeto associado" });
      }
      const project = await storage.getProject(session.projectId);
      if (!project || project.userId !== user.id) {
        return res.status(403).json({ message: "Acesso negado à sessão" });
      }

      const document = await storage.getDocumentBySessionAndType(sessionId, type);
      
      if (!document) {
        return res.status(404).json({ message: "Documento não encontrado" });
      }
      
      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar documento" });
    }
  });

  // Update specific section of a document (protected)
  app.patch("/api/chat/sessions/:sessionId/documents/:documentId/sections/:sectionIndex", isAuthenticated, async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const documentId = parseInt(req.params.documentId);
      const sectionIndex = parseInt(req.params.sectionIndex);
      const user = req.user as AuthenticatedUser;
      
      // Validate parameters
      if (isNaN(sessionId) || isNaN(documentId) || isNaN(sectionIndex)) {
        return res.status(400).json({
          success: false,
          error: "Invalid parameters",
          code: "INVALID_PARAMS"
        });
      }
      
      // Verify user owns this session
      const session = await storage.getChatSession(sessionId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: "Session not found",
          code: "SESSION_NOT_FOUND"
        });
      }

      // Check if user owns the project that owns this session
      if (session.projectId) {
        const project = await storage.getProject(session.projectId);
        if (!project || project.userId !== user.id) {
          return res.status(403).json({
            success: false,
            error: "You don't have permission to edit this document",
            code: "UNAUTHORIZED"
          });
        }
      }
      
      // Validate request body
      const { content, heading } = req.body;
      if (content === undefined && heading === undefined) {
        return res.status(400).json({
          success: false,
          error: "Either content or heading must be provided",
          code: "MISSING_UPDATES"
        });
      }
      
      // Update section using storage method
      try {
        const updatedDocument = await storage.updateDocumentSection(
          documentId,
          sectionIndex,
          { content, heading }
        );
        
        if (!updatedDocument) {
          return res.status(400).json({
            success: false,
            error: "Section index out of bounds or document not found",
            code: "INVALID_SECTION_INDEX"
          });
        }
        
        // Return success response
        const updatedContent = updatedDocument.content as any;
        const updatedSection = updatedContent.sections?.[sectionIndex];
        
        res.json({
          success: true,
          document: updatedDocument,
          updatedSection: {
            index: sectionIndex,
            heading: updatedSection?.heading || '',
            content: updatedSection?.content || content,
            updatedAt: updatedDocument.updatedAt.toISOString()
          },
          message: "Section updated successfully"
        });
        
      } catch (error) {
        console.error("Error updating document section:", error);
        
        if (error instanceof Error && error.message.includes('out of bounds')) {
          return res.status(400).json({
            success: false,
            error: error.message,
            code: "INVALID_SECTION_INDEX"
          });
        }
        
        return res.status(500).json({
          success: false,
          error: "Failed to update section",
          code: "UPDATE_FAILED"
        });
      }
      
    } catch (error) {
      console.error("Error in PATCH section endpoint:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR"
      });
    }
  });

  // Projects API
  // Get user's projects
  app.get("/api/projects/my", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as AuthenticatedUser;
      if (!user) {
        console.log("❌ No user found in request");
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log("🔍 DEBUG - Fetching projects for user:", {
        userId: user.id,
        email: user.email,
        name: user.name
      });
      
      const projects = await storage.getProjectsByUser(user.id);
      
      console.log("📊 DEBUG - Query results:", {
        userId: user.id,
        projectCount: projects.length,
        projectIds: projects.map(p => p.id),
        projectNames: projects.map(p => p.name)
      });
      
      res.json(projects);
    } catch (error) {
      console.error("Error fetching user projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  // Get public projects (community projects)
  app.get("/api/projects/community", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const projects = await storage.getPublicProjects(limit);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching community projects:", error);
      res.status(500).json({ message: "Failed to fetch community projects" });
    }
  });

  // Create project
  app.post("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as AuthenticatedUser;
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log("=== PROJECT CREATION DEBUG ===");
      console.log("User:", { id: user.id, email: user.email });
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      
      // If description is provided, generate AI title and description
      let projectData = {
        ...req.body,
        userId: user.id
      };

      console.log("Initial project data:", JSON.stringify(projectData, null, 2));

      // Check if user already has a project with similar content to prevent duplicates
      if (req.body.name === "Novo Projeto" && req.body.description?.length > 10) {
        console.log("Checking for existing projects with similar content...");
        const userProjects = await storage.getProjectsByUser(user.id);
        const existingProject = userProjects.find(p => 
          p.description && p.description.includes(req.body.description.substring(0, 30))
        );
        
        if (existingProject) {
          console.log("Found existing project, returning it instead of creating duplicate:", existingProject);
          return res.json(existingProject);
        }
      }

      // If this is from onboarding (description contains user's initial message)
      if (req.body.description && req.body.description.length > 10 && req.body.name === "Novo Projeto") {
        try {
          console.log("Generating AI metadata for project creation with initial message:", req.body.description);
          const metadata = await generateProjectMetadata(req.body.description);
          projectData.name = metadata.title;
          projectData.description = metadata.description;
          console.log("Generated project metadata:", metadata);
        } catch (error) {
          console.error("Error generating project metadata:", error);
          // Continue with original data if AI generation fails
        }
      }

      console.log("Final project data before validation:", JSON.stringify(projectData, null, 2));
      
      try {
        const validatedData = insertProjectSchema.parse(projectData);
        console.log("Validation successful, validated data:", JSON.stringify(validatedData, null, 2));
        const project = await storage.createProject(validatedData);
        console.log("Project created successfully:", project.id);
        res.json(project);
      } catch (validationError) {
        console.error("=== VALIDATION ERROR ===");
        console.error("Validation failed:", validationError);
        if (validationError instanceof Error) {
          console.error("Validation error message:", validationError.message);
          console.error("Validation error details:", JSON.stringify(validationError, null, 2));
        }
        throw validationError;
      }
    } catch (error) {
      console.error("Error creating project:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      res.status(400).json({ message: "Dados inválidos para criar projeto" });
    }
  });

  // Update project
  app.patch("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const user = req.user as AuthenticatedUser;
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user owns the project (convert both to numbers for comparison)
      const existingProject = await storage.getProject(projectId);
      if (!existingProject || existingProject.userId !== user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // If changing status to 'pré-produção', make project public
      const updates = { ...req.body };
      if (updates.status === 'pré-produção') {
        updates.isPublic = true;
      }

      const project = await storage.updateProject(projectId, updates);
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Get specific project
  app.get("/api/projects/:id", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  // Get chat session for project (protected)
  app.get("/api/projects/:id/chat-session", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const user = req.user as AuthenticatedUser;
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if user owns the project
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== user.id) {
        return res.status(403).json({ message: "Not authorized to access this project" });
      }
      
      // Get chat session for this project
      const session = await storage.getChatSessionByProject(projectId);
      if (!session) {
        return res.status(404).json({ message: "No chat session found for this project" });
      }
      
      res.json(session);
    } catch (error) {
      console.error("Error fetching project chat session:", error);
      res.status(500).json({ message: "Failed to fetch chat session" });
    }
  });

  // Delete project (protected)
  app.delete("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const user = req.user as AuthenticatedUser;
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get the project to verify ownership
      const project = await storage.getProject(projectId);
      console.log("Delete attempt - User ID:", user.id, "Project:", project);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if the user owns the project (convert both to numbers for comparison)
      if (project.userId !== user.id) {
        return res.status(403).json({ message: "Not authorized to delete this project" });
      }
      
      // Delete the project (this will also cascade delete related data like chat sessions)
      await storage.deleteProject(projectId);
      
      res.status(204).send(); // 204 No Content for successful deletion
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Production Companies routes
  // Get all production companies (public)
  app.get("/api/production-companies", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const companies = await storage.getAllProductionCompanies(limit);
      res.json(companies);
    } catch (error) {
      console.error("Error fetching production companies:", error);
      res.status(500).json({ message: "Failed to fetch production companies" });
    }
  });

  // Get user's production company (protected)
  app.get("/api/production-companies/user", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as AuthenticatedUser;
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const companies = await storage.getProductionCompaniesByUser(user.id);
      const company = companies.length > 0 ? companies[0] : null;
      
      if (!company) {
        return res.status(404).json({ message: "No production company found" });
      }
      
      res.json(company);
    } catch (error) {
      console.error("Error fetching user production company:", error);
      res.status(500).json({ message: "Failed to fetch production company" });
    }
  });

  // Get user's production companies (protected)
  app.get("/api/production-companies/my", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as AuthenticatedUser;
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const companies = await storage.getProductionCompaniesByUser(user.id);
      res.json(companies);
    } catch (error) {
      console.error("Error fetching user production companies:", error);
      res.status(500).json({ message: "Failed to fetch production companies" });
    }
  });

  // Get specific production company
  app.get("/api/production-companies/:id", async (req, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const company = await storage.getProductionCompanyWithOwner(companyId);
      
      if (!company) {
        return res.status(404).json({ message: "Production company not found" });
      }
      
      res.json(company);
    } catch (error) {
      console.error("Error fetching production company:", error);
      res.status(500).json({ message: "Failed to fetch production company" });
    }
  });

  // Create production company (protected)
  app.post("/api/production-companies", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as AuthenticatedUser;
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const companyData = { ...req.body, ownerId: user.id };
      const company = await storage.createProductionCompany(companyData);
      res.status(201).json(company);
    } catch (error) {
      console.error("Error creating production company:", error);
      res.status(500).json({ message: "Failed to create production company" });
    }
  });

  // Update production company (protected)
  app.patch("/api/production-companies/:id", isAuthenticated, async (req: any, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const user = req.user as AuthenticatedUser;
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user owns the company
      const existingCompany = await storage.getProductionCompany(companyId);
      if (!existingCompany || existingCompany.ownerId !== user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const updateData = { ...req.body };

      // Process cover image if it's base64
      if (updateData.coverImage && updateData.coverImage.startsWith('data:image/')) {
        try {
          updateData.coverImage = await saveBase64Image(updateData.coverImage);
        } catch (error) {
          console.error("Error saving cover image:", error);
          return res.status(400).json({ message: "Invalid cover image format" });
        }
      }

      // Process gallery images if they contain base64
      if (updateData.images && Array.isArray(updateData.images)) {
        const processedImages = [];
        for (const image of updateData.images) {
          if (image.startsWith('data:image/')) {
            try {
              const processedImage = await saveBase64Image(image);
              processedImages.push(processedImage);
            } catch (error) {
              console.error("Error saving gallery image:", error);
              return res.status(400).json({ message: "Invalid gallery image format" });
            }
          } else {
            processedImages.push(image);
          }
        }
        updateData.images = processedImages;
      }

      const company = await storage.updateProductionCompany(companyId, updateData);
      res.json(company);
    } catch (error) {
      console.error("Error updating production company:", error);
      res.status(500).json({ message: "Failed to update production company" });
    }
  });

  // Delete production company (protected)
  app.delete("/api/production-companies/:id", isAuthenticated, async (req: any, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const user = req.user as AuthenticatedUser;
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user owns the company (convert both to numbers for comparison)
      const existingCompany = await storage.getProductionCompany(companyId);
      if (!existingCompany || existingCompany.ownerId !== user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.deleteProductionCompany(companyId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting production company:", error);
      res.status(500).json({ message: "Failed to delete production company" });
    }
  });

  console.log('✅ All API routes registered successfully');
  
  const httpServer = createServer(app);
  return httpServer;
}
