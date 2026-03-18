import { useState } from 'react';
import { ChevronDown, ChevronRight, BarChart3, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OutcomeMonitoringOutputProps {
  data: Record<string, unknown>;
  stepNumber?: number;
}

export function OutcomeMonitoringOutput({ data, stepNumber }: OutcomeMonitoringOutputProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<'leadership' | 'technical'>('leadership');

  // Extract fields
  const caseOutcome = (data.case_outcome as string) || 'pending';
  const automationEffectiveness = (data.automation_effectiveness as string) || 'medium';
  const slaMet = (data.sla_met as boolean) ?? true;
  const policyAlignment = (data.policy_alignment as boolean) ?? true;
  const insights = (data.insights as string[]) || [];
  const recommendations = (data.recommendations as string[]) || [];
  const auditTrail = (data.audit_trail as { steps_completed: number; total_processing_time: string; agents_invoked: string[] }) || null;
  const narrativeSummary = (data.narrative_summary as string) || '';

  const getOutcomeColor = () => {
    if (caseOutcome === 'escalated') return 'text-amber-600';
    if (caseOutcome === 'auto_resolved') return 'text-green-600';
    return 'text-muted-foreground';
  };

  const getEffectivenessColor = () => {
    if (automationEffectiveness === 'high') return 'text-green-600';
    if (automationEffectiveness === 'medium') return 'text-amber-600';
    return 'text-red-500';
  };

  return (
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 overflow-hidden transition-all duration-200">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        {stepNumber && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 text-sm font-bold">
            {stepNumber}
          </div>
        )}
        <div className="flex-1 text-left">
          <p className="font-semibold text-foreground">Outcome Monitoring</p>
          <p className="text-xs text-muted-foreground">Post-case analysis and insights</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 text-blue-600 px-2.5 py-1 text-xs font-medium">
            <BarChart3 className="h-3 w-3" />
            Analytics
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
        <div className="border-t border-border/20 bg-background/50">
          {/* View Toggle */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border/20 bg-muted/20">
            <span className="text-xs text-muted-foreground mr-2">View:</span>
            <button
              onClick={() => setViewMode('leadership')}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                viewMode === 'leadership' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              Leadership
            </button>
            <button
              onClick={() => setViewMode('technical')}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                viewMode === 'technical' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              Technical / Audit
            </button>
          </div>

          {viewMode === 'leadership' ? (
            /* Leadership View - Plain English */
            <div className="p-4 space-y-4">
              {/* Narrative Summary */}
              {narrativeSummary && (
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <p className="text-sm text-foreground leading-relaxed">{narrativeSummary}</p>
                </div>
              )}

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/20 border border-border/20">
                  <p className="text-xs text-muted-foreground mb-1">Case Outcome</p>
                  <p className={cn('text-sm font-semibold capitalize', getOutcomeColor())}>
                    {caseOutcome.replace('_', ' ')}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border/20">
                  <p className="text-xs text-muted-foreground mb-1">Automation Effectiveness</p>
                  <p className={cn('text-sm font-semibold capitalize', getEffectivenessColor())}>
                    {automationEffectiveness}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border/20">
                  <p className="text-xs text-muted-foreground mb-1">SLA Status</p>
                  <div className="flex items-center gap-1.5">
                    {slaMet ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-600">Met</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-semibold text-red-500">Missed</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border/20">
                  <p className="text-xs text-muted-foreground mb-1">Policy Alignment</p>
                  <div className="flex items-center gap-1.5">
                    {policyAlignment ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-600">Aligned</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-semibold text-amber-600">Review Needed</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Insights */}
              {insights.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" />
                    Key Insights
                  </p>
                  <ul className="space-y-1.5">
                    {insights.map((insight, i) => (
                      <li key={i} className="text-sm text-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {recommendations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Recommendations</p>
                  <ul className="space-y-1.5">
                    {recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-foreground flex items-start gap-2">
                        <span className="text-accent mt-1">→</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            /* Technical / Audit View - Structured JSON */
            <div className="p-4 space-y-3">
              {/* Audit Trail */}
              {auditTrail && (
                <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Audit Trail</p>
                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="flex gap-2">
                      <span className="text-blue-600">steps_completed:</span>
                      <span>{auditTrail.steps_completed}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-blue-600">processing_time:</span>
                      <span>{auditTrail.total_processing_time}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-blue-600">agents_invoked:</span>
                      <div className="pl-3 flex flex-wrap gap-1">
                        {auditTrail.agents_invoked.map((agent, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-muted rounded text-xs">
                            {agent}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Raw JSON */}
              <div className="space-y-1.5 font-mono text-sm">
                {Object.entries(data)
                  .filter(([key]) => !['rawResponse', 'audit_trail'].includes(key))
                  .map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="text-blue-600 shrink-0">{key}:</span>
                      <span className="break-all text-foreground">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
