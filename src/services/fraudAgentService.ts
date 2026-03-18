import { supabase } from '@/integrations/supabase/client';

export interface FraudAgentInput {
  interaction_output: Record<string, unknown>;
  orchestrator_output: Record<string, unknown>;
}

export interface FraudAgentResponse {
  response?: string;
  fraud_type?: string;
  risk_level?: string;
  recommended_action?: string;
  investigation_required?: boolean;
  [key: string]: unknown;
}

export interface FraudAgentResult {
  success: boolean;
  data?: FraudAgentResponse;
  error?: string;
}

export async function processFraudAgent(
  interactionOutput: Record<string, unknown>,
  orchestratorOutput: Record<string, unknown>
): Promise<FraudAgentResult> {
  try {
    console.log('[fraudAgentService] Sending to fraud agent:', {
      interaction_output: interactionOutput,
      orchestrator_output: orchestratorOutput,
    });

    const { data, error } = await supabase.functions.invoke('fraud-agent', {
      body: {
        interaction_output: interactionOutput,
        orchestrator_output: orchestratorOutput,
      },
    });

    if (error) {
      console.error('[fraudAgentService] Edge function error:', error);
      return { success: false, error: error.message };
    }

    console.log('[fraudAgentService] Fraud agent response:', data);
    return { success: true, data: data as FraudAgentResponse };
  } catch (error) {
    console.error('[fraudAgentService] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
