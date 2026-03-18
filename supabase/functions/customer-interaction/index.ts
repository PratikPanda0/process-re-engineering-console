import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LyzrRequest {
  message: string;
}

interface LyzrApiPayload {
  user_id: string;
  agent_id: string;
  session_id: string;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LYZR_API_KEY = Deno.env.get('LYZR_API_KEY');
    
    if (!LYZR_API_KEY) {
      console.error('LYZR_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'LYZR_API_KEY is not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse incoming request - support multiple field names for flexibility
    const body = await req.json();
    
    // CRITICAL: Extract user message from multiple possible field names
    const userMessage = body.userMessage || body.rawMessage || body.message;
    
    // CRITICAL: Validate message is present and non-empty
    if (!userMessage || typeof userMessage !== 'string') {
      console.error('Invalid request: message field is missing or not a string');
      return new Response(
        JSON.stringify({ error: 'Customer input missing — cannot call agent', field_received: Object.keys(body) }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const trimmedMessage = userMessage.trim();
    
    if (trimmedMessage.length === 0) {
      console.error('Invalid request: message is empty after trimming');
      return new Response(
        JSON.stringify({ error: 'Customer input missing — cannot call agent (empty message)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing customer interaction:', { 
      messageLength: trimmedMessage.length,
      messagePreview: trimmedMessage.substring(0, 100),
    });

    // Prepare Lyzr API payload - ALWAYS use the actual user message
    const lyzrPayload: LyzrApiPayload = {
      user_id: "siddhi.rai@firstsource.com",
      agent_id: "695de7a328a3f341188dfad6",
      session_id: "695de7a328a3f341188dfad6-session",
      message: trimmedMessage, // CRITICAL: Send the actual user input
    };

    console.log('Calling Lyzr API with payload:', { 
      ...lyzrPayload, 
      message: trimmedMessage.substring(0, 50) + (trimmedMessage.length > 50 ? '...' : ''),
    });

    // Call Lyzr inference API
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
      console.error('Lyzr API error:', lyzrResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to process with Lyzr agent',
          status: lyzrResponse.status,
          details: errorText 
        }),
        { status: lyzrResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lyzrData = await lyzrResponse.json();
    console.log('Lyzr API response received:', JSON.stringify(lyzrData).substring(0, 200));

    // Return the raw Lyzr response to frontend
    return new Response(
      JSON.stringify(lyzrData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in customer-interaction function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
