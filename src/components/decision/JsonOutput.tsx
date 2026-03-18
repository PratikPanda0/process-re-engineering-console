import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JsonOutputProps {
  title: string;
  description: string;
  data: Record<string, unknown>;
  colorScheme?: string;
  stepNumber?: number;
}

const colorMap: Record<string, { bg: string; border: string; accent: string; badge: string }> = {
  primary: { bg: 'bg-primary/5', border: 'border-primary/20', accent: 'text-primary', badge: 'bg-primary/10 text-primary' },
  accent: { bg: 'bg-accent/5', border: 'border-accent/20', accent: 'text-accent', badge: 'bg-accent/10 text-accent' },
  success: { bg: 'bg-green-500/5', border: 'border-green-500/20', accent: 'text-green-600', badge: 'bg-green-500/10 text-green-600' },
  warning: { bg: 'bg-amber-500/5', border: 'border-amber-500/20', accent: 'text-amber-600', badge: 'bg-amber-500/10 text-amber-600' },
  destructive: { bg: 'bg-red-500/5', border: 'border-red-500/20', accent: 'text-red-600', badge: 'bg-red-500/10 text-red-600' },
};

export function JsonOutput({ title, description, data, colorScheme = 'primary', stepNumber }: JsonOutputProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const colors = colorMap[colorScheme] || colorMap.primary;
  
  // Filter out rawResponse for cleaner display
  const displayData = Object.fromEntries(
    Object.entries(data).filter(([key]) => key !== 'rawResponse')
  );

  const formatValue = (value: unknown): React.ReactNode => {
    if (value === null) return <span className="text-muted-foreground italic">null</span>;
    if (typeof value === 'boolean') {
      return <span className={value ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>{value.toString()}</span>;
    }
    if (typeof value === 'number') return <span className="text-blue-600 font-medium">{value}</span>;
    if (typeof value === 'string') {
      if (value.length > 80) {
        return <span className="text-foreground">"{value.slice(0, 80)}..."</span>;
      }
      return <span className="text-foreground">"{value}"</span>;
    }
    if (Array.isArray(value)) {
      return (
        <span className="text-muted-foreground">
          [{value.map((v, i) => (
            <span key={i}>
              {formatValue(v)}
              {i < value.length - 1 && ', '}
            </span>
          ))}]
        </span>
      );
    }
    return <span className="text-muted-foreground">{JSON.stringify(value)}</span>;
  };

  return (
    <div className={cn('rounded-xl border overflow-hidden transition-all duration-200', colors.border, colors.bg)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        {stepNumber && (
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold', colors.badge)}>
            {stepNumber}
          </div>
        )}
        <div className="flex-1 text-left">
          <p className="font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', colors.badge)}>
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </span>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-border/20 px-4 py-3 bg-background/50">
          <div className="space-y-1.5 font-mono text-sm">
            {Object.entries(displayData).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className={cn('font-medium shrink-0', colors.accent)}>{key}:</span>
                <span className="break-all">{formatValue(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
