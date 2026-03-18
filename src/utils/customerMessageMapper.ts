/**
 * Customer Message Mapper
 * 
 * Generates customer-facing plain-English messages based on Step 1 agent output.
 * This ensures chat responses are friendly and professional, NOT raw agent JSON.
 */

export interface Step1Output {
  customer_intent?: string;
  intent?: string;
  issue_description?: string;
  category_hint?: string;
  category?: string;
  urgency?: string;
  confidence?: string | number;
  missing_information?: string[];
  response?: string;
  [key: string]: unknown;
}

/**
 * Parses agent response string to extract structured fields
 */
function parseAgentResponse(responseStr: string): Record<string, unknown> | null {
  if (!responseStr || typeof responseStr !== 'string') return null;
  
  try {
    let jsonStr = responseStr.trim();
    // Handle markdown code blocks
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    jsonStr = jsonStr.replace(/```$/, '').trim();
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * Generates a customer-friendly message based on Step 1 analysis.
 * Uses deterministic mapping rules - NOT raw agent output.
 */
export function getCustomerMessage(step1Output: Step1Output): string {
  // First, try to parse the response field if it contains JSON
  let parsedData = step1Output;
  if (step1Output.response && typeof step1Output.response === 'string') {
    const parsed = parseAgentResponse(step1Output.response);
    if (parsed) {
      parsedData = { ...step1Output, ...parsed };
    }
  }
  
  // Extract normalized fields
  const category = (parsedData.category_hint || parsedData.category || '').toString().toLowerCase();
  const urgency = (parsedData.urgency || '').toString().toLowerCase();
  const intent = (parsedData.customer_intent || parsedData.intent || '').toString().toLowerCase();
  const missingInfo = Array.isArray(parsedData.missing_information) ? parsedData.missing_information : [];
  
  // Rule 1: Fraud cases get high-priority acknowledgment
  if (category === 'fraud' || intent.includes('fraud') || intent.includes('unauthorized')) {
    return "Thanks for letting us know. It looks like there may be an unauthorized transaction on your card. We're taking this seriously and securing it for immediate review.";
  }
  
  // Rule 2: Billing issues
  if (category === 'billing' || intent.includes('billing') || intent.includes('charge') || intent.includes('payment')) {
    if (urgency === 'high') {
      return "I understand this billing concern is urgent. I've captured the details and our team will prioritize resolving it for you.";
    }
    return "Thanks for reaching out about your billing concern. I've captured the details and we're looking into it now.";
  }
  
  // Rule 3: Complaints
  if (category === 'complaint' || intent.includes('complaint') || intent.includes('unhappy') || intent.includes('dissatisfied')) {
    return "I'm sorry to hear about your experience. I've noted your concern and we're committed to making this right.";
  }
  
  // Rule 4: High urgency cases (any category)
  if (urgency === 'high') {
    return "This looks urgent, so we're prioritizing it and routing it to the right team for immediate attention.";
  }
  
  // Rule 5: Medium urgency
  if (urgency === 'medium') {
    return "Thanks for reaching out. I've captured your issue and we're reviewing it now. You should hear back shortly.";
  }
  
  // Rule 6: Missing information needed
  if (missingInfo.length > 0) {
    return `Thanks for reaching out. To help you better, could you please provide: ${missingInfo.join(', ')}?`;
  }
  
  // Rule 7: General support
  if (category === 'support' || intent.includes('help') || intent.includes('support')) {
    return "Thanks for reaching out. I've captured your request and we're here to help.";
  }
  
  // Rule 8: Onboarding queries
  if (category === 'onboarding' || intent.includes('onboard') || intent.includes('account') || intent.includes('setup')) {
    return "Thanks, I've noted your onboarding query and I'm checking the status.";
  }
  
  // Default: Professional acknowledgment that continues the pipeline
  return "Thanks for reaching out. I've captured your message and we're routing it to the right team.";
}

/**
 * Checks if a string contains internal/debug content that should NOT be shown to customers
 */
export function isInternalContent(text: string): boolean {
  if (!text || typeof text !== 'string') return true;
  
  const internalPatterns = [
    'customer_intent',
    'category_hint',
    'confidence',
    'missing_information',
    'customer wants to unknown',
    'this inquiry needs timely',
    '"urgency":',
    '"intent":',
    'json',
    '{',
    '}',
  ];
  
  const lowerText = text.toLowerCase();
  
  for (const pattern of internalPatterns) {
    if (lowerText.includes(pattern.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}
