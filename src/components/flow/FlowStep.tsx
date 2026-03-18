import {
  MessageSquare,
  GitBranch,
  Cog,
  Shield,
  UserCheck,
  Check,
  Loader2,
} from 'lucide-react';
import { FlowStep as FlowStepType } from '@/types/agent';
import { cn } from '@/lib/utils';

interface FlowStepProps {
  step: FlowStepType;
  isActive: boolean;
  stepNumber: number;
}

const stepIcons: Record<string, React.ElementType> = {
  input: MessageSquare,
  classification: GitBranch,
  execution: Cog,
  compliance: Shield,
  escalation: UserCheck,
};

export function FlowStep({ step, isActive, stepNumber }: FlowStepProps) {
  const Icon = stepIcons[step.id] || MessageSquare;

  const getStatusStyles = () => {
    switch (step.status) {
      case 'completed':
        return {
          card: 'bg-success/10 border-success/30 shadow-success/10',
          icon: 'bg-success text-success-foreground',
          badge: 'bg-success text-success-foreground',
          text: 'text-foreground',
        };
      case 'processing':
        return {
          card: 'bg-primary/10 border-primary/40 shadow-primary/15 ring-2 ring-primary/30',
          icon: 'bg-primary text-primary-foreground',
          badge: 'bg-primary text-primary-foreground',
          text: 'text-foreground',
        };
      default:
        return {
          card: 'bg-card border-border/50',
          icon: 'bg-muted text-muted-foreground',
          badge: 'bg-muted text-muted-foreground',
          text: 'text-muted-foreground',
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <div
      className={cn(
        'relative rounded-2xl border p-5 transition-all duration-300 shadow-sm',
        styles.card,
        isActive && 'shadow-lg'
      )}
    >
      <div className="flex items-center gap-4">
        {/* Step number + Icon */}
        <div className="relative">
          <div
            className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl transition-all duration-300 shadow-md',
              styles.icon
            )}
          >
            {step.status === 'processing' ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : step.status === 'completed' ? (
              <Check className="h-7 w-7" strokeWidth={3} />
            ) : (
              <Icon className="h-7 w-7" />
            )}
          </div>
          <div className="absolute -top-2 -left-2 flex h-7 w-7 items-center justify-center rounded-full bg-background border-2 border-border text-xs font-bold text-foreground shadow-sm">
            {stepNumber}
          </div>
        </div>

        {/* Title + Description */}
        <div className="flex-1 min-w-0">
          <h3 className={cn('font-semibold text-lg leading-tight', styles.text)}>
            {step.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">
            {step.description}
          </p>
        </div>

        {/* Status badge */}
        <div
          className={cn(
            'shrink-0 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-sm',
            styles.badge
          )}
        >
          {step.status === 'processing' ? (
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              Running
            </span>
          ) : step.status === 'completed' ? (
            'Done'
          ) : (
            'Pending'
          )}
        </div>
      </div>
    </div>
  );
}
