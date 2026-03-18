import { supabase } from '@/integrations/supabase/client';

export interface DomainExecutionInput {
  final_intent: string;
  routed_agent: string;
  issue_summary?: string;
  confidence?: number;
  interaction_output?: Record<string, unknown>;
  orchestrator_output?: Record<string, unknown>;
}

export interface DomainExecutionResponse {
  response?: string;
  domain?: string;
  category?: string;
  severity?: string;
  recommended_action?: string;
  escalation_recommended?: boolean;
  handled_by?: string;
  confidence?: number;
  [key: string]: unknown;
}

export interface DomainExecutionResult {
  success: boolean;
  data?: DomainExecutionResponse;
  error?: string;
}

export async function processDomainExecution(
  input: DomainExecutionInput
): Promise<DomainExecutionResult> {
  try {
    console.log('[domainExecutionService] Sending to domain-execution:', input);

    const { data, error } = await supabase.functions.invoke('domain-execution', {
      body: {
        final_intent: input.final_intent,
        routed_agent: input.routed_agent,
        issue_summary: input.issue_summary,
        confidence: input.confidence,
        interaction_output: input.interaction_output,
        orchestrator_output: input.orchestrator_output,
      },
    });

    if (error) {
      console.error('[domainExecutionService] Edge function error:', error);
      return { success: false, error: error.message };
    }

    console.log('[domainExecutionService] Domain execution response:', data);
    return { success: true, data: data as DomainExecutionResponse };
  } catch (error) {
    console.error('[domainExecutionService] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
