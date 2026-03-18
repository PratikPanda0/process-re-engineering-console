import { supabase } from '@/integrations/supabase/client';

export interface CustomerInteractionResponse {
  response?: string;
  intent?: string;
  category?: string;
  urgency?: string;
  confidence?: number;
  [key: string]: unknown;
}

export interface CustomerInteractionResult {
  success: boolean;
  data?: CustomerInteractionResponse;
  error?: string;
}

/**
 * Calls the customer-interaction edge function to process customer messages
 * through the Lyzr Customer Interaction Agent.
 * 
 * This service is designed to be extensible for future orchestrator/domain agent integration.
 */
export async function processCustomerInteraction(message: string): Promise<CustomerInteractionResult> {
  try {
    console.log('[CustomerInteractionService] Sending message to edge function');
    
    const { data, error } = await supabase.functions.invoke('customer-interaction', {
      body: { message },
    });

    if (error) {
      console.error('[CustomerInteractionService] Edge function error:', error);
      return {
        success: false,
        error: error.message || 'Failed to process customer interaction',
      };
    }

    console.log('[CustomerInteractionService] Response received:', data);

    // Parse and normalize the Lyzr response
    const normalizedData = normalizeResponse(data);
    
    return {
      success: true,
      data: normalizedData,
    };
  } catch (err) {
    console.error('[CustomerInteractionService] Unexpected error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Normalizes the Lyzr API response to a consistent format.
 * This makes it easier to swap out agents or orchestrators in the future.
 */
function normalizeResponse(data: unknown): CustomerInteractionResponse {
  if (!data || typeof data !== 'object') {
    return { response: String(data) };
  }

  const response = data as Record<string, unknown>;
  
  // Extract response text - Lyzr may return it in different fields
  const responseText = response.response || response.message || response.output || response.text || '';
  
  return {
    response: String(responseText),
    intent: response.intent as string | undefined,
    category: response.category as string | undefined,
    urgency: response.urgency as string | undefined,
    confidence: typeof response.confidence === 'number' ? response.confidence : undefined,
    ...response,
  };
}
