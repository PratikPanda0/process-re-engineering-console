import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface OutcomeMonitoringInput {
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LYZR_API_KEY = Deno.env.get('LYZR_API_KEY');
    if (!LYZR_API_KEY) {
      console.error('[outcome-monitoring] LYZR_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'LYZR_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const input: OutcomeMonitoringInput = await req.json();
    console.log('[outcome-monitoring] Received input:', JSON.stringify(input, null, 2));

    // Construct consolidated case summary for the agent
    const consolidatedSummary = JSON.stringify({
      domain: input.domain || 'unknown',
      severity: input.severity || 'medium',
      actions_taken: input.actions_taken || [],
      policy_decision: input.policy_decision || 'none',
      escalation_result: input.escalation_result || { triggered: false },
      confidence_levels: input.confidence_levels || {},
      case_summary: input.case_summary || '',
      full_context: input.full_context || {},
      timestamp: new Date().toISOString(),
    });

    console.log('[outcome-monitoring] Calling Lyzr Outcome Monitoring Agent...');

    // Generate session ID for this request
    const sessionId = `697afc80bc6eb6293f5505d5-${Date.now()}`;

    const lyzrPayload = {
      user_id: "siddhi.rai@firstsource.com",
      agent_id: "697afc80bc6eb6293f5505d5",
      session_id: sessionId,
      message: consolidatedSummary,
    };

    console.log('[outcome-monitoring] Lyzr payload:', JSON.stringify(lyzrPayload, null, 2));

    const lyzrResponse = await fetch('https://agent-prod.studio.lyzr.ai/v3/inference/chat/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': LYZR_API_KEY,
      },
      body: JSON.stringify(lyzrPayload),
    });

    if (!lyzrResponse.ok) {
      const errorText = await lyzrResponse.text();
      console.error('[outcome-monitoring] Lyzr API error:', lyzrResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Lyzr API error: ${lyzrResponse.status}`, details: errorText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lyzrData = await lyzrResponse.json();
    console.log('[outcome-monitoring] Lyzr response:', JSON.stringify(lyzrData, null, 2));

    // Extract and parse response from Lyzr format
    const rawResponse = lyzrData.response || lyzrData.message || '';
    console.log('[outcome-monitoring] Raw agent response:', rawResponse);

    // Default output structure for Outcome Monitoring
    let parsedOutput = {
      case_outcome: input.escalation_result?.triggered ? 'escalated' : 'auto_resolved',
      automation_effectiveness: 'medium' as 'high' | 'medium' | 'low',
      sla_met: true,
      policy_alignment: true,
      insights: [] as string[],
      recommendations: [] as string[],
      audit_trail: {
        steps_completed: 0,
        total_processing_time: 'N/A',
        agents_invoked: [] as string[],
      },
      narrative_summary: '',
    };

    try {
      // The agent should return structured JSON, try to parse it
      if (typeof rawResponse === 'string') {
        // Try to extract JSON from the response
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          parsedOutput = {
            case_outcome: parsed.case_outcome || parsedOutput.case_outcome,
            automation_effectiveness: parsed.automation_effectiveness || parsed.automation_score || parsedOutput.automation_effectiveness,
            sla_met: parsed.sla_met !== undefined ? parsed.sla_met : (parsed.sla_status === 'met' || parsedOutput.sla_met),
            policy_alignment: parsed.policy_alignment !== undefined ? parsed.policy_alignment : (parsed.policy_compliant ?? parsedOutput.policy_alignment),
            insights: Array.isArray(parsed.insights) ? parsed.insights : 
                      (parsed.key_insights ? [parsed.key_insights] : parsedOutput.insights),
            recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations :
                             (parsed.recommendation ? [parsed.recommendation] : parsedOutput.recommendations),
            audit_trail: parsed.audit_trail || parsedOutput.audit_trail,
            narrative_summary: parsed.narrative_summary || parsed.summary || rawResponse,
          };
        } else {
          // If no JSON found, use the raw response as narrative
          parsedOutput.narrative_summary = rawResponse;
        }
      } else if (typeof rawResponse === 'object') {
        parsedOutput = {
          case_outcome: rawResponse.case_outcome || parsedOutput.case_outcome,
          automation_effectiveness: rawResponse.automation_effectiveness || parsedOutput.automation_effectiveness,
          sla_met: rawResponse.sla_met ?? parsedOutput.sla_met,
          policy_alignment: rawResponse.policy_alignment ?? parsedOutput.policy_alignment,
          insights: rawResponse.insights || parsedOutput.insights,
          recommendations: rawResponse.recommendations || parsedOutput.recommendations,
          audit_trail: rawResponse.audit_trail || parsedOutput.audit_trail,
          narrative_summary: rawResponse.narrative_summary || '',
        };
      }
    } catch (parseError) {
      console.error('[outcome-monitoring] Failed to parse agent response:', parseError);
      parsedOutput.narrative_summary = typeof rawResponse === 'string' ? rawResponse : 'Analysis completed';
    }

    // Build audit trail from context
    const agentsInvoked: string[] = [];
    let stepsCompleted = 0;
    
    if (input.full_context?.interaction) { agentsInvoked.push('CustomerInteractionAgent'); stepsCompleted++; }
    if (input.full_context?.classification) { agentsInvoked.push('OrchestratorAgent'); stepsCompleted++; }
    if (input.full_context?.execution) { agentsInvoked.push('DomainExecutionManager'); stepsCompleted++; }
    if (input.full_context?.compliance) { agentsInvoked.push('PolicyComplianceAgent'); stepsCompleted++; }
    if (input.full_context?.escalation) { agentsInvoked.push('HumanEscalationAgent'); stepsCompleted++; }
    agentsInvoked.push('OutcomeMonitoringAgent');
    stepsCompleted++;

    parsedOutput.audit_trail = {
      steps_completed: stepsCompleted,
      total_processing_time: 'Real-time',
      agents_invoked: agentsInvoked,
    };

    // Ensure case_outcome is accurate based on escalation
    if (input.escalation_result?.triggered) {
      parsedOutput.case_outcome = 'escalated';
    }

    console.log('[outcome-monitoring] Final output:', parsedOutput);

    return new Response(
      JSON.stringify({
        success: true,
        ...parsedOutput,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[outcome-monitoring] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
