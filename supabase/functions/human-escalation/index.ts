import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface HumanEscalationInput {
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LYZR_API_KEY = Deno.env.get('LYZR_API_KEY');
    if (!LYZR_API_KEY) {
      console.error('[human-escalation] LYZR_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'LYZR_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const input: HumanEscalationInput = await req.json();
    console.log('[human-escalation] Received input:', JSON.stringify(input, null, 2));

    // Construct structured message from policy compliance and domain outputs
    const structuredMessage = JSON.stringify({
      policy_checked: input.policy_checked ?? true,
      compliance_status: input.compliance_status || 'unknown',
      risk_level: input.risk_level || 'medium',
      requires_human_review: input.requires_human_review ?? false,
      escalation_allowed: input.escalation_allowed ?? false,
      policy_decision: input.policy_decision || '',
      policy_reasoning: input.policy_reasoning || '',
      confidence: input.confidence || 'medium',
      domain_context: input.domain_output || {},
      orchestrator_context: input.orchestrator_output || {},
    });

    console.log('[human-escalation] Calling Lyzr Human Escalation Agent...');

    // Generate session ID for this request
    const sessionId = `69721967d6d0dcaec111b464-${Date.now()}`;

    const lyzrPayload = {
      user_id: "manju.subramani@firstsource.com",
      agent_id: "69721967d6d0dcaec111b464",
      session_id: sessionId,
      message: structuredMessage,
    };

    console.log('[human-escalation] Lyzr payload:', JSON.stringify(lyzrPayload, null, 2));

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
      console.error('[human-escalation] Lyzr API error:', lyzrResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Lyzr API error: ${lyzrResponse.status}`, details: errorText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lyzrData = await lyzrResponse.json();
    console.log('[human-escalation] Lyzr response:', JSON.stringify(lyzrData, null, 2));

    // Extract and parse response from Lyzr format
    const rawResponse = lyzrData.response || lyzrData.message || '';
    console.log('[human-escalation] Raw agent response:', rawResponse);

    // Default escalation output structure
    let parsedOutput = {
      escalation_triggered: false,
      escalation_reason: 'No escalation required',
      priority: 'normal',
      assigned_team: 'general_support',
      case_summary: '',
      recommended_action: '',
      sla_hours: 24,
      confidence: 'medium',
    };

    try {
      // The agent should return clean JSON, try to parse it
      if (typeof rawResponse === 'string') {
        // Try to extract JSON from the response
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          parsedOutput = {
            escalation_triggered: parsed.escalation_triggered ?? parsed.escalate ?? false,
            escalation_reason: parsed.escalation_reason || parsed.reason || 'Reviewed by escalation agent',
            priority: parsed.priority || 'normal',
            assigned_team: parsed.assigned_team || parsed.team || 'general_support',
            case_summary: parsed.case_summary || parsed.summary || '',
            recommended_action: parsed.recommended_action || parsed.action || '',
            sla_hours: parsed.sla_hours || parsed.sla || 24,
            confidence: parsed.confidence || 'medium',
          };
        }
      } else if (typeof rawResponse === 'object') {
        parsedOutput = {
          escalation_triggered: rawResponse.escalation_triggered ?? rawResponse.escalate ?? false,
          escalation_reason: rawResponse.escalation_reason || rawResponse.reason || 'Reviewed by escalation agent',
          priority: rawResponse.priority || 'normal',
          assigned_team: rawResponse.assigned_team || rawResponse.team || 'general_support',
          case_summary: rawResponse.case_summary || rawResponse.summary || '',
          recommended_action: rawResponse.recommended_action || rawResponse.action || '',
          sla_hours: rawResponse.sla_hours || rawResponse.sla || 24,
          confidence: rawResponse.confidence || 'medium',
        };
      }
    } catch (parseError) {
      console.error('[human-escalation] Failed to parse agent response:', parseError);
    }

    console.log('[human-escalation] Parsed output:', parsedOutput);

    return new Response(
      JSON.stringify({
        success: true,
        ...parsedOutput,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[human-escalation] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
