import { Bot } from "lucide-react";

interface StatusMessageProps {
  status?: string;
  isCompleted?: boolean;
  type?: 'thinking' | 'generating' | 'analyzing';
}

export default function StatusMessage({ status, isCompleted = false, type = 'thinking' }: StatusMessageProps) {
  
  if (isCompleted) {
    return null; // Don't show anything when completed
  }

  return (
    <div className="flex items-start space-x-4 mb-4 animate-in">
      <div className="w-6 h-6 bg-foreground rounded-full flex items-center justify-center flex-shrink-0">
        <Bot className="w-3 h-3 text-background" />
      </div>
      <div className="flex-1">
        <div className="bg-muted/30 rounded-lg px-4 py-3">
          <div className="flex items-center space-x-3">
            {/* 3-dot typing animation with enhanced visibility */}
            <div className="flex space-x-1.5">
              <div className="w-2 h-2 bg-foreground rounded-full typing-dot-1"></div>
              <div className="w-2 h-2 bg-foreground rounded-full typing-dot-2"></div>
              <div className="w-2 h-2 bg-foreground rounded-full typing-dot-3"></div>
            </div>
            {status && (
              <span className="text-xs text-foreground/70">
                {status}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}