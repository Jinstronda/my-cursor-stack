import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Plus } from 'lucide-react';
import type { EditableSectionProps } from './editable-section.types';
import { contentToEditableString } from './section-content-utils';
import FormattingToolbar from './formatting-toolbar';
import { useTextSelection } from '../hooks/use-text-selection';
import { formatAsSubtitle, formatAsList, processTextInput } from '../utils/text-formatting';
import { renderMarkdown, toggleBoldFormatting } from '../utils/markdown-renderer';

const EditableSection: React.FC<EditableSectionProps> = ({
  section,
  sectionIndex,
  isEditing,
  saveStatus = 'idle',
  onStartEdit,
  onEndEdit,
  onContentChange,
  onSave,
  onAddSection,
  compact = false
}) => {
  // NEW: Seamless editing mode detection
  // Simple detection: if onStartEdit and onEndEdit exist but isEditing is false, likely seamless mode
  const seamlessMode = !isEditing && !!onStartEdit && !!onEndEdit;
  // If no editing state management props are provided, use seamless mode
  const [isHovered, setIsHovered] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [lastSavedContent, setLastSavedContent] = useState('');

  // Text selection and formatting toolbar
  const {
    selection,
    isVisible: isToolbarVisible,
    toolbarPosition,
    clearSelection
  } = useTextSelection(contentRef);


  // Initialize content when editing starts OR in seamless mode
  useEffect(() => {
    console.log('🔍 DEBUG useEffect - INICIANDO:', {
      sectionIndex,
      isEditing,
      seamlessMode,
      sectionContent: section.content,
      sectionHeading: section.heading,
      contentIsUndefined: section.content === undefined,
      contentIsNull: section.content === null
    });

    if ((isEditing || seamlessMode) && contentRef.current) {
      // 🛡️ PROTECTION: Skip update if section.content is undefined (race condition)
      if (section.content === undefined) {
        console.warn('⚠️  Skipping content update - section.content is undefined (race condition detected)');
        return;
      }

      const editableContent = contentToEditableString(section.content);
      const currentContent = contentRef.current.textContent;
      
      console.log('🔍 DEBUG useEffect - CONTENT COMPARISON:', {
        sectionIndex,
        editableContent,
        currentContent,
        shouldUpdate: currentContent !== editableContent,
        editableContentLength: editableContent.length,
        currentContentLength: currentContent?.length || 0
      });

      if (currentContent !== editableContent) {
        console.log('🔄 Updating content element:', {
          sectionIndex,
          from: currentContent,
          to: editableContent
        });
        contentRef.current.textContent = editableContent;
        setLastSavedContent(editableContent);
      }
      
      // Focus only in legacy editing mode, not in seamless mode
      if (isEditing && !seamlessMode) {
        contentRef.current.focus();
      }
    }

    // Initialize title properly - ensure it shows the actual heading
    if (titleRef.current) {
      const currentText = titleRef.current.textContent;
      const expectedText = section.heading || 'Clique para adicionar título...';
      
      console.log('🔍 DEBUG useEffect - TITLE COMPARISON:', {
        sectionIndex,
        currentText,
        expectedText,
        shouldUpdate: currentText !== expectedText
      });

      if (currentText !== expectedText) {
        console.log('🔄 Updating title element:', {
          sectionIndex,
          from: currentText,
          to: expectedText
        });
        titleRef.current.textContent = expectedText;
      }
    }
  }, [isEditing, seamlessMode, section.content, section.heading]);

  const handleClick = useCallback(() => {
    if (seamlessMode) {
      // In seamless mode, just focus the contentEditable
      if (contentRef.current) {
        contentRef.current.focus();
      }
      return;
    }
    
    // Legacy mode - trigger edit state
    if (!isEditing) {
      onStartEdit(sectionIndex);
    }
  }, [seamlessMode, isEditing, sectionIndex, onStartEdit]);

  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.textContent || '';
    
    // ✅ FIXED: Now using React-safe processTextInput that returns processed text
    const processedContent = processTextInput(content);
    
    // Only update if content was actually changed by auto-formatting
    if (processedContent !== content) {
      console.log('🔍 DEBUG handleInput - AUTO-FORMATAÇÃO APLICADA:', {
        sectionIndex,
        original: content,
        processed: processedContent,
        timestamp: new Date().toISOString()
      });
      
      // Update the contentEditable element with processed content
      e.currentTarget.textContent = processedContent;
      onContentChange(sectionIndex, processedContent);
    } else {
      // No auto-formatting needed, just update normally
      console.log('🔍 DEBUG handleInput - CONTEÚDO NORMAL:', {
        sectionIndex,
        content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        contentLength: content.length,
        timestamp: new Date().toISOString()
      });
      
      onContentChange(sectionIndex, content);
    }
  }, [sectionIndex, onContentChange]);

  const handleTitleInput = useCallback((e: React.FormEvent<HTMLHeadingElement>) => {
    const newTitle = e.currentTarget.textContent || '';
    // Don't trigger updates for the placeholder text
    if (newTitle === 'Clique para adicionar título...') {
      return;
    }
    // Call the parent's content change handler to update the title
    // We'll use a special format to indicate this is a title update
    if (section.heading !== newTitle) {
      onContentChange(sectionIndex, `TITLE_UPDATE:${newTitle}`);
    }
  }, [section.heading, sectionIndex, onContentChange]);

  const handleTitleFocus = useCallback((e: React.FocusEvent<HTMLHeadingElement>) => {
    // Only clear if it's the placeholder text
    if (e.currentTarget.textContent === 'Clique para adicionar título...') {
      e.currentTarget.textContent = '';
    }
  }, []);

  const handleTitleBlur = useCallback((e: React.FocusEvent<HTMLHeadingElement>) => {
    const currentTitle = e.currentTarget.textContent || '';
    
    // Save if there's content and it's different from current
    if (currentTitle.trim() && currentTitle !== 'Clique para adicionar título...' && currentTitle !== section.heading) {
      handleTitleInput(e as any);
    }
  }, [section.heading, handleTitleInput]);

  // Helper function for tab navigation
  const navigateToSection = useCallback((direction: 'next' | 'prev') => {
    const targetIndex = direction === 'next' ? sectionIndex + 1 : sectionIndex - 1;
    if (direction === 'prev' && targetIndex < 0) return false;
    
    const targetSection = document.querySelector(`[data-section-index="${targetIndex}"] [contenteditable]`);
    if (targetSection) {
      (targetSection as HTMLElement).focus();
      return true;
    }
    return false;
  }, [sectionIndex]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // 🎯 FIXED: Ctrl+B for bold formatting with correct selection
    if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      
      if (contentRef.current) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const selectionStart = range.startOffset;
          const selectionEnd = range.endOffset;
          
          if (selectionStart !== selectionEnd) {
            // Has selected text - apply bold formatting
            const result = toggleBoldFormatting(
              contentRef.current,
              selectionStart,
              selectionEnd
            );
            
            contentRef.current.textContent = result.newText;
            onContentChange(sectionIndex, result.newText);
            
            // 🎯 FIX: Restore selection to the exact formatted text
            setTimeout(() => {
              const newSelection = window.getSelection();
              if (newSelection && contentRef.current && contentRef.current.firstChild) {
                const range = document.createRange();
                range.setStart(contentRef.current.firstChild, result.newStart);
                range.setEnd(contentRef.current.firstChild, result.newEnd);
                newSelection.removeAllRanges();
                newSelection.addRange(range);
              }
            }, 0);
          }
        }
      }
      return;
    }

    // Escape key handling (both modes)
    if (e.key === 'Escape') {
      e.preventDefault();
      if (contentRef.current) {
        const savedContent = seamlessMode 
          ? contentToEditableString(section.content)
          : lastSavedContent;
        contentRef.current.textContent = savedContent;
      }
      
      if (seamlessMode) {
        e.currentTarget.blur();
      } else {
        onEndEdit();
      }
      return;
    }

    // Tab navigation (both modes)
    if (e.key === 'Tab') {
      e.preventDefault();
      const direction = e.shiftKey ? 'prev' : 'next';
      
      if (seamlessMode) {
        navigateToSection(direction);
      } else {
        // Legacy mode - save before navigating
        const content = contentRef.current?.textContent || '';
        onSave(sectionIndex, content);
        
        if (navigateToSection(direction)) {
          onEndEdit();
        } else {
          onEndEdit();
        }
      }
      return;
    }

    // Legacy mode specific handlers
    if (!seamlessMode) {
      // Enter key - save and exit editing (Shift+Enter allows line breaks)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const content = contentRef.current?.textContent || '';
        onSave(sectionIndex, content);
        onEndEdit();
        return;
      }
    }
    // In seamless mode, Enter creates line breaks naturally (no preventDefault)
  }, [seamlessMode, section.content, lastSavedContent, onEndEdit, onSave, sectionIndex, navigateToSection]);

  const handleBlur = useCallback(() => {
    if (seamlessMode) {
      // In seamless mode, just auto-save on blur
      setTimeout(() => {
        const content = contentRef.current?.textContent || '';
        if (content !== lastSavedContent) {
          onSave(sectionIndex, content);
          setLastSavedContent(content);
        }
      }, 100);
      return;
    }

    // Legacy mode - auto-save when losing focus
    setTimeout(() => {
      const content = contentRef.current?.textContent || '';
      if (content !== lastSavedContent) {
        onSave(sectionIndex, content);
      }
      onEndEdit();
    }, 100); // Small delay to handle clicks on other elements
  }, [seamlessMode, lastSavedContent, onEndEdit, onSave, sectionIndex]);

  const handleMouseEnter = useCallback(() => {
    if (seamlessMode && onAddSection) {
      setIsHovered(true);
      setTimeout(() => {
        setShowButton(true);
      }, 300); // 300ms delay for smooth UX
    }
  }, [seamlessMode, onAddSection]);

  const handleMouseLeave = useCallback(() => {
    if (seamlessMode) {
      setIsHovered(false);
      setShowButton(false);
    }
  }, [seamlessMode]);

  // Render the original content using the same logic as DocumentReader
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
    return textContent;
  };


  const handleAddSection = useCallback(() => {
    if (onAddSection) {
      onAddSection(sectionIndex);
    }
  }, [onAddSection, sectionIndex]);

  // Formatting functions
  const handleFormatSubtitle = useCallback(() => {
    if (!selection?.range || !selection?.text || !contentRef.current) return;
    
    try {
      // Use the new React-safe formatting function
      const formattedContent = formatAsSubtitle(selection.range, selection.text);
      
      if (formattedContent) {
        // Update the contentEditable element
        contentRef.current.textContent = formattedContent;
        
        // Clear selection and update content
        clearSelection();
        onContentChange(sectionIndex, formattedContent);
        
        console.log('✅ Subtitle formatted successfully');
      }
    } catch (error) {
      console.error('Erro ao formatar subtítulo:', error);
    }
  }, [selection, clearSelection, sectionIndex, onContentChange]);

  const handleFormatList = useCallback(() => {
    if (!selection?.range || !selection?.text || !contentRef.current) return;
    
    try {
      // Use the new React-safe formatting function
      const formattedContent = formatAsList(selection.range, selection.text);
      
      if (formattedContent) {
        // Update the contentEditable element
        contentRef.current.textContent = formattedContent;
        
        // Clear selection and update content
        clearSelection();
        onContentChange(sectionIndex, formattedContent);
        
        console.log('✅ List formatted successfully');
      }
    } catch (error) {
      console.error('Erro ao formatar lista:', error);
    }
  }, [selection, clearSelection, sectionIndex, onContentChange]);

  return (
    <article 
      data-section-index={sectionIndex}
      className={`
        relative bg-card border-0 rounded-lg ${compact ? 'p-4' : 'p-6'} space-y-4
        ${seamlessMode && isHovered ? 'shadow-sm ring-1 ring-border/20' : ''}
        transition-all duration-200 ease-out
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="region"
      aria-label={`Seção editável: ${section.heading}`}
      aria-live={isEditing ? 'polite' : 'off'}
      tabIndex={0}
    >
      <header className="border-b border-border pb-3">
        <h2 
          ref={titleRef}
          contentEditable={seamlessMode || isEditing}
          suppressContentEditableWarning={true}
          onInput={handleTitleInput}
          onFocus={handleTitleFocus}
          onBlur={handleTitleBlur}
          className={`
            font-semibold leading-tight outline-none
            ${compact ? 'text-base' : 'text-lg'} 
            ${seamlessMode ? 'focus:ring-1 focus:ring-accent/20 focus:rounded-md focus:px-2 focus:py-1 transition-all duration-150' : ''}
            cursor-text
            ${!section.heading ? 'text-muted-foreground italic font-normal' : 'text-foreground'}
          `}
        >
          {section.heading || 'Clique para adicionar título...'}
        </h2>
      </header>
      
      {(isEditing || seamlessMode) ? (
        <div 
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning={true}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          role="textbox"
          aria-label={`Editando: ${section.heading}`}
          aria-multiline="true"
          aria-describedby={`section-${sectionIndex}-status`}
          className={`
            text-foreground leading-relaxed outline-none min-h-[3rem] 
            ${compact ? 'text-sm' : 'text-base'} 
            px-0 py-0 cursor-text
            [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-1
            [&_li]:text-foreground
            whitespace-pre-wrap touch-manipulation
            ${seamlessMode ? 'focus:ring-1 focus:ring-accent/20 focus:rounded-md focus:px-2 focus:py-1 transition-all duration-150' : ''}
            empty:before:content-['Clique_para_adicionar_conteúdo...'] 
            empty:before:text-muted-foreground empty:before:italic
            @media (max-width: 768px) { min-h-[4rem] text-base }
          `}
          style={{
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            touchAction: 'manipulation'
          }}
        />
      ) : (
        <div 
          onClick={handleClick}
          role="button"
          tabIndex={0}
          aria-label={`Clique para editar: ${section.heading}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick();
            }
          }}
          className={`
            text-foreground leading-relaxed cursor-text min-h-[3rem]
            ${compact ? 'text-sm' : 'text-base md:text-base'}
            px-0 py-0 touch-manipulation
            md:min-h-[3rem] min-h-[4rem]
            focus:outline-none
            whitespace-pre-wrap
          `}
        >
          {section.content ? renderValue(section.content) : (
            <span className="text-muted-foreground italic">Clique para adicionar conteúdo...</span>
          )}
        </div>
      )}
      


      {/* Add Section Button - Only in seamless mode */}
      {seamlessMode && showButton && onAddSection && (
        <button
          onClick={handleAddSection}
          className={`
            absolute -bottom-3 left-1/2 transform -translate-x-1/2
            w-6 h-6 bg-accent hover:bg-accent/80 text-accent-foreground
            rounded-full flex items-center justify-center
            shadow-sm hover:shadow-md transition-all duration-200
            animate-in fade-in-0 slide-in-from-top-1
            z-10
          `}
          aria-label="Adicionar nova seção"
        >
          <Plus className="w-3 h-3" />
        </button>
      )}

      {/* Formatting Toolbar - Appears on text selection */}
      <FormattingToolbar
        isVisible={isToolbarVisible}
        position={toolbarPosition}
        onFormatSubtitle={handleFormatSubtitle}
        onFormatList={handleFormatList}
      />
    </article>
  );
};

export default React.memo(EditableSection);