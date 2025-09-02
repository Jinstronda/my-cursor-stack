/**
 * Utilitários para formatação de texto
 */

/**
 * Transforma texto selecionado em subtítulo (React-safe version)
 */
export const formatAsSubtitle = (range: Range, text: string): string => {
  if (!range || !text.trim()) return '';

  try {
    // Get the container element
    const container = range.commonAncestorContainer;
    const parentElement = container.nodeType === Node.TEXT_NODE 
      ? container.parentElement 
      : container as HTMLElement;

    if (!parentElement || !parentElement.isContentEditable) {
      console.warn('formatAsSubtitle: Invalid container');
      return '';
    }

    // Get full text content from the container
    const fullText = parentElement.textContent || '';
    
    // Find position of selected text in full content
    const startPos = fullText.indexOf(text);
    if (startPos === -1) {
      console.warn('formatAsSubtitle: Selected text not found in content');
      return fullText;
    }

    // Build new content with subtitle formatting
    const before = fullText.substring(0, startPos);
    const after = fullText.substring(startPos + text.length);
    
    // Create formatted subtitle with markdown-style formatting
    const formattedSubtitle = `\n## ${text.trim()}\n`;
    const newContent = before + formattedSubtitle + after;

    return newContent;
    
  } catch (error) {
    console.error('Erro ao formatar subtítulo:', error);
    return '';
  }
};

/**
 * Transforma texto selecionado em item de lista (React-safe version)
 */
export const formatAsList = (range: Range, text: string): string => {
  if (!range || !text.trim()) return '';

  try {
    // Get the container element
    const container = range.commonAncestorContainer;
    const parentElement = container.nodeType === Node.TEXT_NODE 
      ? container.parentElement 
      : container as HTMLElement;

    if (!parentElement || !parentElement.isContentEditable) {
      console.warn('formatAsList: Invalid container');
      return '';
    }

    // Get full text content from the container
    const fullText = parentElement.textContent || '';
    
    // Find position of selected text in full content
    const startPos = fullText.indexOf(text);
    if (startPos === -1) {
      console.warn('formatAsList: Selected text not found in content');
      return fullText;
    }

    // Build new content with list formatting
    const before = fullText.substring(0, startPos);
    const after = fullText.substring(startPos + text.length);
    
    // Convert selected text to bullet list
    const lines = text.trim().split('\n').filter(line => line.trim());
    const formattedList = lines.map(line => `• ${line.trim()}`).join('\n');
    const newContent = before + '\n' + formattedList + '\n' + after;

    return newContent;
    
  } catch (error) {
    console.error('Erro ao formatar lista:', error);
    return '';
  }
};

/**
 * Auto-formatação de texto com hífen para tópicos (React-safe version)
 * Returns the formatted text instead of modifying DOM directly
 */
export const autoFormatHyphens = (text: string): string => {
  if (!text) return text;

  try {
    // Process text line by line
    const lines = text.split('\n');
    let hasChanges = false;
    
    const processedLines = lines.map(line => {
      // Detect line that starts with hyphen and space
      if (line.match(/^\s*-\s+(.+)/)) {
        hasChanges = true;
        return line.replace(/^\s*-\s+/, '• '); // Replace with bullet point
      }
      return line;
    });

    // Return processed text if there were changes, otherwise return original
    return hasChanges ? processedLines.join('\n') : text;

  } catch (error) {
    console.error('Erro na auto-formatação de hífens:', error);
    return text; // Return original text on error
  }
};

/**
 * Processar entrada de texto para auto-formatações (React-safe version)
 * Returns the processed text instead of modifying DOM directly
 */
export const processTextInput = (inputText: string): string => {
  console.log('🔍 DEBUG processTextInput - ENTRADA:', {
    inputText,
    inputLength: inputText.length
  });
  
  // Auto-format hyphens
  const processedText = autoFormatHyphens(inputText);
  
  console.log('🔍 DEBUG processTextInput - APÓS autoFormatHyphens:', {
    processedText,
    changed: processedText !== inputText,
    processedLength: processedText.length
  });
  
  // Other auto-formatting can be added here
  return processedText;
};

/**
 * Limpar formatação desnecessária (sanitização)
 */
export const cleanupFormatting = (element: HTMLElement): void => {
  if (!element) return;

  try {
    // Remover elementos vazios
    const emptyElements = element.querySelectorAll('p:empty, div:empty, span:empty');
    emptyElements.forEach(el => el.remove());
    
    // Normalizar espaços em branco
    element.normalize();
    
  } catch (error) {
    console.error('Erro na limpeza de formatação:', error);
  }
};