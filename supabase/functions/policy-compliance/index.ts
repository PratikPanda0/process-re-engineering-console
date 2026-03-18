import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PolicyComplianceInput {
  domain?: string;
  category?: string;
  severity?: string;
  recommended_action?: string;
  escalation_recommended?: boolean;
  handled_by?: string;
  confidence?: number;
  domain_execution_output?: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LYZR_API_KEY = Deno.env.get('LYZR_API_KEY');
    if (!LYZR_API_KEY) {
      console.error('[policy-compliance] LYZR_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'LYZR_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const input: PolicyComplianceInput = await req.json();
    console.log('[policy-compliance] Received input:', JSON.stringify(input, null, 2));

    // CRITICAL: Check for mandatory escalation conditions BEFORE calling agent
    const domain = (input.domain || '').toLowerCase();
    const severity = (input.severity || '').toLowerCase();
    const escalationRecommended = input.escalation_recommended === true;
    
    const isFraud = domain === 'fraud';
    const isHighSeverity = severity === 'high';
    const mustEscalate = isFraud || isHighSeverity || escalationRecommended;
    
    console.log('[policy-compliance] Escalation check:', {
      domain,
      severity,
      escalationRecommended,
      isFraud,
      isHighSeverity,
      mustEscalate,
    });

    // Construct structured message from domain execution output
    const structuredMessage = JSON.stringify({
      domain: input.domain || 'unknown',
      category: input.category || 'general',
      severity: input.severity || 'medium',
      recommended_action: input.recommended_action || 'review',
      escalation_recommended: input.escalation_recommended || false,
      handled_by: input.handled_by || 'DomainExecutionManager',
      confidence: input.confidence || 0.9,
      full_context: input.domain_execution_output || {},
    });

    console.log('[policy-compliance] Calling Lyzr Policy & Compliance Agent...');

    // Generate session ID for this request
    const sessionId = `696098fc5dbd567753c07e06-${Date.now()}`;

    const lyzrPayload = {
      user_id: "siddhi.rai@firstsource.com",
      agent_id: "696098fc5dbd567753c07e06",
      session_id: sessionId,
      message: structuredMessage,
    };

    console.log('[policy-compliance] Lyzr payload:', JSON.stringify(lyzrPayload, null, 2));

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
      console.error('[policy-compliance] Lyzr API error:', lyzrResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Lyzr API error: ${lyzrResponse.status}`, details: errorText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lyzrData = await lyzrResponse.json();
    console.log('[policy-compliance] Lyzr response:', JSON.stringify(lyzrData, null, 2));

    // Extract and parse response from Lyzr format
    const rawResponse = lyzrData.response || lyzrData.message || '';
    console.log('[policy-compliance] Raw agent response:', rawResponse);

    // NEW STRICT OUTPUT FORMAT
    let parsedOutput = {
      action_reviewed: input.recommended_action || 'review action',
      decision: 'approved' as 'approved' | 'blocked' | 'escalate',
      reason: 'Policy evaluation completed',
      policy_reference: 'Standard review policy',
      escalation_required: false,
      confidence: 'medium' as 'high' | 'medium' | 'low',
    };

    try {
      // The agent should return clean JSON, try to parse it
      if (typeof rawResponse === 'string') {
        // Try to extract JSON from the response
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          parsedOutput = {
            action_reviewed: parsed.action_reviewed || input.recommended_action || 'review action',
            decision: parsed.decision || 'approved',
            reason: parsed.reason || 'Policy evaluation completed',
            policy_reference: parsed.policy_reference || 'Standard review policy',
            escalation_required: parsed.escalation_required ?? false,
            confidence: parsed.confidence || 'medium',
          };
        }
      } else if (typeof rawResponse === 'object') {
        parsedOutput = {
          action_reviewed: rawResponse.action_reviewed || input.recommended_action || 'review action',
          decision: rawResponse.decision || 'approved',
          reason: rawResponse.reason || 'Policy evaluation completed',
          policy_reference: rawResponse.policy_reference || 'Standard review policy',
          escalation_required: rawResponse.escalation_required ?? false,
          confidence: rawResponse.confidence || 'medium',
        };
      }
    } catch (parseError) {
      console.error('[policy-compliance] Failed to parse agent response:', parseError);
    }

    // CRITICAL OVERRIDE: Force escalation for high-risk cases
    // This ensures deterministic escalation regardless of agent response
    if (mustEscalate) {
      console.log('[policy-compliance] CRITICAL OVERRIDE: Forcing escalation for high-risk case');
      parsedOutput.decision = 'escalate';
      parsedOutput.escalation_required = true;
      
      // Update reason to reflect the override
      if (isFraud) {
        parsedOutput.reason = `Mandatory escalation: Fraud domain detected. ${parsedOutput.reason}`;
        parsedOutput.policy_reference = 'FRAUD-POLICY-001: All fraud cases require human review';
      } else if (isHighSeverity) {
        parsedOutput.reason = `Mandatory escalation: High severity case. ${parsedOutput.reason}`;
        parsedOutput.policy_reference = 'ESCALATION-POLICY-001: High severity cases require human review';
      } else if (escalationRecommended) {
        parsedOutput.reason = `Mandatory escalation: Domain agent recommended escalation. ${parsedOutput.reason}`;
        parsedOutput.policy_reference = 'ESCALATION-POLICY-002: Agent-recommended escalations are honored';
      }
    }

    console.log('[policy-compliance] Final output:', parsedOutput);

    return new Response(
      JSON.stringify({
        success: true,
        ...parsedOutput,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[policy-compliance] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
