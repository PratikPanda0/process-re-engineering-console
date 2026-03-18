import { RotateCcw, Bot, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  onReset: () => void;
  isProcessing: boolean;
  hasMessages: boolean;
}

export function Header({ onReset, isProcessing, hasMessages }: HeaderProps) {
  return (
    <header className="relative z-20 flex-shrink-0 flex items-center justify-between border-b bg-card/80 backdrop-blur-xl px-8 py-5">
      {/* Gradient glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 pointer-events-none" />
      
      <div className="relative flex items-center gap-4">
        <div className="relative">
          <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary to-accent opacity-75 blur-sm" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
            <Bot className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">AI Servicing Console</h1>
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <p className="text-sm text-muted-foreground">Multi-Agent Customer Support</p>
        </div>
      </div>

      <div className="relative flex items-center gap-4">
        <Button
          variant="outline"
          onClick={onReset}
          disabled={!hasMessages || isProcessing}
          className="gap-2 bg-background/50 backdrop-blur-sm border-border/50 hover:bg-background/80 h-10 px-4"
        >
          <RotateCcw className="h-4 w-4" />
          <span className="font-medium">New Conversation</span>
        </Button>

        <div className="w-px h-6 bg-border/50" />

        <ThemeToggle />
      </div>
    </header>
  );
}
