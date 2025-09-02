import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { FileText, Download, Share, Calendar, Clock, Bot, ArrowLeft, ChevronRight } from "lucide-react";
import type { Document } from "@shared/schema";
import EditableSection from "./editable-section";
import { useEditableDocument } from "@/hooks/use-editable-document";
import { renderMarkdown } from "@/utils/markdown-renderer";

interface DocumentReaderProps {
  document: Document | null;
  compact?: boolean;
  onBack?: () => void;
  showBreadcrumb?: boolean;
  folderName?: string;
  sessionId: number;
  onDocumentUpdate?: (document: Document) => void;
}

export default function DocumentReader({ 
  document, 
  compact = false, 
  onBack, 
  showBreadcrumb = false, 
  folderName,
  sessionId,
  onDocumentUpdate
}: DocumentReaderProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const getFolderDisplayName = (type: string) => {
    switch (type) {
      case 'overview':
      case 'character':
        return 'Pré-produção';
      case 'budget':
      case 'schedule':
        return 'Produção';
      default:
        return folderName || 'Documentos';
    }
  };

  // Função para gerar PDF/HTML
  const generatePDF = () => {
    if (!document) return;

    const content = document.content as any;
    const htmlContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>${content.title || document.title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
            h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
            h2 { color: #34495e; margin-top: 30px; margin-bottom: 15px; }
            h3 { color: #7f8c8d; margin-top: 20px; margin-bottom: 10px; }
            .section { margin-bottom: 30px; padding: 20px; border-left: 4px solid #3498db; background: #f8f9fa; }
            .meta { color: #7f8c8d; font-size: 12px; margin-bottom: 20px; }
            ul { margin: 10px 0; padding-left: 20px; }
            li { margin-bottom: 5px; }
            .object-field { margin: 10px 0; padding: 10px; background: #ecf0f1; border-radius: 4px; }
            .field-label { font-weight: bold; color: #2c3e50; }
          </style>
        </head>
        <body>
          <h1>${content.title || document.title}</h1>
          <div class="meta">
            Gerado em: ${formatDate(document.createdAt)} às ${formatTime(document.createdAt)}<br>
            Tipo: ${document.type}<br>
            Última atualização: ${formatDate(document.updatedAt)} às ${formatTime(document.updatedAt)}
          </div>
          ${renderContentForPDF(content)}
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${content.title || document.title}.html`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderContentForPDF = (content: any): string => {
    if (!content.sections) return '';
    
    return content.sections.map((section: any) => `
      <div class="section">
        <h2>${section.heading}</h2>
        ${renderValueForPDF(section.content)}
      </div>
    `).join('');
  };

  const renderValueForPDF = (value: any): string => {
    if (Array.isArray(value)) {
      return `<ul>${value.map(item => `<li>${renderValueForPDF(item)}</li>`).join('')}</ul>`;
    } else if (typeof value === 'object' && value !== null) {
      return Object.entries(value).map(([key, val]) => `
        <div class="object-field">
          <span class="field-label">${key}:</span> ${renderValueForPDF(val)}
        </div>
      `).join('');
    }
    return String(value);
  };

  const renderValue = (value: any): React.ReactNode => {
    if (Array.isArray(value)) {
      return (
        <ul className="list-disc list-inside space-y-1">
          {value.map((item, index) => (
            <li key={index} className="text-foreground">
              {renderValue(item)}
            </li>
          ))}
        </ul>
      );
    } else if (typeof value === 'object' && value !== null) {
      return (
        <div className="space-y-3">
          {Object.entries(value).map(([key, val], index) => (
            <div key={index} className="bg-muted/50 p-3 rounded border-l-2 border-accent">
              <div className="font-medium text-foreground mb-1">{key}:</div>
              <div className="text-muted-foreground">{renderValue(val)}</div>
            </div>
          ))}
        </div>
      );
    }
    // 🎯 FIX: Render markdown for text content
    const textContent = String(value);
    if (textContent.includes('**') || textContent.includes('*')) {
      return (
        <span 
          className="text-foreground markdown-content"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(textContent) }}
        />
      );
    }
    return <span className="text-foreground">{textContent}</span>;
  };

  if (!document) {
    return (
      <div className="h-full flex flex-col">
        {/* Header with Back Navigation */}
        <div className={`flex-none border-b border-border ${compact ? 'p-3' : 'p-4'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {onBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Voltar
                </Button>
              )}
              <FileText className={`text-muted-foreground ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
              <div>
                <h2 className={`font-semibold text-foreground ${compact ? 'text-sm' : 'text-lg'}`}>
                  {compact ? 'Leitura' : 'Área de Leitura'}
                </h2>
                <p className={`text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
                  {compact ? 'Selecione um documento' : 'Selecione um documento para visualizar'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <FileText className={`text-muted-foreground mx-auto mb-4 ${compact ? 'w-8 h-8' : 'w-16 h-16'}`} />
            <h3 className={`font-medium text-foreground mb-2 ${compact ? 'text-sm' : 'text-lg'}`}>
              {compact ? 'Nenhum documento' : 'Nenhum documento selecionado'}
            </h3>
            <p className={`text-muted-foreground ${compact ? 'text-xs' : 'text-sm'} ${compact ? 'max-w-xs' : 'max-w-md'}`}>
              {compact ? 'Converse com a IA para gerar documentos.' : 'Escolha um documento na barra lateral ou converse com a IA para gerar novos documentos de produção.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const content = document.content as any;

  // Check if seamless editing should be enabled (experimental feature flag)
  const enableSeamlessEditing = true; // Enable seamless mode

  // Initialize editing state
  const { 
    editState, 
    startEditingSection, 
    stopEditingSection, 
    updateSectionContent, 
    saveSectionContent
  } = useEditableDocument(document.id, sessionId, onDocumentUpdate);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Enhanced Header with Navigation */}
      <div className={`flex-none border-b border-border ${compact ? 'p-3' : 'p-4'}`}>
        {/* Back Button & Breadcrumb */}
        {(onBack || showBreadcrumb) && (
          <div className="flex items-center space-x-2 mb-3">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
            )}
            {showBreadcrumb && (
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink 
                      onClick={onBack}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Documentos
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>
                    <ChevronRight className="w-4 h-4" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      onClick={onBack}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {getFolderDisplayName(document.type)}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>
                    <ChevronRight className="w-4 h-4" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-foreground">
                      {getDocumentDisplayName(document.type)}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            )}
          </div>
        )}

        {/* Document Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <FileText className={`text-accent ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className={`font-semibold text-foreground truncate ${compact ? 'text-base' : 'text-xl'}`}>
                {content.title || getDocumentDisplayName(document.type)}
              </h1>
              <p className={`text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
                Documento de produção • {getDocumentDisplayName(document.type)}
              </p>
            </div>
          </div>
          
          {!compact && (
            <div className="flex items-center space-x-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-foreground"
                onClick={generatePDF}
                title="Baixar como HTML"
              >
                <Download className="w-4 h-4 mr-1" />
                Baixar
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-foreground"
                title="Compartilhar (em breve)"
                disabled
              >
                <Share className="w-4 h-4 mr-1" />
                Compartilhar
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Optimized Content Area */}
      <ScrollArea className="flex-1 document-scroll">
        <div className={`${compact ? 'p-3' : 'p-6'} document-reader-prose`}>
          <div className={`space-y-6 ${compact ? 'max-w-none' : 'max-w-3xl mx-auto'}`}>
            {/* Document Metadata */}
            <div className={`bg-card border border-border rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
              <div className={`grid ${compact ? 'grid-cols-1 gap-2' : 'grid-cols-3 gap-4'} text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-accent" />
                  <div>
                    <div className="font-medium text-foreground">Criado</div>
                    <div>{formatDate(document.createdAt)}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-accent" />
                  <div>
                    <div className="font-medium text-foreground">Atualizado</div>
                    <div>{formatTime(document.updatedAt)}</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <Bot className="w-4 h-4 mr-2 text-accent" />
                  <div>
                    <div className="font-medium text-foreground">Gerado por</div>
                    <div>NOCI AI</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Editable Document Sections */}
            {(content.sections || []).map((section: any, index: number) => {
              const isNewlyAdded = editState.newlyAddedSections.has(index);
              return (
                <div
                  key={`section-${index}-${section.heading || 'nova-secao'}`}
                  className={`
                    transition-all duration-500 ease-out
                    ${isNewlyAdded 
                      ? 'animate-in slide-in-from-top-4 fade-in-0 duration-500' 
                      : ''
                    }
                  `}
                  style={{
                    transformOrigin: 'top center'
                  }}
                >
                  <EditableSection
                    section={section}
                    sectionIndex={index}
                    isEditing={enableSeamlessEditing ? false : editState.editingSectionIndex === index}
                    saveStatus={'idle'}
                    onStartEdit={enableSeamlessEditing ? () => {} : startEditingSection}
                    onEndEdit={enableSeamlessEditing ? () => {} : stopEditingSection}
                    onContentChange={updateSectionContent}
                    onSave={saveSectionContent}
                    onAddSection={(afterIndex) => {
                      console.log('🚀 Adicionando seção após índice:', afterIndex);
                      const newSection = {
                        heading: '',
                        content: ''
                      };
                      const newSections = [...(content.sections || [])];
                      newSections.splice(afterIndex + 1, 0, newSection);
                      
                      // Atualizar o documento diretamente
                      const updatedDocument = {
                        ...document,
                        content: {
                          ...content,
                          sections: newSections
                        }
                      };
                      
                      if (onDocumentUpdate) {
                        onDocumentUpdate(updatedDocument);
                      }
                      
                      // Auto-start editing the new section
                      setTimeout(() => {
                        startEditingSection(afterIndex + 1, '');
                      }, 100);
                    }}
                    compact={compact}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}