import { Bot } from 'lucide-react';

export function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted border border-border/50 shadow-sm">
        <Bot className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-md bg-card border border-border/50 px-5 py-4 shadow-sm">
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/60" />
      </div>
    </div>
  );
}
