import { supabase } from '@/integrations/supabase/client';

export interface PolicyComplianceInput {
  domain?: string;
  category?: string;
  severity?: string;
  recommended_action?: string;
  escalation_recommended?: boolean;
  handled_by?: string;
  confidence?: number;
  domain_execution_output?: Record<string, unknown>;
}

// NEW STRICT OUTPUT FORMAT - matches enterprise compliance systems
export interface PolicyComplianceResponse {
  success?: boolean;
  action_reviewed?: string;
  decision?: 'approved' | 'blocked' | 'escalate';
  reason?: string;
  policy_reference?: string;
  escalation_required?: boolean;
  confidence?: 'high' | 'medium' | 'low';
}

export interface PolicyComplianceResult {
  success: boolean;
  data?: PolicyComplianceResponse;
  error?: string;
}

export async function processPolicyCompliance(
  input: PolicyComplianceInput
): Promise<PolicyComplianceResult> {
  try {
    console.log('[policyComplianceService] Sending to policy-compliance:', input);

    const { data, error } = await supabase.functions.invoke('policy-compliance', {
      body: {
        domain: input.domain,
        category: input.category,
        severity: input.severity,
        recommended_action: input.recommended_action,
        escalation_recommended: input.escalation_recommended,
        handled_by: input.handled_by,
        confidence: input.confidence,
        domain_execution_output: input.domain_execution_output,
      },
    });

    if (error) {
      console.error('[policyComplianceService] Edge function error:', error);
      return { success: false, error: error.message };
    }

    console.log('[policyComplianceService] Policy compliance response:', data);
    return { success: true, data: data as PolicyComplianceResponse };
  } catch (error) {
    console.error('[policyComplianceService] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
