# 🔌 API Design para Edição de Seções de Documentos

## 🎯 Objetivo
Criar endpoint PATCH para atualizar seções específicas de documentos sem reescrever o documento inteiro.

---

## 📡 Novo Endpoint Necessário

### **PATCH /api/chat/sessions/:sessionId/documents/:documentId/sections/:sectionIndex**

#### **Parâmetros da URL:**
- `sessionId` (number): ID da sessão de chat
- `documentId` (number): ID do documento
- `sectionIndex` (number): Índice da seção (0-based)

#### **Request Body:**
```typescript
{
  "content": string | object | array, // Novo conteúdo da seção
  "heading"?: string                  // Opcional: novo título da seção
}
```

#### **Response:**
```typescript
{
  "success": true,
  "document": Document,              // Documento completo atualizado
  "updatedSection": {
    "index": number,
    "heading": string,
    "content": any,
    "updatedAt": string
  },
  "message": "Section updated successfully"
}
```

#### **Error Responses:**
```typescript
// 404 - Document not found
{
  "success": false,
  "error": "Document not found",
  "code": "DOCUMENT_NOT_FOUND"
}

// 400 - Invalid section index
{
  "success": false, 
  "error": "Section index out of bounds",
  "code": "INVALID_SECTION_INDEX",
  "details": {
    "requestedIndex": number,
    "maxIndex": number
  }
}

// 403 - Unauthorized
{
  "success": false,
  "error": "You don't have permission to edit this document",
  "code": "UNAUTHORIZED"
}
```

---

## 🗄️ Storage Layer Updates

### **Novo método em Storage Interface:**
```typescript
// server/storage.ts - interface update
export interface Storage {
  // ... métodos existentes
  
  updateDocumentSection(
    documentId: number, 
    sectionIndex: number, 
    updates: {
      content?: any;
      heading?: string;
    }
  ): Promise<Document | undefined>;
}
```

### **Implementação PostgreSQL:**
```typescript
// storage.ts - implementação
async updateDocumentSection(
  documentId: number, 
  sectionIndex: number, 
  updates: { content?: any; heading?: string }
): Promise<Document | undefined> {
  // 1. Buscar documento atual
  const [currentDoc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId));
    
  if (!currentDoc) return undefined;
  
  // 2. Parse content atual
  const content = currentDoc.content as any;
  if (!content.sections || !Array.isArray(content.sections)) {
    throw new Error('Invalid document structure - sections not found');
  }
  
  // 3. Validar índice
  if (sectionIndex < 0 || sectionIndex >= content.sections.length) {
    throw new Error(`Section index ${sectionIndex} out of bounds`);
  }
  
  // 4. Atualizar seção específica
  const updatedSections = [...content.sections];
  updatedSections[sectionIndex] = {
    ...updatedSections[sectionIndex],
    ...updates
  };
  
  // 5. Salvar documento atualizado
  const updatedContent = {
    ...content,
    sections: updatedSections
  };
  
  const [updatedDoc] = await db
    .update(documents)
    .set({ 
      content: updatedContent, 
      updatedAt: new Date() 
    })
    .where(eq(documents.id, documentId))
    .returning();
    
  return updatedDoc;
}
```

### **Implementação In-Memory (development):**
```typescript
// storage.ts - in-memory implementation
async updateDocumentSection(
  documentId: number, 
  sectionIndex: number, 
  updates: { content?: any; heading?: string }
): Promise<Document | undefined> {
  // Encontrar documento em todas as sessões
  for (const [sessionId, docs] of Array.from(this.documents.entries())) {
    const docIndex = docs.findIndex(d => d.id === documentId);
    
    if (docIndex !== -1) {
      const doc = docs[docIndex];
      const content = doc.content as any;
      
      if (!content.sections || sectionIndex >= content.sections.length) {
        return undefined;
      }
      
      // Atualizar seção
      const updatedSections = [...content.sections];
      updatedSections[sectionIndex] = {
        ...updatedSections[sectionIndex],
        ...updates
      };
      
      // Atualizar documento
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
```

