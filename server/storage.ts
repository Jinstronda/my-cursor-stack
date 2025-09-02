import { 
  users, 
  projects,
  productionCompanies,
  chatSessions, 
  messages, 
  documents,
  editais,
  editalPdfs,
  type User, 
  type InsertUser,
  type UpsertUser,
  type Project,
  type InsertProject,
  type ProductionCompany,
  type InsertProductionCompany,
  type ProductionCompanyWithOwner,
  type ChatSession,
  type InsertChatSession,
  type Message,
  type InsertMessage,
  type Document,
  type InsertDocument,
  type Edital,
  type InsertEdital,
  type EditalPdf,
  type InsertEditalPdf,
  type EditalWithPdfs
} from "@shared/schema";
import { db } from "./db";
import { supabaseAdmin } from "./supabaseClient";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Projects
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByUser(userId: string): Promise<Project[]>;
  getPublicProjects(limit?: number): Promise<Project[]>;
  updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<void>;

  // Production Companies
  createProductionCompany(company: InsertProductionCompany): Promise<ProductionCompany>;
  getProductionCompany(id: number): Promise<ProductionCompany | undefined>;
  getProductionCompanyWithOwner(id: number): Promise<ProductionCompanyWithOwner | undefined>;
  getProductionCompaniesByUser(userId: string): Promise<ProductionCompany[]>;
  getAllProductionCompanies(limit?: number): Promise<ProductionCompany[]>;
  updateProductionCompany(id: number, updates: Partial<ProductionCompany>): Promise<ProductionCompany | undefined>;
  deleteProductionCompany(id: number): Promise<void>;

  // Chat Sessions
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  getChatSession(id: number): Promise<ChatSession | undefined>;
  getChatSessionsByUser(userId: string): Promise<ChatSession[]>;
  getChatSessionByProject(projectId: number): Promise<ChatSession | undefined>;
  updateChatSession(id: number, updates: Partial<ChatSession>): Promise<ChatSession | undefined>;

  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesBySession(sessionId: number): Promise<Message[]>;

  // Documents
  createDocument(document: InsertDocument): Promise<Document>;
  getDocumentsBySession(sessionId: number): Promise<Document[]>;
  getDocumentBySessionAndType(sessionId: number, type: string): Promise<Document | undefined>;
  updateDocument(id: number, updates: Partial<Document>): Promise<Document | undefined>;
  upsertDocument(sessionId: number, type: string, documentData: Omit<InsertDocument, 'sessionId'>): Promise<Document>;
  updateDocumentSection(documentId: number, sectionIndex: number, updates: { content?: any; heading?: string }): Promise<Document | undefined>;

  // Editais
  createEdital(edital: InsertEdital): Promise<Edital>;
  getEdital(id: number): Promise<Edital | undefined>;
  getEditalWithPdfs(id: number): Promise<EditalWithPdfs | undefined>;
  getAllEditais(limit?: number): Promise<Edital[]>;
  getEditaisByStatus(status: string, limit?: number): Promise<Edital[]>;
  updateEdital(id: number, updates: Partial<Edital>): Promise<Edital | undefined>;
  deleteEdital(id: number): Promise<void>;

  // Edital PDFs
  createEditalPdf(pdf: InsertEditalPdf): Promise<EditalPdf>;
  getEditalPdfs(editalId: number): Promise<EditalPdf[]>;
  updateEditalPdf(id: number, updates: Partial<EditalPdf>): Promise<EditalPdf | undefined>;
  markPdfAsProcessed(id: number, extractedContent: string, aiSummary: string): Promise<EditalPdf | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Check if database is available
  private checkDatabase() {
    if (!db) {
      throw new Error('❌ Database connection not available. Check DATABASE_URL configuration and restart the server.');
    }
  }

  // Users - Use Supabase admin client to bypass RLS for service operations
  async getUser(id: string): Promise<User | undefined> {
    this.checkDatabase();
    
    // Use Supabase admin client for user operations to bypass RLS issues
    if (supabaseAdmin) {
      console.log('🔧 Using Supabase admin client for getUser:', id);
      try {
        const { data, error } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          console.log('⚠️ Supabase getUser error:', error.message);
          // Fallback to direct DB if Supabase fails
        } else {
          console.log('✅ Supabase getUser success');
          return data as User;
        }
      } catch (supabaseError) {
        console.log('⚠️ Supabase getUser exception:', supabaseError);
        // Fallback to direct DB
      }
    }
    
    // Fallback to direct database connection
    console.log('🔧 Using direct DB connection for getUser:', id);
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    this.checkDatabase();
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    this.checkDatabase();
    console.log('💾 DatabaseStorage.upsertUser called:', {
      email: userData.email,
      name: userData.name,
      dbExists: !!db
    });
    
    try {
      // Check if user exists by email first
      const existingUser = await this.getUserByEmail(userData.email);
      
      if (existingUser) {
        console.log('🔄 Updating existing user:', existingUser.id);
        // Update existing user
        const [user] = await db
          .update(users)
          .set({
            ...userData,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id))
          .returning();
        console.log('✅ User updated successfully:', user.id);
        return user;
      } else {
        console.log('➕ Creating new user');
        // Create new user
        const [user] = await db
          .insert(users)
          .values(userData)
          .returning();
        console.log('✅ User created successfully:', user.id);
        return user;
      }
    } catch (error) {
      console.error('❌ DatabaseStorage.upsertUser error:', error);
      throw error;
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    this.checkDatabase();
    
    // Use Supabase admin client for user operations to bypass RLS issues
    if (supabaseAdmin) {
      console.log('🔧 Using Supabase admin client for updateUser:', id);
      try {
        const { data, error } = await supabaseAdmin
          .from('users')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        
        if (error) {
          console.log('⚠️ Supabase updateUser error:', error.message);
          // Fallback to direct DB if Supabase fails
        } else {
          console.log('✅ Supabase updateUser success');
          return data as User;
        }
      } catch (supabaseError) {
        console.log('⚠️ Supabase updateUser exception:', supabaseError);
        // Fallback to direct DB
      }
    }
    
    // Fallback to direct database connection
    console.log('🔧 Using direct DB connection for updateUser:', id);
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Projects
  async createProject(insertProject: InsertProject): Promise<Project> {
    this.checkDatabase();
    const [project] = await db
      .insert(projects)
      .values(insertProject)
      .returning();
    return project;
  }

  async getProject(id: number): Promise<Project | undefined> {
    this.checkDatabase();
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectsByUser(userId: string): Promise<Project[]> {
    this.checkDatabase();
    
    console.log("🔍 DATABASE DEBUG - getProjectsByUser called with:", {
      userId,
      userIdType: typeof userId,
      userIdLength: userId?.length
    });
    
    const result = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.updatedAt));
      
    console.log("📊 DATABASE DEBUG - getProjectsByUser results:", {
      userId,
      resultCount: result.length,
      resultIds: result.map(p => p.id),
      resultUserIds: result.map(p => p.userId),
      resultNames: result.map(p => p.name)
    });
    
    return result;
  }

  async getPublicProjects(limit: number = 20): Promise<Project[]> {
    this.checkDatabase();
    return await db
      .select()
      .from(projects)
      .where(eq(projects.status, 'pré-produção'))
      .orderBy(desc(projects.updatedAt))
      .limit(limit);
  }

  async updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined> {
    this.checkDatabase();
    const [project] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: number): Promise<void> {
    this.checkDatabase();
    // First, get all chat sessions for this project
    const projectChatSessions = await db
      .select({ id: chatSessions.id })
      .from(chatSessions)
      .where(eq(chatSessions.projectId, id));

    // Delete in the correct order to avoid foreign key constraint violations
    for (const session of projectChatSessions) {
      // 1. Delete documents for each session
      await db.delete(documents).where(eq(documents.sessionId, session.id));
      
      // 2. Delete messages for each session
      await db.delete(messages).where(eq(messages.sessionId, session.id));
    }

    // 3. Delete chat sessions
    await db.delete(chatSessions).where(eq(chatSessions.projectId, id));

    // 4. Finally, delete the project
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Chat Sessions
  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    this.checkDatabase();
    const [session] = await db
      .insert(chatSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async getChatSession(id: number): Promise<ChatSession | undefined> {
    this.checkDatabase();
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
    return session;
  }

  async getChatSessionsByUser(userId: string): Promise<ChatSession[]> {
    this.checkDatabase();
    return await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.updatedAt));
  }

  async getChatSessionByProject(projectId: number): Promise<ChatSession | undefined> {
    this.checkDatabase();
    const [session] = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.projectId, projectId));
    return session;
  }

  async updateChatSession(id: number, updates: Partial<ChatSession>): Promise<ChatSession | undefined> {
    this.checkDatabase();
    const [session] = await db
      .update(chatSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(chatSessions.id, id))
      .returning();
    return session;
  }

  // Messages
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    this.checkDatabase();
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getMessagesBySession(sessionId: number): Promise<Message[]> {
    this.checkDatabase();
    return await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(messages.createdAt);
  }

  // Documents
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    this.checkDatabase();
    const [document] = await db
      .insert(documents)
      .values(insertDocument)
      .returning();
    return document;
  }

  async getDocumentsBySession(sessionId: number): Promise<Document[]> {
    this.checkDatabase();
    try {
      console.log("Storage: getDocumentsBySession called with sessionId:", sessionId);
      const result = await db
        .select()
        .from(documents)
        .where(eq(documents.sessionId, sessionId))
        .orderBy(documents.createdAt);
      console.log("Storage: getDocumentsBySession result:", result);
      return result;
    } catch (error) {
      console.error("Storage: Error in getDocumentsBySession:", error);
      throw error;
    }
  }

  async getDocumentBySessionAndType(sessionId: number, type: string): Promise<Document | undefined> {
    this.checkDatabase();
    const [document] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.sessionId, sessionId), eq(documents.type, type)))
      .orderBy(desc(documents.updatedAt));
    return document;
  }

  async updateDocument(id: number, updates: Partial<Document>): Promise<Document | undefined> {
    this.checkDatabase();
    const [document] = await db
      .update(documents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return document;
  }

  async upsertDocument(sessionId: number, type: string, documentData: Omit<InsertDocument, 'sessionId'>): Promise<Document> {
    this.checkDatabase();
    // First, try to find existing document of this type for this session
    const existingDocument = await this.getDocumentBySessionAndType(sessionId, type);
    
    if (existingDocument) {
      // Update existing document
      console.log(`Updating existing ${type} document with ID: ${existingDocument.id}`);
      const updatedDocument = await this.updateDocument(existingDocument.id, {
        title: documentData.title,
        content: documentData.content,
      });
      return updatedDocument!;
    } else {
      // Create new document
      console.log(`Creating new ${type} document for session: ${sessionId}`);
      const newDocument = await this.createDocument({
        sessionId,
        ...documentData
      });
      return newDocument;
    }
  }

  async updateDocumentSection(
    documentId: number, 
    sectionIndex: number, 
    updates: { content?: any; heading?: string }
  ): Promise<Document | undefined> {
    this.checkDatabase();
    try {
      console.log('🔧 BACKEND updateDocumentSection - INICIANDO:', {
        documentId,
        sectionIndex,
        updates,
        hasContent: !!updates.content,
        hasHeading: !!updates.heading,
        timestamp: new Date().toISOString()
      });

      // 1. Get current document
      const [currentDoc] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId));
        
      if (!currentDoc) {
        console.error('🔧 BACKEND updateDocumentSection - DOCUMENTO NÃO ENCONTRADO:', documentId);
        return undefined;
      }
      
      // 2. Parse content
      const content = currentDoc.content as any;
      if (!content.sections || !Array.isArray(content.sections)) {
        console.error('🔧 BACKEND updateDocumentSection - ESTRUTURA INVÁLIDA:', content);
        throw new Error('Invalid document structure - sections not found');
      }
      
      // 3. Validate section index
      if (sectionIndex < 0 || sectionIndex >= content.sections.length) {
        console.error('🔧 BACKEND updateDocumentSection - ÍNDICE FORA DOS LIMITES:', {
          sectionIndex,
          sectionsLength: content.sections.length,
          sections: content.sections.map((s: any, i: number) => ({ index: i, heading: s.heading, hasContent: !!s.content }))
        });
        throw new Error(`Section index ${sectionIndex} out of bounds`);
      }
      
      // 4. Log current section state before update
      const currentSection = content.sections[sectionIndex];
      console.log('🔧 BACKEND updateDocumentSection - SEÇÃO ANTES DO UPDATE:', {
        sectionIndex,
        currentSection: {
          heading: currentSection.heading,
          content: typeof currentSection.content === 'string' ? currentSection.content.substring(0, 100) + '...' : currentSection.content,
          hasHeading: !!currentSection.heading,
          hasContent: !!currentSection.content
        }
      });

      // 🛡️ VALIDATION: Prevent accidental heading loss
      if (updates.content !== undefined && updates.heading === undefined && currentSection.heading) {
        console.warn('🔧 BACKEND updateDocumentSection - AVISO: Atualizando conteúdo sem especificar heading. Heading existente será preservado:', {
          sectionIndex,
          currentHeading: currentSection.heading,
          contentUpdate: typeof updates.content === 'string' 
            ? updates.content.substring(0, 50) + '...' 
            : updates.content
        });
      }

      // 🚨 CRITICAL VALIDATION: Detect potential title loss scenarios  
      if (updates.heading === '' || updates.heading === null) {
        console.error('🔧 BACKEND updateDocumentSection - TENTATIVA DE LIMPAR HEADING DETECTADA:', {
          sectionIndex,
          currentHeading: currentSection.heading,
          attemptedHeading: updates.heading,
          timestamp: new Date().toISOString()
        });
        throw new Error(`Invalid attempt to clear heading for section ${sectionIndex}. Use explicit heading update instead.`);
      }
      
      // 5. Update specific section with explicit heading preservation
      const updatedSections = [...content.sections];
      
      // 🛡️ CRITICAL FIX: Build the updated section with explicit heading preservation
      const updatedSection = { ...currentSection };
      
      // Apply content update if provided
      if (updates.content !== undefined) {
        updatedSection.content = updates.content;
      }
      
      // Apply heading update if provided, otherwise preserve existing
      if (updates.heading !== undefined) {
        updatedSection.heading = updates.heading;
      }
      // Heading is preserved from currentSection spread above
      
      updatedSections[sectionIndex] = updatedSection;

      // 6. Log section state after update
      console.log('🔧 BACKEND updateDocumentSection - SEÇÃO APÓS UPDATE:', {
        sectionIndex,
        updatedSection: {
          heading: updatedSection.heading,
          content: typeof updatedSection.content === 'string' 
            ? updatedSection.content.substring(0, 100) + '...' 
            : updatedSection.content,
          hasHeading: !!updatedSection.heading,
          hasContent: !!updatedSection.content
        },
        headingPreserved: updates.heading === undefined && !!currentSection.heading,
        headingUpdated: updates.heading !== undefined,
        contentUpdated: updates.content !== undefined
      });
      
      // 7. Save updated document
      const updatedContent = {
        ...content,
        sections: updatedSections
      };
      
      console.log('🔧 BACKEND updateDocumentSection - SALVANDO NO BANCO:', {
        documentId,
        sectionIndex,
        totalSections: updatedContent.sections.length,
        updatedSectionSummary: {
          heading: updatedContent.sections[sectionIndex].heading,
          hasContent: !!updatedContent.sections[sectionIndex].content,
          hasHeading: !!updatedContent.sections[sectionIndex].heading
        }
      });
      
      const [updatedDoc] = await db
        .update(documents)
        .set({ 
          content: updatedContent, 
          updatedAt: new Date() 
        })
        .where(eq(documents.id, documentId))
        .returning();

      console.log('🔧 BACKEND updateDocumentSection - SALVO COM SUCESSO:', {
        documentId: updatedDoc.id,
        sectionIndex,
        finalSectionState: {
          heading: updatedDoc.content.sections[sectionIndex].heading,
          hasContent: !!updatedDoc.content.sections[sectionIndex].content,
          hasHeading: !!updatedDoc.content.sections[sectionIndex].heading
        },
        timestamp: new Date().toISOString()
      });
        
      return updatedDoc;
    } catch (error) {
      console.error('🔧 BACKEND updateDocumentSection - ERRO:', {
        documentId,
        sectionIndex,
        updates,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  // Production Companies
  async createProductionCompany(insertCompany: InsertProductionCompany): Promise<ProductionCompany> {
    this.checkDatabase();
    const [company] = await db
      .insert(productionCompanies)
      .values(insertCompany)
      .returning();
    return company;
  }

  async getProductionCompany(id: number): Promise<ProductionCompany | undefined> {
    this.checkDatabase();
    const [company] = await db.select().from(productionCompanies).where(eq(productionCompanies.id, id));
    return company;
  }

  async getProductionCompanyWithOwner(id: number): Promise<ProductionCompanyWithOwner | undefined> {
    this.checkDatabase();
    const [result] = await db
      .select({
        // Production company fields
        id: productionCompanies.id,
        name: productionCompanies.name,
        description: productionCompanies.description,
        location: productionCompanies.location,
        contactEmail: productionCompanies.contactEmail,
        contactPhone: productionCompanies.contactPhone,
        website: productionCompanies.website,
        services: productionCompanies.services,
        planType: productionCompanies.planType,
        rating: productionCompanies.rating,
        reviewCount: productionCompanies.reviewCount,
        verified: productionCompanies.verified,
        ownerId: productionCompanies.ownerId,
        createdAt: productionCompanies.createdAt,
        logo: productionCompanies.logo,
        coverImage: productionCompanies.coverImage,
        images: productionCompanies.images,
        // Owner fields
        ownerName: users.name,
        ownerProfileImageUrl: users.profileImageUrl,
        ownerEmail: users.email,
      })
      .from(productionCompanies)
      .leftJoin(users, eq(productionCompanies.ownerId, users.id))
      .where(eq(productionCompanies.id, id));

    if (!result) return undefined;

    const { ownerName, ownerProfileImageUrl, ownerEmail, ...company } = result;
    
    return {
      ...company,
      owner: ownerName ? {
        name: ownerName,
        email: ownerEmail || '',
        profileImageUrl: ownerProfileImageUrl || null,
      } : undefined
    };
  }

  async getProductionCompaniesByUser(userId: string): Promise<ProductionCompany[]> {
    this.checkDatabase();
    return await db
      .select()
      .from(productionCompanies)
      .where(eq(productionCompanies.ownerId, userId))
      .orderBy(desc(productionCompanies.createdAt));
  }

  async getAllProductionCompanies(limit: number = 50): Promise<ProductionCompany[]> {
    this.checkDatabase();
    return await db
      .select()
      .from(productionCompanies)
      .orderBy(desc(productionCompanies.rating), desc(productionCompanies.createdAt))
      .limit(limit);
  }

  async updateProductionCompany(id: number, updates: Partial<ProductionCompany>): Promise<ProductionCompany | undefined> {
    this.checkDatabase();
    const [company] = await db
      .update(productionCompanies)
      .set(updates)
      .where(eq(productionCompanies.id, id))
      .returning();
    return company;
  }

  async deleteProductionCompany(id: number): Promise<void> {
    this.checkDatabase();
    await db.delete(productionCompanies).where(eq(productionCompanies.id, id));
  }

  // Editais implementation
  async createEdital(insertEdital: InsertEdital): Promise<Edital> {
    this.checkDatabase();
    const [edital] = await db
      .insert(editais)
      .values(insertEdital)
      .returning();
    return edital;
  }

  async getEdital(id: number): Promise<Edital | undefined> {
    this.checkDatabase();
    const [edital] = await db.select().from(editais).where(eq(editais.id, id));
    return edital;
  }

  async getEditalWithPdfs(id: number): Promise<EditalWithPdfs | undefined> {
    this.checkDatabase();
    const [edital] = await db.select().from(editais).where(eq(editais.id, id));
    if (!edital) return undefined;
    
    const pdfs = await db.select().from(editalPdfs).where(eq(editalPdfs.editalId, id));
    
    return {
      ...edital,
      pdfs
    };
  }

  async getAllEditais(limit: number = 50): Promise<Edital[]> {
    this.checkDatabase();
    return await db
      .select()
      .from(editais)
      .orderBy(desc(editais.createdAt))
      .limit(limit);
  }

  async getEditaisByStatus(status: string, limit: number = 50): Promise<Edital[]> {
    this.checkDatabase();
    return await db
      .select()
      .from(editais)
      .where(eq(editais.status, status))
      .orderBy(desc(editais.createdAt))
      .limit(limit);
  }

  async updateEdital(id: number, updates: Partial<Edital>): Promise<Edital | undefined> {
    this.checkDatabase();
    const [edital] = await db
      .update(editais)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(editais.id, id))
      .returning();
    return edital;
  }

  async deleteEdital(id: number): Promise<void> {
    this.checkDatabase();
    // PDFs will be deleted by cascade
    await db.delete(editais).where(eq(editais.id, id));
  }

  // Edital PDFs implementation
  async createEditalPdf(insertPdf: InsertEditalPdf): Promise<EditalPdf> {
    this.checkDatabase();
    const [pdf] = await db
      .insert(editalPdfs)
      .values(insertPdf)
      .returning();
    return pdf;
  }

  async getEditalPdfs(editalId: number): Promise<EditalPdf[]> {
    this.checkDatabase();
    return await db
      .select()
      .from(editalPdfs)
      .where(eq(editalPdfs.editalId, editalId))
      .orderBy(editalPdfs.uploadedAt);
  }

  async updateEditalPdf(id: number, updates: Partial<EditalPdf>): Promise<EditalPdf | undefined> {
    this.checkDatabase();
    const [pdf] = await db
      .update(editalPdfs)
      .set(updates)
      .where(eq(editalPdfs.id, id))
      .returning();
    return pdf;
  }

  async markPdfAsProcessed(id: number, extractedContent: string, aiSummary: string): Promise<EditalPdf | undefined> {
    this.checkDatabase();
    const [pdf] = await db
      .update(editalPdfs)
      .set({
        aiProcessed: true,
        extractedContent,
        aiSummary,
        processedAt: new Date()
      })
      .where(eq(editalPdfs.id, id))
      .returning();
    return pdf;
  }
}

// Mock storage for development without database
export class MockStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private projects: Map<number, Project> = new Map();
  private companies: Map<number, ProductionCompany> = new Map();
  private sessions: Map<number, ChatSession> = new Map();
  private messages: Map<number, Message[]> = new Map();
  private documents: Map<number, Document[]> = new Map();
  private nextId = 1;

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of Array.from(this.users.values())) {
      if (user.email === email) return user;
    }
    return undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = await this.getUserByEmail(userData.email);
    const user: User = {
      id: existingUser?.id || userData.id || `user_${this.nextId++}`,
      email: userData.email,
      username: userData.username || userData.email.split('@')[0],
      name: userData.name || userData.username || 'Demo User',
      password: existingUser?.password || '', // Required field, use existing or empty
      bio: userData.bio || null,
      avatar: userData.profileImageUrl || null,
      location: userData.location || null,
      website: userData.website || null,
      isProducer: userData.isProducer || false,
      planType: existingUser?.planType || 'free',
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async createProject(projectData: InsertProject): Promise<Project> {
    const project: Project = {
      id: this.nextId++,
      name: projectData.name,
      description: projectData.description || null,
      status: projectData.status || 'esboço',
      genre: projectData.genre || null,
      budget: projectData.budget || null,
      userId: projectData.userId,
      isPublic: projectData.isPublic || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.projects.set(project.id, project);
    return project;
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjectsByUser(userId: string): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(p => p.userId === userId);
  }

  async getPublicProjects(limit: number = 20): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(p => p.isPublic).slice(0, limit);
  }

  async updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    const updatedProject = { ...project, ...updates, updatedAt: new Date() };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: number): Promise<void> {
    this.projects.delete(id);
    this.sessions.delete(id);
    this.messages.delete(id);
    this.documents.delete(id);
  }

  async createChatSession(sessionData: InsertChatSession): Promise<ChatSession> {
    const session: ChatSession = {
      id: this.nextId++,
      title: sessionData.title || 'Novo Projeto',
      userId: sessionData.userId,
      projectId: sessionData.projectId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async getChatSession(id: number): Promise<ChatSession | undefined> {
    return this.sessions.get(id);
  }

  async getChatSessionsByUser(userId: string): Promise<ChatSession[]> {
    return Array.from(this.sessions.values()).filter(s => s.userId === userId);
  }

  async getChatSessionByProject(projectId: number): Promise<ChatSession | undefined> {
    return Array.from(this.sessions.values()).find(s => s.projectId === projectId);
  }

  async updateChatSession(id: number, updates: Partial<ChatSession>): Promise<ChatSession | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    const updatedSession = { ...session, ...updates, updatedAt: new Date() };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const message: Message = {
      id: this.nextId++,
      sessionId: messageData.sessionId,
      role: messageData.role,
      content: messageData.content,
      createdAt: new Date(),
    };
    const sessionMessages = this.messages.get(messageData.sessionId) || [];
    sessionMessages.push(message);
    this.messages.set(messageData.sessionId, sessionMessages);
    return message;
  }

  async getMessagesBySession(sessionId: number): Promise<Message[]> {
    return this.messages.get(sessionId) || [];
  }

  async createDocument(documentData: InsertDocument): Promise<Document> {
    const document: Document = {
      id: this.nextId++,
      sessionId: documentData.sessionId,
      title: documentData.title,
      type: documentData.type,
      content: documentData.content,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const sessionDocuments = this.documents.get(documentData.sessionId) || [];
    sessionDocuments.push(document);
    this.documents.set(documentData.sessionId, sessionDocuments);
    return document;
  }

  async getDocumentsBySession(sessionId: number): Promise<Document[]> {
    return this.documents.get(sessionId) || [];
  }

  async getDocumentBySessionAndType(sessionId: number, type: string): Promise<Document | undefined> {
    const sessionDocs = this.documents.get(sessionId) || [];
    return sessionDocs.find(d => d.type === type);
  }

  async updateDocument(id: number, updates: Partial<Document>): Promise<Document | undefined> {
    for (const [sessionId, docs] of Array.from(this.documents.entries())) {
      const docIndex = docs.findIndex(d => d.id === id);
      if (docIndex !== -1) {
        docs[docIndex] = { ...docs[docIndex], ...updates, updatedAt: new Date() };
        return docs[docIndex];
      }
    }
    return undefined;
  }

  async upsertDocument(sessionId: number, type: string, documentData: Omit<InsertDocument, 'sessionId'>): Promise<Document> {
    const existingDoc = await this.getDocumentBySessionAndType(sessionId, type);
    if (existingDoc) {
      return (await this.updateDocument(existingDoc.id, documentData))!;
    } else {
      return await this.createDocument({ sessionId, ...documentData });
    }
  }

  async updateDocumentSection(
    documentId: number, 
    sectionIndex: number, 
    updates: { content?: any; heading?: string }
  ): Promise<Document | undefined> {
    // Find document in all sessions
    for (const [sessionId, docs] of Array.from(this.documents.entries())) {
      const docIndex = docs.findIndex(d => d.id === documentId);
      
      if (docIndex !== -1) {
        const doc = docs[docIndex];
        const content = doc.content as any;
        
        if (!content.sections || sectionIndex >= content.sections.length) {
          return undefined;
        }
        
        // Update section
        const updatedSections = [...content.sections];
        updatedSections[sectionIndex] = {
          ...updatedSections[sectionIndex],
          ...updates
        };
        
        // Update document
        const updatedDoc = {
          ...doc,
          content: {
            ...content,
            sections: updatedSections
          },
          updatedAt: new Date()
        };
        
        docs[docIndex] = updatedDoc;
        return updatedDoc;
      }
    }
    
    return undefined;
  }

  async createProductionCompany(companyData: InsertProductionCompany): Promise<ProductionCompany> {
    const company: ProductionCompany = {
      id: this.nextId++,
      name: companyData.name,
      description: companyData.description || null,
      location: companyData.location,
      contactEmail: companyData.contactEmail || null,
      contactPhone: companyData.contactPhone || null,
      website: companyData.website || null,
      services: companyData.services || null,
      logo: companyData.logo || null,
      coverImage: companyData.coverImage || null,
      images: companyData.images || null,
      planType: companyData.planType || 'free',
      rating: '0', // Default rating for new companies
      reviewCount: 0, // Default review count
      verified: false, // Default to not verified
      ownerId: null, // Will be set when user creates company
      createdAt: new Date(),
    };
    this.companies.set(company.id, company);
    return company;
  }

  async getProductionCompany(id: number): Promise<ProductionCompany | undefined> {
    return this.companies.get(id);
  }

  async getProductionCompanyWithOwner(id: number): Promise<ProductionCompanyWithOwner | undefined> {
    const company = this.companies.get(id);
    if (!company) return undefined;
    const owner = company.ownerId ? this.users.get(company.ownerId) : undefined;
    return {
      ...company,
      owner: owner ? {
        name: owner.name,
        email: owner.email,
        profileImageUrl: owner.profileImageUrl,
      } : undefined
    };
  }

  async getProductionCompaniesByUser(userId: string): Promise<ProductionCompany[]> {
    return Array.from(this.companies.values()).filter(c => c.ownerId === userId);
  }

  async getAllProductionCompanies(limit: number = 50): Promise<ProductionCompany[]> {
    return Array.from(this.companies.values()).slice(0, limit);
  }

  async updateProductionCompany(id: number, updates: Partial<ProductionCompany>): Promise<ProductionCompany | undefined> {
    const company = this.companies.get(id);
    if (!company) return undefined;
    const updatedCompany = { ...company, ...updates };
    this.companies.set(id, updatedCompany);
    return updatedCompany;
  }

  async deleteProductionCompany(id: number): Promise<void> {
    this.companies.delete(id);
  }

  // Mock Editais implementation
  private editaisMap: Map<number, Edital> = new Map();
  private editalPdfsMap: Map<number, EditalPdf[]> = new Map();

  async createEdital(editalData: InsertEdital): Promise<Edital> {
    const edital: Edital = {
      id: this.nextId++,
      nome: editalData.nome,
      descricao: editalData.descricao,
      orgaoResponsavel: editalData.orgaoResponsavel,
      valorTotal: editalData.valorTotal || null,
      valorMaximoPorProjeto: editalData.valorMaximoPorProjeto || null,
      prazoInscricao: editalData.prazoInscricao,
      dataResultado: editalData.dataResultado,
      status: editalData.status || 'aberto',
      tipoVerba: editalData.tipoVerba || 'publica',
      areasContempladas: editalData.areasContempladas || null,
      requisitosBasicos: editalData.requisitosBasicos || null,
      local: editalData.local,
      createdBy: editalData.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      analisePersonalizada: null,
      palavrasChave: null,
      criteriosElegibilidade: null,
      processoSelecao: null,
      documentosNecessarios: null,
    };
    this.editaisMap.set(edital.id, edital);
    return edital;
  }

  async getEdital(id: number): Promise<Edital | undefined> {
    return this.editaisMap.get(id);
  }

  async getEditalWithPdfs(id: number): Promise<EditalWithPdfs | undefined> {
    const edital = this.editaisMap.get(id);
    if (!edital) return undefined;
    
    const pdfs = this.editalPdfsMap.get(id) || [];
    
    return {
      ...edital,
      pdfs
    };
  }

  async getAllEditais(limit: number = 50): Promise<Edital[]> {
    return Array.from(this.editaisMap.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getEditaisByStatus(status: string, limit: number = 50): Promise<Edital[]> {
    return Array.from(this.editaisMap.values())
      .filter(e => e.status === status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async updateEdital(id: number, updates: Partial<Edital>): Promise<Edital | undefined> {
    const edital = this.editaisMap.get(id);
    if (!edital) return undefined;
    const updatedEdital = { ...edital, ...updates, updatedAt: new Date() };
    this.editaisMap.set(id, updatedEdital);
    return updatedEdital;
  }

  async deleteEdital(id: number): Promise<void> {
    this.editaisMap.delete(id);
    this.editalPdfsMap.delete(id);
  }

  // Mock Edital PDFs implementation
  async createEditalPdf(pdfData: InsertEditalPdf): Promise<EditalPdf> {
    const pdf: EditalPdf = {
      id: this.nextId++,
      editalId: pdfData.editalId,
      fileName: pdfData.fileName,
      filePath: pdfData.filePath,
      fileSize: pdfData.fileSize,
      fileType: pdfData.fileType || 'application/pdf',
      uploadedAt: new Date(),
      aiProcessed: false,
      extractedContent: null,
      aiSummary: null,
      processedAt: null,
    };
    
    const existingPdfs = this.editalPdfsMap.get(pdfData.editalId) || [];
    existingPdfs.push(pdf);
    this.editalPdfsMap.set(pdfData.editalId, existingPdfs);
    
    return pdf;
  }

  async getEditalPdfs(editalId: number): Promise<EditalPdf[]> {
    return this.editalPdfsMap.get(editalId) || [];
  }

  async updateEditalPdf(id: number, updates: Partial<EditalPdf>): Promise<EditalPdf | undefined> {
    for (const [editalId, pdfs] of Array.from(this.editalPdfsMap.entries())) {
      const pdfIndex = pdfs.findIndex(p => p.id === id);
      if (pdfIndex !== -1) {
        pdfs[pdfIndex] = { ...pdfs[pdfIndex], ...updates };
        return pdfs[pdfIndex];
      }
    }
    return undefined;
  }

  async markPdfAsProcessed(id: number, extractedContent: string, aiSummary: string): Promise<EditalPdf | undefined> {
    return this.updateEditalPdf(id, {
      aiProcessed: true,
      extractedContent,
      aiSummary,
      processedAt: new Date()
    });
  }
}

// Lazy loading storage to ensure dotenv is loaded first
let _storage: IStorage | null = null;

function getStorage(): IStorage {
  if (!_storage) {
    console.log('🔍 Storage Selection (lazy load):', {
      DATABASE_URL_exists: !!process.env.DATABASE_URL,
      selectedStorage: process.env.DATABASE_URL ? 'DatabaseStorage' : 'MockStorage'
    });
    _storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MockStorage();
  }
  return _storage;
}

export const storage = new Proxy({} as IStorage, {
  get(target, prop) {
    const realStorage = getStorage();
    const value = (realStorage as any)[prop];
    return typeof value === 'function' ? value.bind(realStorage) : value;
  }
});