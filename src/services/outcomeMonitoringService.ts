import { supabase } from '@/integrations/supabase/client';

export interface OutcomeMonitoringInput {
  domain?: string;
  severity?: string;
  actions_taken?: string[];
  policy_decision?: string;
  escalation_result?: {
    triggered: boolean;
    reason?: string;
    priority?: string;
    assigned_team?: string;
  };
  confidence_levels?: Record<string, unknown>;
  case_summary?: string;
  full_context?: {
    interaction?: Record<string, unknown>;
    classification?: Record<string, unknown>;
    execution?: Record<string, unknown>;
    compliance?: Record<string, unknown>;
    escalation?: Record<string, unknown>;
  };
}

export interface OutcomeMonitoringResponse {
  success?: boolean;
  case_outcome?: 'auto_resolved' | 'escalated' | 'pending';
  automation_effectiveness?: 'high' | 'medium' | 'low';
  sla_met?: boolean;
  policy_alignment?: boolean;
  insights?: string[];
  recommendations?: string[];
  audit_trail?: {
    steps_completed: number;
    total_processing_time: string;
    agents_invoked: string[];
  };
  narrative_summary?: string;
}

export interface OutcomeMonitoringResult {
  success: boolean;
  data?: OutcomeMonitoringResponse;
  error?: string;
}

export async function processOutcomeMonitoring(
  input: OutcomeMonitoringInput
): Promise<OutcomeMonitoringResult> {
  try {
    console.log('[outcomeMonitoringService] Sending to outcome-monitoring:', input);

    const { data, error } = await supabase.functions.invoke('outcome-monitoring', {
      body: {
        domain: input.domain,
        severity: input.severity,
        actions_taken: input.actions_taken,
        policy_decision: input.policy_decision,
        escalation_result: input.escalation_result,
        confidence_levels: input.confidence_levels,
        case_summary: input.case_summary,
        full_context: input.full_context,
      },
    });

    if (error) {
      console.error('[outcomeMonitoringService] Edge function error:', error);
      return { success: false, error: error.message };
    }

    console.log('[outcomeMonitoringService] Outcome monitoring response:', data);
    return { success: true, data: data as OutcomeMonitoringResponse };
  } catch (error) {
    console.error('[outcomeMonitoringService] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
