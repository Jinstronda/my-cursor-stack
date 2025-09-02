import { apiRequest, apiFormRequest } from "./queryClient";
import type { ChatSession, InsertChatSession, Message, Document, Project, InsertProject, ProductionCompany, InsertProductionCompany } from "@shared/schema";

export async function createChatSession(data: InsertChatSession): Promise<{ session: ChatSession; project: any }> {
  const response = await apiRequest("POST", "/api/chat/sessions", data);
  return response.json();
}

export async function getChatSession(id: number): Promise<ChatSession> {
  const response = await apiRequest("GET", `/api/chat/sessions/${id}`);
  return response.json();
}

export async function getChatSessionByProject(projectId: number): Promise<ChatSession> {
  const response = await apiRequest("GET", `/api/projects/${projectId}/chat-session`);
  return response.json();
}

export async function getMessages(sessionId: number): Promise<Message[]> {
  const response = await apiRequest("GET", `/api/chat/sessions/${sessionId}/messages`);
  return response.json();
}

export async function sendMessage(sessionId: number, content: string): Promise<{ 
  userMessage: Message; 
  aiMessage: Message; 
  documentGenerated: boolean;
  documentType?: string;
  nextStep?: 'creating' | 'completed';
}> {
  const response = await apiRequest("POST", `/api/chat/sessions/${sessionId}/messages`, {
    role: "user",
    content,
  });
  return response.json();
}

export async function getDocuments(sessionId: number): Promise<Document[]> {
  try {
    const response = await apiRequest("GET", `/api/chat/sessions/${sessionId}/documents`);
    return response.json();
  } catch (error) {
    console.error("Error fetching documents:", error);
    return []; // Return empty array instead of throwing
  }
}

export async function getDocumentByType(sessionId: number, type: string): Promise<Document> {
  const response = await apiRequest("GET", `/api/chat/sessions/${sessionId}/documents/${type}`);
  return response.json();
}

export async function updateDocumentSection(
  sessionId: number,
  documentId: number,
  sectionIndex: number,
  updates: {
    content?: any;
    heading?: string;
  }
): Promise<{
  success: boolean;
  document: Document;
  updatedSection: {
    index: number;
    heading: string;
    content: any;
    updatedAt: string;
  };
}> {
  const response = await apiRequest("PATCH", 
    `/api/chat/sessions/${sessionId}/documents/${documentId}/sections/${sectionIndex}`,
    updates
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update section');
  }
  
  return response.json();
}

// Projects API
export async function getUserProjects(): Promise<Project[]> {
  const response = await apiRequest("GET", "/api/projects/my");
  return response.json();
}

export async function getRecentProjects(limit: number = 5): Promise<Project[]> {
  const response = await apiRequest("GET", `/api/projects/recent?limit=${limit}`);
  return response.json();
}

export async function getCommunityProjects(): Promise<Project[]> {
  const response = await apiRequest("GET", "/api/projects/community");
  return response.json();
}

export async function createProject(data: InsertProject): Promise<Project> {
  const response = await apiRequest("POST", "/api/projects", data);
  return response.json();
}

export async function updateProject(id: number, data: Partial<Project>): Promise<Project> {
  const response = await apiRequest("PATCH", `/api/projects/${id}`, data);
  return response.json();
}

export async function getProject(id: number): Promise<Project> {
  const response = await apiRequest("GET", `/api/projects/${id}`);
  return response.json();
}

export async function deleteProject(id: number): Promise<void> {
  await apiRequest("DELETE", `/api/projects/${id}`);
}

// Production Companies API
export async function getProductionCompanies(): Promise<ProductionCompany[]> {
  const response = await apiRequest("GET", "/api/production-companies");
  return response.json();
}

export async function getUserProductionCompanies(): Promise<ProductionCompany[]> {
  const response = await apiRequest("GET", "/api/production-companies/my");
  return response.json();
}

export async function getProductionCompany(id: number): Promise<ProductionCompany> {
  const response = await apiRequest("GET", `/api/production-companies/${id}`);
  return response.json();
}

export async function createProductionCompany(data: InsertProductionCompany): Promise<ProductionCompany> {
  const response = await apiRequest("POST", "/api/production-companies", data);
  return response.json();
}

export async function updateProductionCompany(id: number, data: Partial<ProductionCompany>): Promise<ProductionCompany> {
  const response = await apiRequest("PATCH", `/api/production-companies/${id}`, data);
  return response.json();
}

export async function deleteProductionCompany(id: number): Promise<void> {
  await apiRequest("DELETE", `/api/production-companies/${id}`);
}

export async function getUserProductionCompany(): Promise<ProductionCompany | null> {
  try {
    const response = await apiRequest("GET", "/api/production-companies/user");
    if (response.status === 404) {
      return null;
    }
    return response.json();
  } catch (error) {
    console.log("No production company found for user");
    return null;
  }
}
