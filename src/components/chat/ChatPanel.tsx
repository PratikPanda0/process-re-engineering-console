import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatMessage } from '@/types/agent';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isProcessing: boolean;
}

export function ChatPanel({
  messages,
  onSendMessage,
  isProcessing,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border/30 px-8 py-6 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 shadow-lg">
            <MessageCircle className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-2xl text-foreground">Customer Interaction</h2>
            <p className="text-base text-muted-foreground">AI-powered customer service console</p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="flex min-h-full flex-col items-center justify-center gap-6 text-center animate-fade-in">
            <div className="relative max-w-lg">
              <div className="absolute -inset-6 rounded-3xl bg-gradient-to-r from-primary/10 to-accent/10 blur-2xl -z-10" />
              <div className="relative rounded-3xl bg-card/80 backdrop-blur-sm border border-border/50 p-12 shadow-xl">
                <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 shadow-lg">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <p className="mb-3 font-bold text-3xl text-foreground">How can we help?</p>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  Describe your issue or question below. Our AI agents will analyze, route, and resolve your request.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6 max-w-3xl mx-auto">
          {messages.map((message, index) => (
            <MessageBubble 
              key={message.id} 
              message={message} 
              style={{ animationDelay: `${index * 50}ms` }}
            />
          ))}
          {isProcessing && <TypingIndicator />}
        </div>
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="flex-shrink-0 border-t border-border/30 p-6 bg-card/50 backdrop-blur-sm">
        <div className="flex gap-4 max-w-3xl mx-auto">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your issue or question..."
            disabled={isProcessing}
            className="flex-1 h-14 text-lg bg-background border-border/50 focus:border-primary/50 transition-colors px-5 rounded-xl"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isProcessing}
            className="h-14 w-14 rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-lg"
          >
            <Send className="h-6 w-6" />
          </Button>
        </div>
      </form>
    </div>
  );
}
