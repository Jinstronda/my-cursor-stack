/**
 * Utilities for converting between different content formats for EditableSection
 */

export type ContentType = 'string' | 'array' | 'object';

/**
 * Convert any content type to editable string format
 */
export const contentToEditableString = (content: any): string => {
  console.log('🔍 DEBUG contentToEditableString - ENTRADA:', {
    content,
    type: typeof content,
    isArray: Array.isArray(content),
    isNull: content === null,
    isUndefined: content === undefined
  });
  
  let result: string;
  
  // 🛡️ PROTECTION: Handle undefined/null explicitly to prevent "undefined" text
  if (content === undefined || content === null) {
    result = '';
    console.warn('⚠️  contentToEditableString received undefined/null, returning empty string');
  } else if (typeof content === 'string') {
    result = content;
  } else if (Array.isArray(content)) {
    result = content.join('\n');
  } else if (typeof content === 'object') {
    try {
      result = JSON.stringify(content, null, 2);
    } catch {
      result = '';
      console.warn('⚠️  Failed to stringify object, returning empty string');
    }
  } else {
    // Last resort: convert to string, but avoid "undefined"
    const stringContent = String(content);
    result = stringContent === 'undefined' ? '' : stringContent;
    console.warn('⚠️  Fallback string conversion, content:', content);
  }
  
  console.log('🔍 DEBUG contentToEditableString - SAÍDA:', {
    result,
    resultLength: result.length,
    resultType: typeof result,
    isEmpty: result === '',
    containsUndefined: result.includes('undefined')
  });
  
  return result;
};

/**
 * Detect the original type of content
 */
export const detectContentType = (content: any): ContentType => {
  if (Array.isArray(content)) return 'array';
  if (typeof content === 'object' && content !== null) return 'object';
  return 'string';
};

/**
 * Convert edited string back to original content format
 */
export const editableStringToContent = (str: string, originalType: ContentType): any => {
  switch (originalType) {
    case 'string':
      return str;
    
    case 'array':
      return str
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    
    case 'object':
      try {
        const parsed = JSON.parse(str);
        return typeof parsed === 'object' && parsed !== null ? parsed : { content: str };
      } catch {
        // If JSON parsing fails, treat as plain text
        return { content: str };
      }
    
    default:
      return str;
  }
};

/**
 * Validate that content conversion is safe and reversible
 */
export const validateContentConversion = (originalContent: any, editedString: string): boolean => {
  const originalType = detectContentType(originalContent);
  const converted = editableStringToContent(editedString, originalType);
  
  try {
    // Check if conversion preserves the general structure
    if (originalType === 'array' && !Array.isArray(converted)) return false;
    if (originalType === 'object' && (typeof converted !== 'object' || converted === null)) return false;
    if (originalType === 'string' && typeof converted !== 'string') return false;
    
    return true;
  } catch {
    return false;
  }
};

/**
 * Get a preview of how the content will look after conversion
 */
export const getContentPreview = (editedString: string, originalType: ContentType): string => {
  const converted = editableStringToContent(editedString, originalType);
  
  if (originalType === 'array') {
    return `Array with ${converted.length} items`;
  } else if (originalType === 'object') {
    const keys = Object.keys(converted);
    return `Object with ${keys.length} properties: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}`;
  }
  
  return `Text (${editedString.length} characters)`;
};

/**
 * Smart content conversion that preserves formatting when possible
 */
export const smartContentConversion = (originalContent: any, editedString: string): any => {
  const originalType = detectContentType(originalContent);
  
  // If the edited string looks like it should be a different type, respect user's intention
  if (originalType === 'string') {
    // Check if user is trying to create a list
    if (editedString.includes('\n') && editedString.split('\n').length > 1) {
      const lines = editedString.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length > 1) {
        return lines; // Convert to array
      }
    }
    
    // Check if user is trying to create an object
    if (editedString.trim().startsWith('{') && editedString.trim().endsWith('}')) {
      try {
        return JSON.parse(editedString);
      } catch {
        // If parsing fails, keep as string
        return editedString;
      }
    }
  }
  
  // Default to type-preserving conversion
  return editableStringToContent(editedString, originalType);
};

/**
 * Ensure content is always saved in a clean, readable format
 * This prevents JSON artifacts and ensures consistency
 */
export const ensureCleanContentFormat = (content: any): string => {
  console.log('🔍 DEBUG ensureCleanContentFormat - ENTRADA:', {
    content,
    type: typeof content,
    isUndefined: content === undefined,
    isNull: content === null
  });

  // 🛡️ PROTECTION: Handle undefined/null explicitly
  if (content === undefined || content === null) {
    console.warn('⚠️  ensureCleanContentFormat received undefined/null, returning empty string');
    return '';
  }

  if (typeof content === 'string') {
    const result = content.trim();
    // Extra protection: ensure we never return "undefined" as string
    return result === 'undefined' ? '' : result;
  }
  
  if (Array.isArray(content)) {
    // Convert arrays to clean bullet points
    const result = content
      .filter(item => item != null && String(item).trim().length > 0)
      .map(item => {
        const itemStr = String(item).trim();
        // Avoid "undefined" in array items
        return itemStr === 'undefined' ? '' : `• ${itemStr}`;
      })
      .filter(item => item.length > 2) // Remove empty bullet points
      .join('\n');
    
    return result;
  }
  
  if (typeof content === 'object') {
    // Convert objects to readable key-value format
    const result = Object.entries(content)
      .filter(([key, value]) => {
        const keyStr = String(key).trim();
        const valueStr = String(value).trim();
        // Filter out undefined/null values and "undefined" strings
        return value != null && 
               valueStr.length > 0 && 
               valueStr !== 'undefined' &&
               keyStr !== 'undefined';
      })
      .map(([key, value]) => `**${String(key).trim()}**: ${String(value).trim()}`)
      .join('\n\n');
    
    return result;
  }
  
  // Last resort: convert to string with protection
  const stringContent = String(content).trim();
  const result = stringContent === 'undefined' ? '' : stringContent;
  
  console.log('🔍 DEBUG ensureCleanContentFormat - SAÍDA:', {
    result,
    resultLength: result.length,
    containsUndefined: result.includes('undefined')
  });
  
  return result;
};