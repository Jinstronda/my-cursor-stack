/**
 * Types for EditableSection component
 */
export interface EditableSectionState {
  /** Which section is currently being edited (by index) */
  editingSectionIndex: number | null;
  
  /** Whether section is being hovered */
  isHovered: boolean;
  
  /** Whether content has unsaved changes */
  isDirty: boolean;
  
  /** Current save status */
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  
  /** When was last saved */
  lastSaved: Date | null;
  
  /** Current content being edited */
  currentContent: string;
  
  /** Original content (for cancel functionality) */
  originalContent: string;
}

export interface EditableSectionProps {
  /** Section data */
  section: {
    heading: string;
    content: any;
  };
  
  /** Section index in document */
  sectionIndex: number;
  
  /** Whether this section is currently being edited */
  isEditing: boolean;
  
  /** Save status for this section */
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  
  /** Callback when edit mode starts */
  onStartEdit: (sectionIndex: number, initialContent?: string) => void;
  
  /** Callback when edit mode ends */
  onEndEdit: () => void;
  
  /** Callback when content changes */
  onContentChange: (sectionIndex: number, newContent: string) => void;
  
  /** Callback to save content */
  onSave: (sectionIndex: number, content: string) => Promise<void>;
  
  /** Callback to add new section after this one */
  onAddSection?: (afterIndex: number) => void;
  
  /** Whether to show compact mode */
  compact?: boolean;
}

export interface DocumentEditState {
  /** Document being edited */
  documentId: number;
  
  /** Current editing section */
  editingSectionIndex: number | null;
  
  /** Pending changes by section index */
  pendingChanges: Map<number, string>;
  
  /** Save status by section index */
  saveStatus: Map<number, 'idle' | 'saving' | 'saved' | 'error'>;
  
  /** Auto-save timers by section index */
  autoSaveTimers: Map<number, NodeJS.Timeout>;
  
  /** Track newly added sections for animations */
  newlyAddedSections: Set<number>;
}

/**
 * Hook return type for useEditableDocument
 */
export interface UseEditableDocumentReturn {
  /** Current edit state */
  editState: DocumentEditState;
  
  /** Start editing a section */
  startEditingSection: (sectionIndex: number, initialContent?: string) => void;
  
  /** Stop editing current section */
  stopEditingSection: () => void;
  
  /** Update section content */
  updateSectionContent: (sectionIndex: number, content: string) => void;
  
  /** Save section content */
  saveSectionContent: (sectionIndex: number) => Promise<void>;
  
  /** Cancel editing and revert changes */
  cancelEditing: () => void;
  
  /** Add a new section after the given index */
  addNewSection: (afterIndex: number) => void;
  
  /** Document sections data */
  sections: any[];
  
  /** Set document sections */
  setSections: (sections: any[]) => void;
}