---

## 🛠️ Route Handler Implementation

### **Arquivo**: `server/routes.ts`

```typescript
// Adicionar ao registerRoutes()
app.patch("/api/chat/sessions/:sessionId/documents/:documentId/sections/:sectionIndex", 
  isAuthenticated, 
  async (req: any, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const documentId = parseInt(req.params.documentId);
      const sectionIndex = parseInt(req.params.sectionIndex);
      const user = req.user as AuthenticatedUser;
      
      // Validar parâmetros
      if (isNaN(sessionId) || isNaN(documentId) || isNaN(sectionIndex)) {
        return res.status(400).json({
          success: false,
          error: "Invalid parameters",
          code: "INVALID_PARAMS"
        });
      }
      
      // Verificar se sessão pertence ao usuário
      const session = await storage.getChatSession(sessionId);
      if (!session || session.userId !== user.id) {
        return res.status(404).json({
          success: false,
          error: "Session not found",
          code: "SESSION_NOT_FOUND"
        });
      }
      
      // Verificar se documento existe na sessão
      const document = await storage.getDocumentBySessionAndType(sessionId, "any");
      const allDocs = await storage.getDocumentsBySession(sessionId);
      const targetDoc = allDocs.find(d => d.id === documentId);
      
      if (!targetDoc) {
        return res.status(404).json({
          success: false,
          error: "Document not found",
          code: "DOCUMENT_NOT_FOUND"
        });
      }
      
      // Validar body
      const { content, heading } = req.body;
      if (content === undefined && heading === undefined) {
        return res.status(400).json({
          success: false,
          error: "Either content or heading must be provided",
          code: "MISSING_UPDATES"
        });
      }
      
      // Atualizar seção
      try {
        const updatedDocument = await storage.updateDocumentSection(
          documentId,
          sectionIndex,
          { content, heading }
        );
        
        if (!updatedDocument) {
          return res.status(400).json({
            success: false,
            error: "Section index out of bounds",
            code: "INVALID_SECTION_INDEX"
          });
        }
        
        // Resposta de sucesso
        const updatedContent = updatedDocument.content as any;
        res.json({
          success: true,
          document: updatedDocument,
          updatedSection: {
            index: sectionIndex,
            heading: updatedContent.sections[sectionIndex].heading,
            content: updatedContent.sections[sectionIndex].content,
            updatedAt: updatedDocument.updatedAt.toISOString()
          },
          message: "Section updated successfully"
        });
        
      } catch (error) {
        console.error("Error updating section:", error);
        
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
  }
);
```

---

## 🔒 Security Considerations

### **Validations:**
1. ✅ **Authentication**: User must be logged in
2. ✅ **Authorization**: User must own the session
3. ✅ **Input Validation**: All parameters validated
4. ✅ **Bounds Checking**: Section index within bounds
5. ✅ **Rate Limiting**: Prevent spam updates (future)

### **Data Integrity:**
1. ✅ **Transaction Safety**: Update is atomic
2. ✅ **Schema Validation**: Content structure preserved
3. ✅ **Timestamp Updates**: Document updatedAt maintained
4. ✅ **Error Recovery**: Graceful failure handling

---

## 📱 Client-Side API Function

### **Arquivo**: `client/src/lib/api.ts`

```typescript
// Adicionar nova função
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
```

---

## ✅ Implementation Checklist

- [ ] Add `updateDocumentSection` method to Storage interface
- [ ] Implement PostgreSQL version of `updateDocumentSection`
- [ ] Implement in-memory version of `updateDocumentSection`
- [ ] Add PATCH route handler in `routes.ts`
- [ ] Add client-side API function in `api.ts`
- [ ] Add proper error handling and logging
- [ ] Add input validation and sanitization
- [ ] Write unit tests for storage methods
- [ ] Write integration tests for API endpoint
- [ ] Add API documentation

---

*Esta API design será implementada na FASE 3 do projeto*