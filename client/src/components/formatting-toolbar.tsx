import React, { useState, useEffect, useRef } from 'react';
import { Type, List } from 'lucide-react';

interface FormattingToolbarProps {
  isVisible: boolean;
  position: { x: number; y: number };
  onFormatSubtitle: () => void;
  onFormatList: () => void;
}

const FormattingToolbar: React.FC<FormattingToolbarProps> = ({
  isVisible,
  position,
  onFormatSubtitle,
  onFormatList
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null);

  if (!isVisible) return null;

  return (
    <div
      ref={toolbarRef}
      className="
        fixed z-50 bg-background border border-border rounded-lg shadow-lg p-1
        flex items-center space-x-1 animate-in fade-in-0 zoom-in-95 duration-200
      "
      style={{
        left: `${position.x}px`,
        top: `${position.y - 50}px`, // Aparece acima da seleção
      }}
    >
      {/* Botão Subtítulo */}
      <button
        onClick={onFormatSubtitle}
        className="
          p-2 hover:bg-muted rounded-md transition-colors duration-150
          flex items-center justify-center
          focus:outline-none focus:ring-1 focus:ring-accent
        "
        title="Transformar em Subtítulo"
        aria-label="Transformar em Subtítulo"
      >
        <Type className="w-4 h-4" />
      </button>

      {/* Botão Lista */}
      <button
        onClick={onFormatList}
        className="
          p-2 hover:bg-muted rounded-md transition-colors duration-150
          flex items-center justify-center
          focus:outline-none focus:ring-1 focus:ring-accent
        "
        title="Transformar em Lista"
        aria-label="Transformar em Lista"
      >
        <List className="w-4 h-4" />
      </button>

      {/* Separador visual para futuros botões */}
      <div className="w-px h-4 bg-border opacity-50" />
      
      {/* Placeholder para futuros botões */}
      <div className="text-xs text-muted-foreground px-1">
        {/* Futuros botões aqui */}
      </div>
    </div>
  );
};

export default FormattingToolbar;