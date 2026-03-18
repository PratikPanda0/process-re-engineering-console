import { supabase } from '@/integrations/supabase/client';

export interface ComplaintsAgentInput {
  interaction_output: Record<string, unknown>;
  orchestrator_output: Record<string, unknown>;
}

export interface ComplaintsAgentResponse {
  response?: string;
  complaint_category?: string;
  severity?: string;
  recommended_action?: string;
  escalation_recommended?: boolean;
  [key: string]: unknown;
}

export interface ComplaintsAgentResult {
  success: boolean;
  data?: ComplaintsAgentResponse;
  error?: string;
}

export async function processComplaintsAgent(
  interactionOutput: Record<string, unknown>,
  orchestratorOutput: Record<string, unknown>
): Promise<ComplaintsAgentResult> {
  try {
    console.log('[complaintsAgentService] Sending to complaints agent:', {
      interaction_output: interactionOutput,
      orchestrator_output: orchestratorOutput,
    });

    const { data, error } = await supabase.functions.invoke('complaints-agent', {
      body: {
        interaction_output: interactionOutput,
        orchestrator_output: orchestratorOutput,
      },
    });

    if (error) {
      console.error('[complaintsAgentService] Edge function error:', error);
      return { success: false, error: error.message };
    }

    console.log('[complaintsAgentService] Complaints agent response:', data);
    return { success: true, data: data as ComplaintsAgentResponse };
  } catch (error) {
    console.error('[complaintsAgentService] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
