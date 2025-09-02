import { marked } from 'marked';

/**
 * Simple markdown renderer for document content
 * Converts **text** to <strong>text</strong> and other basic markdown
 */
export function renderMarkdown(content: string): string {
  if (!content || typeof content !== 'string') return content;
  
  // Configure marked for inline rendering only (no paragraphs)
  marked.setOptions({
    breaks: true,
    gfm: true
  });
  
  try {
    // Parse inline markdown - removes <p> tags for inline rendering
    const html = marked.parseInline(content);
    return html;
  } catch (error) {
    console.warn('Error parsing markdown:', error);
    return content; // Return original on error
  }
}

/**
 * React component for rendering markdown content
 */
export function MarkdownContent({ content }: { content: string }) {
  const html = renderMarkdown(content);
  
  return (
    <span 
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Toggle bold formatting for selected text
 * Used by Ctrl+B shortcut
 * Returns both new text and updated selection positions
 */
export function toggleBoldFormatting(
  element: HTMLElement,
  selectionStart: number,
  selectionEnd: number
): { newText: string; newStart: number; newEnd: number } {
  const text = element.textContent || '';
  const selectedText = text.substring(selectionStart, selectionEnd);
  
  if (!selectedText) {
    return { newText: text, newStart: selectionStart, newEnd: selectionEnd };
  }
  
  const before = text.substring(0, selectionStart);
  const after = text.substring(selectionEnd);
  
  // Check if already bold (surrounded by **)
  const isBold = selectedText.startsWith('**') && selectedText.endsWith('**');
  
  let newText: string;
  let newStart: number;
  let newEnd: number;
  
  if (isBold) {
    // Remove bold
    const unformattedText = selectedText.slice(2, -2);
    newText = before + unformattedText + after;
    newStart = selectionStart;
    newEnd = selectionStart + unformattedText.length;
  } else {
    // Add bold
    const formattedText = `**${selectedText}**`;
    newText = before + formattedText + after;
    newStart = selectionStart;
    newEnd = selectionStart + formattedText.length;
  }
  
  return { newText, newStart, newEnd };
}