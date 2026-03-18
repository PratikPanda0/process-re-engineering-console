import { supabase } from '@/integrations/supabase/client';

export interface OrchestratorInput {
  interaction_output: Record<string, unknown>;
}

export interface OrchestratorResponse {
  response?: string;
  final_intent?: string;
  routed_agent?: string;
  escalate_to_human?: boolean;
  confidence?: number;
  [key: string]: unknown;
}

export interface OrchestratorResult {
  success: boolean;
  data?: OrchestratorResponse;
  error?: string;
}

export async function processOrchestratorAgent(
  interactionOutput: Record<string, unknown>
): Promise<OrchestratorResult> {
  try {
    console.log('[orchestratorAgentService] Sending to orchestrator:', interactionOutput);

    const { data, error } = await supabase.functions.invoke('orchestrator-agent', {
      body: { interaction_output: interactionOutput },
    });

    if (error) {
      console.error('[orchestratorAgentService] Edge function error:', error);
      return { success: false, error: error.message };
    }

    console.log('[orchestratorAgentService] Orchestrator response:', data);
    return { success: true, data: data as OrchestratorResponse };
  } catch (error) {
    console.error('[orchestratorAgentService] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
