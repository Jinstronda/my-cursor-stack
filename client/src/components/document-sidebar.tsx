import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  FileText, 
  ChevronDown, 
  ChevronRight, 
  Plus,
  FolderOpen,
  Folder,
  User,
  DollarSign,
  Calendar,
  Film,
  ArrowLeft,
  Clock
} from "lucide-react";
import { getDocuments } from "@/lib/api";
import type { Document } from "@shared/schema";
import DocumentReader from "./document-reader";

interface DocumentSidebarProps {
  sessionId: number;
  onDocumentSelect: (document: Document | null) => void;
  selectedDocumentId: number | null;
}

interface DocumentFolder {
  id: string;
  name: string;
  icon: React.ReactNode;
  documents: Document[];
  isOpen: boolean;
}

export default function DocumentSidebar({ sessionId, onDocumentSelect, selectedDocumentId }: DocumentSidebarProps) {
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(['pre-production', 'production', 'post-production']));
  const [viewMode, setViewMode] = useState<'list' | 'reading'>('list');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  // Load view state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem(`document-sidebar-state-${sessionId}`);
    if (savedState) {
      try {
        const { mode, documentId } = JSON.parse(savedState);
        setViewMode(mode);
        if (mode === 'reading' && documentId) {
          // Document will be set when documents are loaded
        }
      } catch (error) {
        console.error('Error loading sidebar state:', error);
      }
    }
  }, [sessionId]);

  // Save view state to localStorage
  const saveState = (mode: 'list' | 'reading', documentId?: number) => {
    const state = { mode, documentId };
    localStorage.setItem(`document-sidebar-state-${sessionId}`, JSON.stringify(state));
  };

  const { data: documents, isLoading } = useQuery({
    queryKey: ['/api/chat/sessions', sessionId, 'documents'],
    queryFn: () => getDocuments(sessionId),
    staleTime: 5000, // 🎯 REDUCED: Consider data fresh for only 5 seconds (was 30s)
    refetchOnWindowFocus: true,
    refetchOnMount: true, // 🎯 ADDED: Always refetch on mount
  });

  // Restore selected document when documents load
  useEffect(() => {
    if (documents && viewMode === 'reading') {
      const savedState = localStorage.getItem(`document-sidebar-state-${sessionId}`);
      if (savedState) {
        try {
          const { documentId } = JSON.parse(savedState);
          const document = documents.find(doc => doc.id === documentId);
          if (document) {
            setSelectedDocument(document);
            onDocumentSelect(document);
          }
        } catch (error) {
          console.error('Error restoring document:', error);
        }
      }
    }
  }, [documents, viewMode, sessionId, onDocumentSelect]);

  // Organize documents into folders
  const organizeFolders = (): DocumentFolder[] => {
    if (!documents) return [];

    // Get the most recent document of each type (no duplicates)
    const uniqueDocuments = documents.reduce((acc: Document[], doc: Document) => {
      const existingDoc = acc.find(d => d.type === doc.type);
      if (!existingDoc) {
        acc.push(doc);
      } else if (new Date(doc.updatedAt) > new Date(existingDoc.updatedAt)) {
        // Replace with more recent document
        const index = acc.findIndex(d => d.type === doc.type);
        acc[index] = doc;
      }
      return acc;
    }, []);

    return [
      {
        id: 'pre-production',
        name: 'Pré-produção',
        icon: <Film className="w-4 h-4" />,
        documents: uniqueDocuments.filter(doc => ['overview', 'character'].includes(doc.type)),
        isOpen: openFolders.has('pre-production')
      },
      {
        id: 'production',
        name: 'Produção',
        icon: <Calendar className="w-4 h-4" />,
        documents: uniqueDocuments.filter(doc => ['schedule', 'budget'].includes(doc.type)),
        isOpen: openFolders.has('production')
      },
      {
        id: 'post-production',
        name: 'Pós-produção',
        icon: <FolderOpen className="w-4 h-4" />,
        documents: uniqueDocuments.filter(doc => ['editing', 'distribution'].includes(doc.type)),
        isOpen: openFolders.has('post-production')
      }
    ];
  };

  const toggleFolder = (folderId: string) => {
    const newOpenFolders = new Set(openFolders);
    if (newOpenFolders.has(folderId)) {
      newOpenFolders.delete(folderId);
    } else {
      newOpenFolders.add(folderId);
    }
    setOpenFolders(newOpenFolders);
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'overview':
        return <FileText className="w-4 h-4" />;
      case 'character':
        return <User className="w-4 h-4" />;
      case 'budget':
        return <DollarSign className="w-4 h-4" />;
      case 'schedule':
        return <Calendar className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getDocumentDisplayName = (type: string) => {
    switch (type) {
      case 'overview':
        return 'Visão Geral';
      case 'character':
        return 'Personagens';
      case 'budget':
        return 'Orçamento';
      case 'schedule':
        return 'Cronograma';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const getFolderNameByType = (type: string) => {
    switch (type) {
      case 'overview':
      case 'character':
        return 'Pré-produção';
      case 'budget':
      case 'schedule':
        return 'Produção';
      default:
        return 'Pós-produção';
    }
  };

  const handleDocumentClick = (document: Document) => {
    setSelectedDocument(document);
    setViewMode('reading');
    saveState('reading', document.id);
    onDocumentSelect(document);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedDocument(null);
    saveState('list');
    onDocumentSelect(null);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const folders = organizeFolders();

  if (viewMode === 'reading' && selectedDocument) {
    return (
      <div className="h-full flex flex-col bg-background border-r border-border">
        {/* Reading Header */}
        <div className="flex-none p-3 border-b border-border">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToList}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>
          </div>
        </div>

        {/* Document Reader */}
        <div className="flex-1 overflow-hidden">
          <DocumentReader 
            document={selectedDocument} 
            compact={true} 
            onBack={handleBackToList}
            showBreadcrumb={true}
            folderName={getFolderNameByType(selectedDocument.type)}
            sessionId={sessionId}
            onDocumentUpdate={(updatedDocument) => {
              setSelectedDocument(updatedDocument);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background border-r border-border">
      {/* Header */}
      <div className="flex-none p-3 border-b border-border">
        <div className="flex items-center space-x-2">
          <FolderOpen className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-medium text-foreground text-sm">Documentos</h3>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        ) : folders.length === 0 || folders.every(folder => folder.documents.length === 0) ? (
          <div className="p-4 text-center">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum documento gerado ainda
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {folders.map((folder) => (
              <Collapsible
                key={folder.id}
                open={folder.isOpen}
                onOpenChange={() => toggleFolder(folder.id)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start px-3 py-2 h-auto text-sm font-medium hover:bg-muted/50"
                  >
                    {folder.isOpen ? (
                      <ChevronDown className="w-4 h-4 mr-2" />
                    ) : (
                      <ChevronRight className="w-4 h-4 mr-2" />
                    )}
                    {folder.icon}
                    <span className="ml-2 text-foreground">{folder.name}</span>
                    {folder.documents.length > 0 && (
                      <span className="ml-auto text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                        {folder.documents.length}
                      </span>
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {folder.documents.length === 0 ? (
                    <div className="mx-3 py-2 px-3 text-xs text-muted-foreground/60 italic bg-muted/30 rounded">
                      Nenhum documento
                    </div>
                  ) : (
                    folder.documents.map((doc) => {
                      const content = doc.content as any;
                      const title = content?.title || getDocumentDisplayName(doc.type);
                      const preview = content?.sections?.[0]?.content || 'Documento gerado pela IA';
                      
                      return (
                        <Card
                          key={doc.id}
                          className="mx-3 cursor-pointer hover:shadow-sm transition-shadow border-border/50 hover:border-border"
                          onClick={() => handleDocumentClick(doc)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 p-2 bg-muted rounded-md">
                                {getDocumentIcon(doc.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-foreground text-sm mb-1 truncate">
                                  {title}
                                </h4>
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                  {typeof preview === 'string' ? truncateText(preview, 80) : 'Conteúdo estruturado'}
                                </p>
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatDate(doc.updatedAt)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}