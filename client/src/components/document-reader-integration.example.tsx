/* 
 * EXAMPLE: Como integrar EditableSection no DocumentReader
 * Este arquivo é apenas um exemplo de como fazer a integração
 * Não deve ser usado diretamente - serve como referência
 */

import React from 'react';
import EditableSection from './editable-section';
import { useEditableDocument } from '@/hooks/use-editable-document';

// Exemplo de como o DocumentReader ficaria com EditableSection integrado:
export function DocumentReaderIntegrationExample({ document, compact = false }: any) {
  const { editState, startEditingSection, stopEditingSection, updateSectionContent, saveSectionContent } = 
    useEditableDocument(document.id, 1); // sessionId seria obtido do contexto

  const content = document.content as any;

  return (
    <div className="space-y-6">
      {/* Document Sections com EditableSection */}
      {content.sections?.map((section: any, index: number) => (
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
          compact={compact}
        />
      )) || (
        // Fallback para documentos sem seções estruturadas
        <EditableSection
          section={{ heading: 'Conteúdo do Documento', content: content }}
          sectionIndex={0}
          isEditing={editState.editingSectionIndex === 0}
          saveStatus={editState.saveStatus.get(0) || 'idle'}
          onStartEdit={startEditingSection}
          onEndEdit={stopEditingSection}
          onContentChange={updateSectionContent}
          onSave={saveSectionContent}
          compact={compact}
        />
      )}
    </div>
  );
}

/* 
 * COMO USAR:
 * 
 * 1. No DocumentReader, importar:
 *    import EditableSection from './editable-section';
 *    import { useEditableDocument } from '@/hooks/use-editable-document';
 * 
 * 2. Adicionar o hook no componente:
 *    const { editState, startEditingSection, stopEditingSection, updateSectionContent, saveSectionContent } = 
 *      useEditableDocument(document.id, sessionId);
 * 
 * 3. Substituir o mapeamento de seções por:
 *    {content.sections?.map((section: any, index: number) => (
 *      <EditableSection
 *        key={index}
 *        section={section}
 *        sectionIndex={index}
 *        isEditing={editState.editingSectionIndex === index}
 *        onStartEdit={startEditingSection}
 *        onEndEdit={stopEditingSection}
 *        onContentChange={updateSectionContent}
 *        onSave={saveSectionContent}
 *        compact={compact}
 *      />
 *    ))}
 * 
 * FUNCIONALIDADE RESULTANTE:
 * - ✅ Clique em qualquer texto para editar
 * - ✅ Edição inline sem modal/textarea
 * - ✅ Enter salva e sai do modo edição
 * - ✅ Escape cancela e restaura texto original
 * - ✅ Blur auto-salva as mudanças
 * - ✅ Indicadores visuais "Clique para editar" / "Editando"
 * - ✅ Formatação markdown preservada
 * - ✅ Suporte a listas, objetos e texto simples
 */