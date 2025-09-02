import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Send, Paperclip, Bot, User, FileText, X, Clapperboard, Film, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { 
  createChatSession, 
  getChatSession, 
  getMessages, 
  sendMessage,
  getProject,
  getChatSessionByProject,
  getDocuments
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import EditableSection from "@/components/editable-section";
import { useEditableDocument } from "@/hooks/use-editable-document";

export default function ProjectChat() {
  const [location, setLocation] = useLocation();
  const [message, setMessage] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [isDocumentsPanelOpen, setIsDocumentsPanelOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'folders' | 'document'>('folders');
  const { user } = useAuth();
  const { toast } = useToast();

  // Extract projectId and sessionId from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const projId = urlParams.get('projectId');
    const sessId = urlParams.get('sessionId');
    
    if (projId) {
      setProjectId(parseInt(projId));
    }
    if (sessId) {
      setSessionId(parseInt(sessId));
    }
  }, [location]);

  // Get project info
  const { data: project } = useQuery({
    queryKey: ['/api/projects', projectId],
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
  });

  // Get or create chat session
  const { data: chatSession } = useQuery({
    queryKey: ['/api/chat/sessions', sessionId || 'project', projectId],
    queryFn: async () => {
      console.log("Loading chat session - sessionId:", sessionId, "projectId:", projectId);
      
      if (sessionId) {
        // Use existing session
        console.log("Using existing session:", sessionId);
        return await getChatSession(sessionId);
      } else if (projectId && user?.id) {
        // Try to get session by project
        try {
          console.log("Trying to get session by project:", projectId);
          const existingSession = await getChatSessionByProject(projectId);
          console.log("Found existing session for project:", existingSession);
          setSessionId(existingSession.id);
          // Update URL to include sessionId
          window.history.replaceState(
            null, 
            '', 
            `/criar/novo-projeto/chat?projectId=${projectId}&sessionId=${existingSession.id}`
          );
          return existingSession;
        } catch (error) {
          // Create new session for project only if we have project data and user
          console.log("Creating new session for project:", projectId);
          if (!user?.id) throw new Error("User required for session creation");
          
          const result = await createChatSession({
            title: project?.name || "Novo Projeto",
            userId: user.id,
            projectId: projectId // CRITICAL: Pass the existing project ID
          });
          console.log("Created new session:", result.session);
          setSessionId(result.session.id);
          // Update URL to include sessionId
          window.history.replaceState(
            null, 
            '', 
            `/criar/novo-projeto/chat?projectId=${projectId}&sessionId=${result.session.id}`
          );
          return result.session;
        }
      }
      return null;
    },
    enabled: !!(user?.id && (sessionId || projectId)),
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
  });

  // Get messages for session
  const { data: messages = [] } = useQuery({
    queryKey: ['/api/chat/sessions', chatSession?.id, 'messages'],
    queryFn: () => {
      console.log("Fetching messages for session:", chatSession?.id);
      return getMessages(chatSession!.id);
    },
    enabled: !!chatSession?.id,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Get documents for session
  const { data: documents = [] } = useQuery({
    queryKey: ['/api/chat/sessions', chatSession?.id, 'documents'],
    queryFn: () => getDocuments(chatSession!.id),
    enabled: !!chatSession?.id && isDocumentsPanelOpen,
    staleTime: 5000, // 🎯 REDUCED: Consider data fresh for only 5 seconds (was 30s)
    refetchOnWindowFocus: true,
    refetchOnMount: true, // 🎯 ADDED: Always refetch on mount
  });

  // Initialize editing state for selected document
  const { editState, startEditingSection, stopEditingSection, updateSectionContent, saveSectionContent } = 
    useEditableDocument(
      selectedDocument?.id || 0, 
      chatSession?.id || 0, 
      (updatedDocument) => {
        setSelectedDocument(updatedDocument);
      }
    );

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!chatSession?.id) {
        console.error("Attempted to send message without active session");
        throw new Error("No active session");
      }
      console.log("Sending message:", content, "to session:", chatSession.id);
      return await sendMessage(chatSession.id, content);
    },
    onSuccess: (result) => {
      console.log("Message sent successfully, invalidating cache", result);
      queryClient.invalidateQueries({ 
        queryKey: ['/api/chat/sessions', chatSession?.id, 'messages'] 
      });
      
      // 🎯 FIX: Invalidate documents cache immediately when document is generated
      if (result.documentGenerated) {
        console.log("Document generated - invalidating documents cache immediately");
        queryClient.invalidateQueries({ 
          queryKey: ['/api/chat/sessions', chatSession?.id, 'documents'] 
        });
        // Also refetch if documents panel is open for instant update
        if (isDocumentsPanelOpen) {
          queryClient.refetchQueries({ 
            queryKey: ['/api/chat/sessions', chatSession?.id, 'documents'] 
          });
        }
      }
      
      setMessage("");
    },
    onError: (error) => {
      console.error("Failed to send message:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sendMessageMutation.isPending) return;
    
    sendMessageMutation.mutate(message.trim());
  };

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDocumentClick = (doc: any) => {
    setSelectedDocument(doc);
    setViewMode('document');
  };

  const handleBackToFolder = () => {
    setSelectedDocument(null);
    setViewMode('folders');
    // Keep selectedFolder to return to the same folder view
  };

  const getFolderDisplayName = (folderKey: string | null) => {
    if (!folderKey) return '';
    const names = {
      'pre-producao': 'Pré-Produção',
      'producao': 'Produção',
      'pos-producao': 'Pós-Produção'
    };
    return names[folderKey as keyof typeof names] || folderKey;
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels = {
      'roteiro': 'Roteiro',
      'cronograma': 'Cronograma',
      'orcamento': 'Orçamento',
      'overview': 'Visão Geral',
      'character': 'Personagens',
      'plano_filmagem': 'Plano de Filmagem',
      'relatorio_diario': 'Relatório Diário',
      'schedule': 'Cronograma',
      'timeline_edicao': 'Timeline de Edição',
      'mixagem_som': 'Mixagem de Som',
      'budget': 'Orçamento'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const renderMarkdownContent = (content: string) => {
    // Simple markdown processing for basic formatting
    const lines = content.split('\n');
    let inList = false;
    let inOrderedList = false;
    let result = '';
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Process basic formatting
      line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
      line = line.replace(/\*(.*?)\*/g, '<em>$1</em>'); // Italic
      
      if (line.match(/^- /)) {
        // Unordered list item
        if (inOrderedList) {
          result += '</ol>\n';
          inOrderedList = false;
        }
        if (!inList) {
          result += '<ul class="list-disc list-inside space-y-2 mb-4">\n';
          inList = true;
        }
        result += '<li class="ml-4 break-words">' + line.replace(/^- /, '') + '</li>\n';
      } else if (line.match(/^\d+\. /)) {
        // Ordered list item
        if (inList) {
          result += '</ul>\n';
          inList = false;
        }
        if (!inOrderedList) {
          result += '<ol class="list-decimal list-inside space-y-2 mb-4">\n';
          inOrderedList = true;
        }
        result += '<li class="ml-4 break-words">' + line.replace(/^\d+\. /, '') + '</li>\n';
      } else {
        // Regular content
        if (inList) {
          result += '</ul>\n';
          inList = false;
        }
        if (inOrderedList) {
          result += '</ol>\n';
          inOrderedList = false;
        }
        
        if (line.trim() === '') {
          result += '<br />\n';
        } else {
          result += '<p class="mb-4 break-words whitespace-pre-wrap leading-relaxed">' + line + '</p>\n';
        }
      }
    }
    
    // Close any open lists
    if (inList) result += '</ul>';
    if (inOrderedList) result += '</ol>';
    
    return result;
  };

  const renderObjectContent = (obj: any) => {
    if (typeof obj !== 'object' || obj === null) {
      return `<p class="mb-4 break-words whitespace-pre-wrap leading-relaxed">${String(obj)}</p>`;
    }

    let html = '';
    
    // Handle arrays
    if (Array.isArray(obj)) {
      html += '<ul class="list-disc list-inside space-y-2 mb-4">';
      obj.forEach((item) => {
        html += `<li class="ml-4 break-words whitespace-pre-wrap">${typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}</li>`;
      });
      html += '</ul>';
      return html;
    }
    
    // Handle objects
    Object.entries(obj).forEach(([key, value]) => {
      html += `<div class="mb-4">`;
      html += `<h4 class="font-medium text-foreground mb-2 capitalize">${key.replace(/_/g, ' ')}</h4>`;
      
      if (typeof value === 'string') {
        html += `<p class="text-muted-foreground mb-2 break-words whitespace-pre-wrap leading-relaxed">${value}</p>`;
      } else if (Array.isArray(value)) {
        html += '<ul class="list-disc list-inside space-y-1 ml-4">';
        value.forEach((item) => {
          html += `<li class="text-muted-foreground break-words whitespace-pre-wrap">${typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}</li>`;
        });
        html += '</ul>';
      } else if (typeof value === 'object' && value !== null) {
        html += `<pre class="bg-muted p-3 rounded-md text-sm overflow-x-auto whitespace-pre-wrap break-words">${JSON.stringify(value, null, 2)}</pre>`;
      } else {
        html += `<p class="text-muted-foreground break-words whitespace-pre-wrap">${String(value)}</p>`;
      }
      
      html += `</div>`;
    });
    
    return html;
  };

  // If no session is created yet and we're creating one
  if (!chatSession && (sessionId || projectId)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Preparando seu chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with back button */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="w-full px-6 py-4 relative">
          <div className="flex items-center justify-between w-full">
            {/* Back button - Fixed to left edge */}
            <div className="flex-shrink-0">
              <Link href="/criar">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar para Projetos
                </Button>
              </Link>
            </div>
            
            {/* Title - Absolutely centered */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <h1 className="text-lg font-medium text-foreground whitespace-nowrap">
                {project?.name || chatSession?.title || "Chat do Projeto"}
              </h1>
            </div>
            
            {/* Document button - Fixed to right edge */}
            <div className="flex-shrink-0">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`p-2 h-8 w-8 transition-colors ${
                  isDocumentsPanelOpen 
                    ? 'text-primary bg-primary/10 hover:bg-primary/20' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setIsDocumentsPanelOpen(!isDocumentsPanelOpen)}
              >
                <FileText className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="h-[calc(100vh-80px)] flex">
        {/* Chat Content */}
        <div className={`flex flex-col transition-all duration-500 ease-in-out ${
          isDocumentsPanelOpen ? 'w-3/5' : 'w-full'
        }`}>
          <div className="max-w-4xl mx-auto w-full h-full flex flex-col">
        {/* Messages Area */}
        <ScrollArea className="flex-1 px-6 py-6">
          <div className="space-y-6">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Vamos começar seu projeto!
                </h3>
                <p className="text-muted-foreground">
                  Conte-me sobre sua ideia e vou te ajudar a desenvolvê-la passo a passo.
                </p>
              </div>
            ) : (
              messages.map((msg: any) => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className={msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
                      {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                    <div className={`inline-block px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-foreground'
                    }`}>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 px-2">
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {/* Loading indicator */}
            {sendMessageMutation.isPending && (
              <div className="flex gap-4">
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarFallback className="bg-muted">
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="max-w-[80%]">
                  <div className="inline-block px-4 py-3 rounded-2xl bg-muted">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border bg-background p-6">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="min-h-[52px] max-h-32 resize-none border-border bg-background pr-12"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
            </div>
            <Button 
              type="submit" 
              disabled={!message.trim() || sendMessageMutation.isPending}
              className="h-[52px] px-6"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
            </div>
          </div>
        </div>
        
        {/* Documents Panel - Slides in from right */}
        <div className={`bg-background border-l border-border transition-all duration-500 ease-in-out overflow-hidden ${
          isDocumentsPanelOpen ? 'w-2/5 opacity-100' : 'w-0 opacity-0'
        }`}>
          <div className="h-full flex flex-col">
            {/* Documents Header */}
            <div className="border-b border-border p-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-foreground">Documentos</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-1 h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => setIsDocumentsPanelOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Documents Content */}
            <ScrollArea className="flex-1 p-4">
              {viewMode === 'document' && selectedDocument ? (
                /* Document Reader View */
                <div className="h-full">
                  {/* Document Header with Navigation */}
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleBackToFolder}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Voltar
                    </Button>
                    <div className="h-4 w-px bg-border"></div>
                    <nav className="text-sm text-muted-foreground">
                      <span>Documentos</span>
                      <span className="mx-2">›</span>
                      <span>{getFolderDisplayName(selectedFolder)}</span>
                      <span className="mx-2">›</span>
                      <span className="text-foreground font-medium">
                        {getDocumentTypeLabel(selectedDocument.type)}
                      </span>
                    </nav>
                  </div>

                  {/* Document Content */}
                  <div className="space-y-6">
                    {/* Document Title */}
                    <div>
                      <h1 className="text-2xl font-bold text-foreground mb-2">
                        {selectedDocument.title}
                      </h1>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="bg-muted px-2 py-1 rounded">
                          {getDocumentTypeLabel(selectedDocument.type)}
                        </span>
                        <span>
                          Criado em {new Date(selectedDocument.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    {/* Document Sections - Now Editable! */}
                    <div className="space-y-8">
                      {selectedDocument.content?.sections?.map((section: any, index: number) => (
                        <EditableSection
                          key={index}
                          section={section}
                          sectionIndex={index}
                          isEditing={editState.editingSectionIndex === index}
                          saveStatus={editState.saveStatus.get(index) || 'idle'}
                          onStartEdit={startEditingSection}
                          onEndEdit={stopEditingSection}
                          onContentChange={updateSectionContent}
                          onSave={saveSectionContent}
                          compact={false}
                        />
                      )) || (
                        <EditableSection
                          section={{ heading: 'Conteúdo do Documento', content: selectedDocument.content }}
                          sectionIndex={0}
                          isEditing={editState.editingSectionIndex === 0}
                          saveStatus={editState.saveStatus.get(0) || 'idle'}
                          onStartEdit={startEditingSection}
                          onEndEdit={stopEditingSection}
                          onContentChange={updateSectionContent}
                          onSave={saveSectionContent}
                          compact={false}
                        />
                      )}
                    </div>

                    {/* Fallback for documents without sections */}
                    {(!selectedDocument.content?.sections || selectedDocument.content.sections.length === 0) && (
                      <div className="text-center py-12">
                        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">
                          Documento em branco
                        </h3>
                        <p className="text-muted-foreground">
                          Este documento ainda não possui conteúdo.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : !selectedFolder ? (
                /* Main Folders View */
                <div className="space-y-4">
                  {/* Pre-Production Folder */}
                  <div 
                    className="border border-border rounded-xl p-6 hover:bg-muted/50 transition-all cursor-pointer group hover:border-primary/20 bg-gradient-to-br from-background to-muted/20"
                    onClick={() => setSelectedFolder('pre-producao')}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                        <Clapperboard className="w-6 h-6 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground text-lg mb-1">Pré-Produção</h3>
                        <p className="text-muted-foreground text-sm">
                          Roteiros, cronogramas, orçamentos e planejamento
                        </p>
                        <div className="text-xs text-muted-foreground mt-2">
                          {documents.filter(doc => ['roteiro', 'cronograma', 'orcamento'].includes(doc.type || '')).length} documentos
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Production Folder */}
                  <div 
                    className="border border-border rounded-xl p-6 hover:bg-muted/50 transition-all cursor-pointer group hover:border-primary/20 bg-gradient-to-br from-background to-muted/20"
                    onClick={() => setSelectedFolder('producao')}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                        <Film className="w-6 h-6 text-green-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground text-lg mb-1">Produção</h3>
                        <p className="text-muted-foreground text-sm">
                          Planos de filmagem, relatórios diários e documentação de set
                        </p>
                        <div className="text-xs text-muted-foreground mt-2">
                          {documents.filter(doc => ['plano_filmagem', 'relatorio_diario'].includes(doc.type || '')).length} documentos
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Post-Production Folder */}
                  <div 
                    className="border border-border rounded-xl p-6 hover:bg-muted/50 transition-all cursor-pointer group hover:border-primary/20 bg-gradient-to-br from-background to-muted/20"
                    onClick={() => setSelectedFolder('pos-producao')}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                        <Video className="w-6 h-6 text-purple-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground text-lg mb-1">Pós-Produção</h3>
                        <p className="text-muted-foreground text-sm">
                          Edição, mixagem de som, efeitos visuais e finalização
                        </p>
                        <div className="text-xs text-muted-foreground mt-2">
                          {documents.filter(doc => ['timeline_edicao', 'mixagem_som'].includes(doc.type || '')).length} documentos
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Empty State */}
                  {documents.length === 0 && (
                    <div className="text-center py-8 mt-8">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        Nenhum documento ainda
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        Continue conversando e os documentos aparecerão nas pastas automaticamente.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Folder Contents View */
                <div>
                  {/* Back Button */}
                  <div className="flex items-center gap-3 mb-6">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedFolder(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Voltar
                    </Button>
                    <div className="h-4 w-px bg-border"></div>
                    <h3 className="font-medium text-foreground capitalize">
                      {selectedFolder.replace('-', ' ')}
                    </h3>
                  </div>

                  {/* Document List */}
                  <div className="space-y-2">
                    {documents
                      .filter(doc => {
                        const type = doc.type || '';
                        switch (selectedFolder) {
                          case 'pre-producao':
                            return ['roteiro', 'cronograma', 'orcamento', 'overview', 'character'].includes(type);
                          case 'producao':
                            return ['plano_filmagem', 'relatorio_diario', 'schedule'].includes(type);
                          case 'pos-producao':
                            return ['timeline_edicao', 'mixagem_som', 'budget'].includes(type);
                          default:
                            return false;
                        }
                      })
                      .map((doc: any) => (
                        <div 
                          key={doc.id} 
                          className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-all cursor-pointer hover:border-primary/20 bg-gradient-to-r from-background to-muted/10"
                          onClick={() => handleDocumentClick(doc)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-foreground text-sm mb-1 truncate">{doc.title}</h4>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                  {getDocumentTypeLabel(doc.type)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(doc.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    
                    {/* Empty Folder State */}
                    {documents.filter(doc => {
                      const type = doc.type || '';
                      switch (selectedFolder) {
                        case 'pre-producao':
                          return ['roteiro', 'cronograma', 'orcamento', 'overview', 'character'].includes(type);
                        case 'producao':
                          return ['plano_filmagem', 'relatorio_diario', 'schedule'].includes(type);
                        case 'pos-producao':
                          return ['timeline_edicao', 'mixagem_som', 'budget'].includes(type);
                        default:
                          return false;
                      }
                    }).length === 0 && (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground text-sm">
                          Nenhum documento nesta pasta ainda
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
}