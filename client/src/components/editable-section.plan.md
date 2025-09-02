# 📐 Plano do Componente EditableSection

## 🎯 Objetivo
Wrapper que transforma seções estáticas em editáveis com botão hover ✏️ → ✕

## 📦 Estrutura do Componente

### **Arquivo Principal**: `editable-section.tsx`

```typescript
// Estrutura básica do componente
EditableSection {
  // Props recebidas
  - section: { heading, content }
  - sectionIndex: number
  - isEditing: boolean
  - callbacks: onStartEdit, onEndEdit, onContentChange, onSave
  
  // Estado interno
  - [isHovered, setIsHovered] = useState(false)
  - [tempContent, setTempContent] = useState('')
  - [saveStatus, setSaveStatus] = useState('idle')
  
  // Render condicional
  if (isEditing) {
    return <EditMode />
  } else {
    return <ViewMode />
  }
}
```

### **Modo Visualização** (`ViewMode`)
```jsx
<div 
  className="relative group"
  onMouseEnter={() => setIsHovered(true)}
  onMouseLeave={() => setIsHovered(false)}
>
  {/* Conteúdo original */}
  <div className="section-content">
    {renderOriginalContent(section)}
  </div>
  
  {/* Botão Edit (aparecer no hover) */}
  {isHovered && (
    <Button
      variant="ghost"
      size="icon"
      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
      onClick={() => onStartEdit(sectionIndex)}
    >
      <Edit className="w-4 h-4" />
    </Button>
  )}
</div>
```

### **Modo Edição** (`EditMode`)
```jsx
<div className="relative">
  {/* Header com botão close */}
  <div className="flex justify-between items-center mb-2">
    <span className="text-sm text-muted-foreground">
      Editando: {section.heading}
    </span>
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCloseEdit}
    >
      <X className="w-4 h-4" />
    </Button>
  </div>
  
  {/* Textarea para edição */}
  <Textarea
    value={tempContent}
    onChange={handleContentChange}
    className="min-h-[100px] resize-none"
    autoFocus
  />
  
  {/* Status de save */}
  <div className="mt-2 text-xs text-muted-foreground">
    {renderSaveStatus()}
  </div>
</div>
```

## 🔧 Hooks e Utilitários

### **Hook principal**: `useEditableDocument`
```typescript
// Arquivo: hooks/use-editable-document.ts
const useEditableDocument = (documentId: number) => {
  // Estado global de edição do documento
  const [editState, setEditState] = useState<DocumentEditState>({
    documentId,
    editingSectionIndex: null,
    pendingChanges: new Map(),
    saveStatus: new Map(),
    autoSaveTimers: new Map()
  });
  
  // Métodos públicos
  const startEditingSection = (sectionIndex: number, initialContent: string) => {
    // Para edição atual se houver
    // Inicia nova edição
    // Setup auto-save timer
  };
  
  const saveSectionContent = async (sectionIndex: number) => {
    // API call para salvar
    // Update status
    // Clear timer
  };
  
  return {
    editState,
    startEditingSection,
    stopEditingSection,
    updateSectionContent,
    saveSectionContent,
    cancelEditing
  };
};
```

### **Utilitário**: `section-content-utils.ts`
```typescript
// Converter content para string editável
export const contentToEditableString = (content: any): string => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.join('\n');
  if (typeof content === 'object') return JSON.stringify(content, null, 2);
  return String(content);
};

// Converter string editada de volta para estrutura original
export const editableStringToContent = (str: string, originalType: 'string' | 'array' | 'object'): any => {
  switch (originalType) {
    case 'string': return str;
    case 'array': return str.split('\n').filter(line => line.trim());
    case 'object': 
      try { return JSON.parse(str); }
      catch { return { content: str }; }
    default: return str;
  }
};
```

## 🔄 Integração com DocumentReader

### **Ponto de Integração**: `document-reader.tsx:339-349`

**ANTES:**
```jsx
{content.sections?.map((section: any, index: number) => (
  <article key={index} className={`...`}>
    <header className="...">
      <h2>{section.heading}</h2>
    </header>
    <div className="...">
      {renderValue(section.content)}
    </div>
  </article>
))}
```

**DEPOIS:**
```jsx
{content.sections?.map((section: any, index: number) => (
  <EditableSection
    key={index}
    section={section}
    sectionIndex={index}
    isEditing={editState.editingSectionIndex === index}
    onStartEdit={startEditingSection}
    onEndEdit={stopEditingSection}
    onContentChange={updateSectionContent}
    onSave={saveSectionContent}
    compact={compact}
  />
))}
```

## 🎨 Styling Strategy

### **Classes CSS customizadas**
```css
/* Smooth transitions */
.section-edit-transition {
  transition: all 200ms ease-in-out;
}

/* Hover effects */
.section-hover {
  background: rgba(var(--accent), 0.05);
  border: 1px solid rgba(var(--accent), 0.2);
}

/* Edit mode styling */
.section-editing {
  background: rgba(var(--primary), 0.05);
  border: 2px solid rgba(var(--primary), 0.3);
  border-radius: 8px;
  padding: 16px;
}

/* Save status indicators */
.save-status-saving { color: rgb(234, 179, 8); }
.save-status-saved { color: rgb(34, 197, 94); }
.save-status-error { color: rgb(239, 68, 68); }
```

### **Responsive considerations**
```typescript
const getEditButtonClasses = (compact: boolean) => cn(
  "absolute top-2 right-2 transition-opacity duration-200",
  "opacity-0 group-hover:opacity-100",
  compact ? "w-6 h-6" : "w-8 h-8",
  "bg-background/80 backdrop-blur-sm border border-border/50"
);
```

## ⚡ Performance Optimizations

### **Memoization strategy**
```typescript
// Memo para evitar re-renders desnecessários
const EditableSection = React.memo(({ section, sectionIndex, ...props }) => {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison function
  return (
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.section.content === nextProps.section.content &&
    prevProps.sectionIndex === nextProps.sectionIndex
  );
});
```

### **Debounce para auto-save**
```typescript
const useAutoSave = (callback: Function, delay: number = 2000) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};
```

## 🧪 Testing Strategy

### **Unit tests necessários**
1. **EditableSection component**
   - Render modes (view/edit)
   - Hover interactions
   - Button clicks
   - Content updates

2. **useEditableDocument hook**
   - State management
   - Auto-save logic
   - API interactions

3. **Utility functions**
   - Content conversion functions
   - Type preservation

### **Integration tests**
1. **Full edit flow**
   - Hover → Edit → Change → Auto-save → Close
   - Multiple sections editing prevention
   - Error handling

## 📋 Implementation Checklist

- [ ] Create `editable-section.tsx` component
- [ ] Create `use-editable-document.ts` hook  
- [ ] Create `section-content-utils.ts` utilities
- [ ] Update `document-reader.tsx` integration
- [ ] Add custom CSS classes
- [ ] Implement auto-save with debounce
- [ ] Add error handling and recovery
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Performance optimization with memoization

---

*Este plano serve como blueprint técnico para implementação da FASE 2*