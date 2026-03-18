import { FlowStep as FlowStepType } from '@/types/agent';
import { FlowStep } from './FlowStep';
import { StepConnector } from './StepConnector';
import { Activity } from 'lucide-react';

interface AgentFlowPanelProps {
  steps: FlowStepType[];
  currentStepIndex: number;
}

export function AgentFlowPanel({ steps, currentStepIndex }: AgentFlowPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/20 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border/30 px-8 py-6 bg-gradient-to-r from-accent/5 to-transparent">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-primary/20 shadow-lg">
            <Activity className="h-7 w-7 text-accent" />
          </div>
          <div>
            <h2 className="font-bold text-2xl text-foreground">Agent Flow</h2>
            <p className="text-base text-muted-foreground">Processing pipeline status</p>
          </div>
        </div>
      </div>

      {/* Steps area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-8">
        {steps.length === 0 ? (
          <div className="flex min-h-full items-center justify-center animate-fade-in">
            <div className="text-center">
              <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-muted/50">
                <Activity className="h-12 w-12 text-muted-foreground/40" />
              </div>
              <p className="text-xl text-muted-foreground">
                Select a scenario to view flow
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-w-lg mx-auto">
            {steps.map((step, index) => (
              <div key={step.id}>
                <FlowStep
                  step={step}
                  isActive={index === currentStepIndex}
                  stepNumber={index + 1}
                />
                {index < steps.length - 1 && (
                  <StepConnector
                    isCompleted={step.status === 'completed'}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
