import { useState, useCallback, useRef, useEffect } from 'react';
import type { DocumentEditState, UseEditableDocumentReturn } from '@/components/editable-section.types';
import { contentToEditableString, detectContentType, smartContentConversion, ensureCleanContentFormat } from '@/components/section-content-utils';
import { updateDocumentSection } from '@/lib/api';

// Custom hook for debouncing auto-save
const useDebounce = (callback: Function, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const debouncedCallback = useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
  
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return [debouncedCallback, cancel] as const;
};

/**
 * Hook for managing document editing state with auto-save functionality
 */
export const useEditableDocument = (
  documentId: number,
  sessionId: number,
  onDocumentUpdate?: (document: any) => void
): UseEditableDocumentReturn => {
  const [editState, setEditState] = useState<DocumentEditState>({
    documentId,
    editingSectionIndex: null,
    pendingChanges: new Map(),
    saveStatus: new Map(),
    autoSaveTimers: new Map(),
    newlyAddedSections: new Set()
  });

  const [sections, setSections] = useState<any[]>([]);
  
  // 🛡️ NEW: Local backup of section headings to prevent loss during updates
  const [headingBackup, setHeadingBackup] = useState<Map<number, string>>(new Map());

  const abortControllerRef = useRef<AbortController | null>(null);
  const AUTO_SAVE_DELAY = 3000; // 3 seconds for better UX
  
  // Create debounced save function
  const [debouncedSave, cancelDebouncedSave] = useDebounce((sectionIndex: number) => {
    saveSectionContent(sectionIndex);
  }, AUTO_SAVE_DELAY);

  // 🛡️ NEW: Function to backup section headings
  const backupSectionHeading = useCallback((sectionIndex: number, heading: string) => {
    if (heading && heading.trim()) {
      setHeadingBackup(prev => new Map(prev.set(sectionIndex, heading.trim())));
      console.log('🔒 BACKUP: Heading salvo para seção', sectionIndex, ':', heading);
    }
  }, []);

  // 🛡️ NEW: Function to restore section heading from backup
  const restoreHeadingFromBackup = useCallback((sectionIndex: number): string | undefined => {
    const backed = headingBackup.get(sectionIndex);
    if (backed) {
      console.log('🔄 RESTORE: Restaurando heading da seção', sectionIndex, ':', backed);
    }
    return backed;
  }, [headingBackup]);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      editState.autoSaveTimers.forEach(timer => clearTimeout(timer));
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [editState.autoSaveTimers]);

  // 🔒 NEW: Initialize heading backup when sections are loaded
  useEffect(() => {
    if (sections && sections.length > 0) {
      const newBackup = new Map<number, string>();
      sections.forEach((section, index) => {
        if (section?.heading && typeof section.heading === 'string' && section.heading.trim()) {
          newBackup.set(index, section.heading.trim());
        }
      });
      
      if (newBackup.size > 0) {
        setHeadingBackup(newBackup);
        console.log('🔒 BACKUP INITIAL: Headings iniciais salvos:', Array.from(newBackup.entries()));
      }
    }
  }, [sections]);

  const startEditingSection = useCallback((sectionIndex: number, initialContent?: string) => {
    // Cancel any ongoing edit
    if (editState.editingSectionIndex !== null) {
      const currentTimer = editState.autoSaveTimers.get(editState.editingSectionIndex);
      if (currentTimer) {
        clearTimeout(currentTimer);
      }
    }

    setEditState(prev => ({
      ...prev,
      editingSectionIndex: sectionIndex,
      pendingChanges: new Map(prev.pendingChanges.set(sectionIndex, initialContent || '')),
      saveStatus: new Map(prev.saveStatus.set(sectionIndex, 'idle'))
    }));
  }, [editState.editingSectionIndex, editState.autoSaveTimers]);

  const stopEditingSection = useCallback(() => {
    if (editState.editingSectionIndex !== null) {
      const timer = editState.autoSaveTimers.get(editState.editingSectionIndex);
      if (timer) {
        clearTimeout(timer);
      }
    }

    setEditState(prev => ({
      ...prev,
      editingSectionIndex: null
    }));
  }, [editState.editingSectionIndex, editState.autoSaveTimers]);

  const updateSectionContent = useCallback((sectionIndex: number, content: string) => {
    console.log('🔍 DEBUG updateSectionContent - RECEBIDO:', {
      sectionIndex,
      content,
      contentType: typeof content,
      contentLength: content?.length,
      isEmpty: !content || content.trim().length === 0,
      containsUndefined: typeof content === 'string' && content.includes('undefined'),
      isTitleUpdate: typeof content === 'string' && content.startsWith('TITLE_UPDATE:')
    });

    // 🛡️ PROTECTION: Detect potential undefined content
    if (typeof content === 'string' && content.includes('undefined') && !content.startsWith('TITLE_UPDATE:')) {
      console.error('🚨 RACE CONDITION DETECTED: Content contains "undefined" string:', {
        sectionIndex,
        content,
        timestamp: new Date().toISOString()
      });
      // Don't update with undefined content
      return;
    }

    // 🔒 NEW: Backup current heading before content updates (not title updates)
    if (!content.startsWith('TITLE_UPDATE:') && sections[sectionIndex]?.heading) {
      backupSectionHeading(sectionIndex, sections[sectionIndex].heading);
    }

    // 🔒 NEW: Handle title updates by backing up the new title
    if (content.startsWith('TITLE_UPDATE:')) {
      const newTitle = content.replace('TITLE_UPDATE:', '').trim();
      if (newTitle) {
        backupSectionHeading(sectionIndex, newTitle);
      }
    }
    
    // Update pending changes immediately for responsiveness
    setEditState(prev => ({
      ...prev,
      pendingChanges: new Map(prev.pendingChanges.set(sectionIndex, content)),
      saveStatus: new Map(prev.saveStatus.set(sectionIndex, 'idle'))
    }));

    // Cancel any existing debounced save
    cancelDebouncedSave();
    
    // Start new debounced save - only if content actually changed
    if (content.trim().length > 0) {
      debouncedSave(sectionIndex);
    }
  }, [debouncedSave, cancelDebouncedSave, sections, backupSectionHeading]);

  const saveSectionContent = useCallback(async (sectionIndex: number) => {
    const pendingContent = editState.pendingChanges.get(sectionIndex);
    console.log('🔍 DEBUG saveSectionContent - INICIANDO:', {
      sectionIndex,
      pendingContent,
      hasPendingContent: !!pendingContent
    });
    
    if (!pendingContent) return;

    // Set saving status
    setEditState(prev => ({
      ...prev,
      saveStatus: new Map(prev.saveStatus.set(sectionIndex, 'saving'))
    }));

    try {
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();

      // Check if this is a title update or content update
      let updatePayload: { content?: string; heading?: string } = {};
      let isOptimisticUpdate = false;
      
      if (pendingContent.startsWith('TITLE_UPDATE:')) {
        // Extract title from special format
        const newTitle = pendingContent.replace('TITLE_UPDATE:', '').trim();
        updatePayload.heading = newTitle;
        isOptimisticUpdate = true;
        
        // 🚀 OPTIMISTIC UPDATE: Immediately update local sections for title
        setSections(prev => {
          const updated = [...prev];
          if (updated[sectionIndex]) {
            updated[sectionIndex] = { ...updated[sectionIndex], heading: newTitle };
            console.log('🚀 OPTIMISTIC: Title atualizado localmente:', { sectionIndex, newTitle });
          }
          return updated;
        });
      } else {
        // Regular content update - ensure clean format
        const cleanContent = ensureCleanContentFormat(pendingContent);
        updatePayload.content = cleanContent;
        isOptimisticUpdate = true;
        
        // 🚀 OPTIMISTIC UPDATE: Immediately update local sections for content
        setSections(prev => {
          const updated = [...prev];
          if (updated[sectionIndex]) {
            updated[sectionIndex] = { ...updated[sectionIndex], content: cleanContent };
            console.log('🚀 OPTIMISTIC: Content atualizado localmente:', { 
              sectionIndex, 
              contentPreview: cleanContent.substring(0, 50) + '...'
            });
          }
          return updated;
        });
      }
      
      console.log('🔍 DEBUG saveSectionContent - PAYLOAD:', {
        sessionId,
        documentId,
        sectionIndex,
        updatePayload
      });

      // Make actual API call
      const result = await updateDocumentSection(
        sessionId,
        documentId,
        sectionIndex,
        updatePayload
      );
      
      console.log('🔍 DEBUG saveSectionContent - RESULTADO API:', {
        success: !!result,
        document: result?.document?.id,
        hasContent: !!result?.document?.content
      });

      // 🔒 NEW: Check if heading was lost after backend update and restore if needed
      const updatedSection = result.document?.content?.sections?.[sectionIndex];
      const backedUpHeading = restoreHeadingFromBackup(sectionIndex);
      
      if (updatedSection && backedUpHeading && !updatedSection.heading) {
        console.warn('🚨 HEADING LOSS DETECTED: Restaurando heading da seção', sectionIndex);
        console.log('🔄 RECOVERY: Restaurando heading:', {
          sectionIndex,
          lostHeading: 'undefined/null',
          backupHeading: backedUpHeading,
          timestamp: new Date().toISOString()
        });
        
        // Restore the heading in the returned document
        updatedSection.heading = backedUpHeading;
        
        // Also update local sections immediately
        setSections(prev => {
          const updated = [...prev];
          if (updated[sectionIndex]) {
            updated[sectionIndex] = { ...updated[sectionIndex], heading: backedUpHeading };
          }
          return updated;
        });
      }

      // Update document in parent component if callback provided
      if (onDocumentUpdate) {
        console.log('🔄 CALLING onDocumentUpdate - POTENTIAL RACE CONDITION POINT:', {
          sectionIndex,
          documentId: result.document?.id,
          documentContent: result.document?.content,
          hasUndefinedSections: result.document?.content?.sections?.some((s: any) => s.content === undefined),
          headingProtected: !!updatedSection?.heading
        });
        onDocumentUpdate(result.document);
      }

      // Update status to saved
      setEditState(prev => ({
        ...prev,
        saveStatus: new Map(prev.saveStatus.set(sectionIndex, 'saved')),
        pendingChanges: new Map([...prev.pendingChanges].filter(([key]) => key !== sectionIndex))
      }));

      // Clear saved status after 3 seconds
      setTimeout(() => {
        setEditState(prev => ({
          ...prev,
          saveStatus: new Map(prev.saveStatus.set(sectionIndex, 'idle'))
        }));
      }, 3000);

    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Failed to save section:', error);
        
        // 🚀 REVERT OPTIMISTIC UPDATE: Restore previous state on error
        if (isOptimisticUpdate && sections[sectionIndex]) {
          console.warn('🚀 REVERTING: Optimistic update failed, restaurando estado anterior:', {
            sectionIndex,
            error: error.message
          });
          
          // Try to restore from backup or use current backend state
          const backedUpHeading = restoreHeadingFromBackup(sectionIndex);
          setSections(prev => {
            const updated = [...prev];
            if (updated[sectionIndex]) {
              // Revert to previous state - this is a simple revert, in production
              // you might want to keep a more sophisticated state history
              if (pendingContent.startsWith('TITLE_UPDATE:') && backedUpHeading) {
                updated[sectionIndex] = { ...updated[sectionIndex], heading: backedUpHeading };
              }
              // For content updates, we don't have the previous content easily available,
              // so we'll rely on the next document refresh to correct it
            }
            return updated;
          });
        }
        
        setEditState(prev => ({
          ...prev,
          saveStatus: new Map(prev.saveStatus.set(sectionIndex, 'error'))
        }));

        // Clear error status after 5 seconds and retry option
        setTimeout(() => {
          setEditState(prev => ({
            ...prev,
            saveStatus: new Map(prev.saveStatus.set(sectionIndex, 'idle'))
          }));
        }, 5000);
      }
    }
  }, [documentId, sessionId, editState.pendingChanges, onDocumentUpdate, restoreHeadingFromBackup]);

  const cancelEditing = useCallback(() => {
    if (editState.editingSectionIndex !== null) {
      const timer = editState.autoSaveTimers.get(editState.editingSectionIndex);
      if (timer) {
        clearTimeout(timer);
      }
      
      setEditState(prev => ({
        ...prev,
        editingSectionIndex: null,
        pendingChanges: new Map([...prev.pendingChanges].filter(([key]) => key !== editState.editingSectionIndex)),
        saveStatus: new Map([...prev.saveStatus].filter(([key]) => key !== editState.editingSectionIndex)),
        autoSaveTimers: new Map([...prev.autoSaveTimers].filter(([key]) => key !== editState.editingSectionIndex))
      }));
    }
  }, [editState.editingSectionIndex, editState.autoSaveTimers]);

  const addNewSection = useCallback((afterIndex: number) => {
    console.log('addNewSection chamado com afterIndex:', afterIndex);
    console.log('Seções atuais:', sections);
    
    const newSection = {
      heading: 'Nova Seção',
      content: 'Clique para adicionar conteúdo...'
    };

    const newSections = [...sections];
    newSections.splice(afterIndex + 1, 0, newSection);
    console.log('Novas seções após inserção:', newSections);
    setSections(newSections);

    // Mark the newly added section for animation
    const newSectionIndex = afterIndex + 1;
    setEditState(prev => ({
      ...prev,
      newlyAddedSections: new Set([...prev.newlyAddedSections, newSectionIndex])
    }));

    // Clear the animation flag after a delay
    setTimeout(() => {
      setEditState(prev => {
        const newSet = new Set(prev.newlyAddedSections);
        newSet.delete(newSectionIndex);
        return {
          ...prev,
          newlyAddedSections: newSet
        };
      });
    }, 500);

    // Auto-start editing the new section
    setTimeout(() => {
      startEditingSection(newSectionIndex, 'Clique para adicionar conteúdo...');
    }, 400);
  }, [sections, startEditingSection]);

  return {
    editState,
    startEditingSection,
    stopEditingSection,
    updateSectionContent,
    saveSectionContent,
    cancelEditing,
    addNewSection,
    sections,
    setSections
  };
};