import { supabase } from '@/integrations/supabase/client';

export interface HumanEscalationInput {
  policy_checked?: boolean;
  compliance_status?: string;
  risk_level?: string;
  requires_human_review?: boolean;
  escalation_allowed?: boolean;
  policy_decision?: string;
  policy_reasoning?: string;
  confidence?: string;
  domain_output?: Record<string, unknown>;
  orchestrator_output?: Record<string, unknown>;
}

export interface HumanEscalationResponse {
  success?: boolean;
  escalation_triggered?: boolean;
  escalation_reason?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical' | string;
  assigned_team?: string;
  case_summary?: string;
  recommended_action?: string;
  sla_hours?: number;
  confidence?: 'low' | 'medium' | 'high' | string;
}

export interface HumanEscalationResult {
  success: boolean;
  data?: HumanEscalationResponse;
  error?: string;
}

export async function processHumanEscalation(
  input: HumanEscalationInput
): Promise<HumanEscalationResult> {
  try {
    console.log('[humanEscalationService] Sending to human-escalation:', input);

    const { data, error } = await supabase.functions.invoke('human-escalation', {
      body: {
        policy_checked: input.policy_checked,
        compliance_status: input.compliance_status,
        risk_level: input.risk_level,
        requires_human_review: input.requires_human_review,
        escalation_allowed: input.escalation_allowed,
        policy_decision: input.policy_decision,
        policy_reasoning: input.policy_reasoning,
        confidence: input.confidence,
        domain_output: input.domain_output,
        orchestrator_output: input.orchestrator_output,
      },
    });

    if (error) {
      console.error('[humanEscalationService] Edge function error:', error);
      return { success: false, error: error.message };
    }

    console.log('[humanEscalationService] Human escalation response:', data);
    return { success: true, data: data as HumanEscalationResponse };
  } catch (error) {
    console.error('[humanEscalationService] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
