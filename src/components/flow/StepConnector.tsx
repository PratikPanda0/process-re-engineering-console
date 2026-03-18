import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface StepConnectorProps {
  isCompleted: boolean;
}

export function StepConnector({ isCompleted }: StepConnectorProps) {
  return (
    <div className="flex justify-center py-2">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-0.5 h-4 transition-colors duration-500',
            isCompleted ? 'bg-success' : 'bg-border'
          )}
        />
        <ChevronDown 
          className={cn(
            'h-5 w-5 -my-1 transition-colors duration-500',
            isCompleted ? 'text-success' : 'text-muted-foreground/50'
          )}
        />
        <div
          className={cn(
            'w-0.5 h-4 transition-colors duration-500',
            isCompleted ? 'bg-success' : 'bg-border'
          )}
        />
      </div>
    </div>
  );
}
