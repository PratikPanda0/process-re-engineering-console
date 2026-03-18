import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LYZR_API_URL = 'https://agent-prod.studio.lyzr.ai/v3/inference/chat/';
const FRAUD_AGENT_ID = '695df24bdc97770fcb84ff90'; // FraudAgent ID
const USER_ID = 'siddhi.rai@firstsource.com';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { interaction_output, orchestrator_output } = await req.json();
    
    if (!interaction_output || !orchestrator_output) {
      console.error('[fraud-agent] Missing required inputs');
      return new Response(
        JSON.stringify({ error: 'interaction_output and orchestrator_output are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('LYZR_API_KEY');
    if (!apiKey) {
      console.error('[fraud-agent] LYZR_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sessionId = `${FRAUD_AGENT_ID}-session`;
    const messagePayload = JSON.stringify({
      interaction_output,
      orchestrator_output,
    });

    console.log('[fraud-agent] Calling Lyzr API with payload:', messagePayload);

    const lyzrResponse = await fetch(LYZR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        user_id: USER_ID,
        agent_id: FRAUD_AGENT_ID,
        session_id: sessionId,
        message: messagePayload,
      }),
    });

    if (!lyzrResponse.ok) {
      const errorText = await lyzrResponse.text();
      console.error('[fraud-agent] Lyzr API error:', lyzrResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Fraud agent request failed', details: errorText }),
        { status: lyzrResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await lyzrResponse.json();
    console.log('[fraud-agent] Lyzr response received:', JSON.stringify(data));

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[fraud-agent] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
