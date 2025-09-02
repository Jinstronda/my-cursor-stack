import { useState, useEffect, useCallback, useRef } from 'react';

interface TextSelection {
  text: string;
  range: Range | null;
  rect: DOMRect | null;
}

interface UseTextSelectionReturn {
  selection: TextSelection | null;
  isVisible: boolean;
  toolbarPosition: { x: number; y: number };
  clearSelection: () => void;
}

/**
 * Hook para gerenciar seleção de texto e posicionamento da toolbar
 */
export const useTextSelection = (
  containerRef: React.RefObject<HTMLElement>
): UseTextSelectionReturn => {
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout>();

  const updateSelection = useCallback(() => {
    if (!containerRef.current) return;

    const windowSelection = window.getSelection();
    if (!windowSelection || windowSelection.rangeCount === 0) {
      setSelection(null);
      setIsVisible(false);
      return;
    }

    const range = windowSelection.getRangeAt(0);
    const selectedText = windowSelection.toString().trim();

    // Verificar se a seleção está dentro do container
    const container = containerRef.current;
    if (!container.contains(range.commonAncestorContainer)) {
      setSelection(null);
      setIsVisible(false);
      return;
    }

    // Só mostrar toolbar se há texto selecionado
    if (selectedText.length === 0) {
      setSelection(null);
      setIsVisible(false);
      return;
    }

    // Calcular posição da toolbar
    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    const position = {
      x: rect.left + (rect.width / 2) - 50, // Centralizar na seleção
      y: rect.top - 10 // Acima da seleção
    };

    setSelection({
      text: selectedText,
      range: range.cloneRange(),
      rect
    });

    setToolbarPosition(position);
    setIsVisible(true);

    // Clear timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Auto-hide após 5 segundos sem interação
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

  }, [containerRef]);

  const clearSelection = useCallback(() => {
    setSelection(null);
    setIsVisible(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  // Event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseUp = () => {
      // Pequeno delay para permitir que a seleção seja finalizada
      setTimeout(updateSelection, 50);
    };

    const handleMouseDown = () => {
      // Esconder toolbar ao começar nova seleção
      setIsVisible(false);
    };

    const handleKeyUp = () => {
      // Atualizar seleção após teclas (Shift+Arrow, etc)
      setTimeout(updateSelection, 50);
    };

    // Esconder toolbar quando clicar fora
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!container.contains(target)) {
        clearSelection();
      }
    };

    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousedown', handleClickOutside);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [containerRef, updateSelection, clearSelection]);

  return {
    selection,
    isVisible,
    toolbarPosition,
    clearSelection
  };
};