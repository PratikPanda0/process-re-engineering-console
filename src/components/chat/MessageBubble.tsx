import { User, Bot } from 'lucide-react';
import { ChatMessage } from '@/types/agent';
import { cn } from '@/lib/utils';
import { CSSProperties } from 'react';

interface MessageBubbleProps {
  message: ChatMessage;
  style?: CSSProperties;
}

export function MessageBubble({ message, style }: MessageBubbleProps) {
  const isCustomer = message.sender === 'customer';

  return (
    <div
      className={cn(
        'flex gap-4 animate-fade-in',
        isCustomer ? 'flex-row-reverse' : 'flex-row'
      )}
      style={style}
    >
      <div
        className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-md',
          isCustomer
            ? 'bg-gradient-to-br from-primary to-accent'
            : 'bg-gradient-to-br from-muted to-muted/80 border border-border/50'
        )}
      >
        {isCustomer ? (
          <User className="h-6 w-6 text-primary-foreground" />
        ) : (
          <Bot className="h-6 w-6 text-foreground" />
        )}
      </div>

      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-6 py-4 shadow-md',
          isCustomer
            ? 'bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-tr-sm'
            : 'bg-card border border-border/50 text-foreground rounded-tl-sm'
        )}
      >
        {/* Sender label for AI Assistant */}
        {!isCustomer && (
          <p className="text-xs font-medium text-primary mb-1.5">AI Assistant</p>
        )}
        <p className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
        <p
          className={cn(
            'mt-2 text-sm',
            isCustomer ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}
