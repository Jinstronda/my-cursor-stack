import { Bot, FileText, Loader2 } from "lucide-react";

interface ToolStatusModalProps {
  isVisible: boolean;
  status: string;
  type: 'document' | 'analysis' | 'general';
}

export default function ToolStatusModal({ isVisible, status, type }: ToolStatusModalProps) {
  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'document':
        return <FileText className="w-3 h-3" />;
      case 'analysis':
        return <Bot className="w-3 h-3" />;
      default:
        return <Bot className="w-3 h-3" />;
    }
  };

  return (
    <div className="flex items-start space-x-3 mb-4 animate-in">
      <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4" />
      </div>
      
      <div className="bg-secondary/70 border border-border/50 rounded-lg p-3 max-w-lg">
        <div className="flex items-center space-x-2">
          {getIcon()}
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-sm text-muted-foreground">{status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}