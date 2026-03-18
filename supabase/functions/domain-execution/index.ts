import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LYZR_API_URL = 'https://agent-prod.studio.lyzr.ai/v3/inference/chat/';
const DOMAIN_EXECUTION_MANAGER_AGENT_ID = '69633b5dd09b552363348ce4';
const USER_ID = 'siddhi.rai@firstsource.com';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { final_intent, routed_agent, issue_summary, confidence, interaction_output, orchestrator_output } = await req.json();
    
    if (!final_intent || !routed_agent) {
      console.error('[domain-execution] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'final_intent and routed_agent are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('LYZR_API_KEY');
    if (!apiKey) {
      console.error('[domain-execution] LYZR_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique session ID for this execution
    const sessionId = `domain-exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Construct structured message for DomainExecutionManager
    const structuredInput = {
      final_intent,
      routed_agent,
      issue_summary: issue_summary || '',
      confidence: confidence || 0.9,
      interaction_context: interaction_output || {},
      classification_context: orchestrator_output || {},
      timestamp: new Date().toISOString(),
    };

    const messagePayload = JSON.stringify(structuredInput);

    console.log('[domain-execution] Calling DomainExecutionManager with:', structuredInput);

    const lyzrResponse = await fetch(LYZR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        user_id: USER_ID,
        agent_id: DOMAIN_EXECUTION_MANAGER_AGENT_ID,
        session_id: sessionId,
        message: messagePayload,
      }),
    });

    if (!lyzrResponse.ok) {
      const errorText = await lyzrResponse.text();
      console.error('[domain-execution] Lyzr API error:', lyzrResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Domain execution request failed', details: errorText }),
        { status: lyzrResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await lyzrResponse.json();
    console.log('[domain-execution] Lyzr response received successfully:', data);

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[domain-execution] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
