import { JsonOutput } from './JsonOutput';
import { OutcomeMonitoringOutput } from './OutcomeMonitoringOutput';
import { CustomerInputOutput } from './CustomerInputOutput';
import { FileJson, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface DecisionPanelProps {
  outputs: Record<string, Record<string, unknown>>;
}

const outputLabels: Record<string, { title: string; description: string; color: string }> = {
  input: {
    title: 'Customer Input',
    description: 'Issue captured and analyzed',
    color: 'primary',
  },
  classification: {
    title: 'Classification & Routing',
    description: 'Intent detected, agent selected',
    color: 'accent',
  },
  execution: {
    title: 'Task Execution',
    description: 'Domain agent response',
    color: 'success',
  },
  compliance: {
    title: 'Policy & Compliance',
    description: 'Decision: approved / blocked / escalate',
    color: 'warning',
  },
  escalation: {
    title: 'Human Escalation',
    description: 'Mandatory escalation handling',
    color: 'destructive',
  },
  monitoring: {
    title: 'Outcome Monitoring',
    description: 'Post-case analysis and insights',
    color: 'info',
  },
};

const allStepIds = ['input', 'classification', 'execution', 'compliance', 'escalation', 'monitoring'];

export function DecisionPanel({ outputs }: DecisionPanelProps) {
  const outputKeys = Object.keys(outputs);

  return (
    <div className="flex h-full min-h-0 flex-col bg-muted/10 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border/30 px-6 py-5 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <FileJson className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-xl text-foreground">Decision & Outcome</h2>
            <p className="text-sm text-muted-foreground">Structured agent outputs</p>
          </div>
          {outputKeys.length > 0 && (
            <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>{outputKeys.length} / {allStepIds.length} steps</span>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5">
        {outputKeys.length === 0 ? (
          <div className="flex min-h-full items-center justify-center">
            <div className="text-center py-12">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
                <Clock className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-lg text-muted-foreground font-medium">
                Waiting for agent activity
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Outputs will appear as each step completes
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {allStepIds.map((stepId, index) => {
              const output = outputs[stepId];
              const label = outputLabels[stepId];
              
              // Check if this step is awaiting clarification
              const isAwaitingClarification = output?.awaiting_clarification === true || 
                                               output?.status === 'awaiting_clarification' ||
                                               output?.waiting_for_customer === true;
              
              // Show waiting state for steps that are pending due to clarification
              if (!output) {
                // Check if step 1 (input) is awaiting clarification
                const inputOutput = outputs['input'];
                const step1AwaitingClarification = inputOutput?.awaiting_clarification === true ||
                                                    inputOutput?.status === 'awaiting_clarification';
                
                const waitingMessage = step1AwaitingClarification && index > 0
                  ? 'Waiting for customer clarification'
                  : label.description;
                
                return (
                  <div
                    key={stepId}
                    className="rounded-lg border border-border/30 bg-muted/20 p-4 opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 text-sm font-semibold text-muted-foreground">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">{label.title}</p>
                        <p className="text-xs text-muted-foreground/70">{waitingMessage}</p>
                      </div>
                      <div className="ml-auto">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          step1AwaitingClarification && index > 0
                            ? 'bg-amber-500/20 text-amber-600'
                            : 'bg-muted/50 text-muted-foreground'
                        }`}>
                          <Clock className="h-3 w-3" />
                          {step1AwaitingClarification && index > 0 ? 'Waiting' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
              
              // Show awaiting clarification state for step 1
              if (isAwaitingClarification) {
                return (
                  <div
                    key={stepId}
                    className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-sm font-semibold text-amber-600">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{label.title}</p>
                        <p className="text-xs text-muted-foreground">Awaiting customer clarification</p>
                      </div>
                      <div className="ml-auto">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-600">
                          <AlertCircle className="h-3 w-3" />
                          Needs Clarification
                        </span>
                      </div>
                    </div>
                    {output?.agentResponse && (
                      <div className="mt-3 rounded-md bg-amber-500/5 p-3 text-sm text-muted-foreground">
                        <p className="italic">"{String(output.agentResponse)}"</p>
                      </div>
                    )}
                  </div>
                );
              }
              
              // Special rendering for Customer Input step (plain English)
              if (stepId === 'input') {
                return (
                  <CustomerInputOutput
                    key={stepId}
                    data={output}
                    stepNumber={index + 1}
                  />
                );
              }
              
              // Special rendering for Outcome Monitoring step
              if (stepId === 'monitoring') {
                return (
                  <OutcomeMonitoringOutput
                    key={stepId}
                    data={output}
                    stepNumber={index + 1}
                  />
                );
              }
              
              return (
                <JsonOutput
                  key={stepId}
                  title={label.title}
                  description={label.description}
                  data={output}
                  colorScheme={label.color}
                  stepNumber={index + 1}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
