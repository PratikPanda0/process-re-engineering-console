import { useState, useCallback } from 'react';
import { FlowStep, ChatMessage, CustomerInteractionOutput } from '@/types/agent';
import { processCustomerInteraction } from '@/services/customerInteractionService';
import { processOrchestratorAgent, OrchestratorResponse } from '@/services/orchestratorAgentService';
import { processDomainExecution, DomainExecutionResponse } from '@/services/domainExecutionService';
import { processPolicyCompliance, PolicyComplianceResponse } from '@/services/policyComplianceService';
import { processHumanEscalation, HumanEscalationResponse } from '@/services/humanEscalationService';
import { processOutcomeMonitoring, OutcomeMonitoringResponse } from '@/services/outcomeMonitoringService';
import { getCustomerMessage, isInternalContent } from '@/utils/customerMessageMapper';

// Default flow steps - always the same for any conversation
const defaultSteps: FlowStep[] = [
  { id: 'input', title: 'Customer Input', description: 'Issue captured and analyzed', status: 'pending' },
  { id: 'classification', title: 'Classification & Routing', description: 'Intent detected, agent selected', status: 'pending' },
  { id: 'execution', title: 'Task Execution', description: 'Domain agent processes request', status: 'pending' },
  { id: 'compliance', title: 'Policy & Compliance', description: 'Checks against rules', status: 'pending' },
  { id: 'escalation', title: 'Human Escalation', description: 'Review requirements assessed', status: 'pending' },
  { id: 'monitoring', title: 'Outcome Monitoring', description: 'Post-case analysis and insights', status: 'pending' },
];

// Helper to parse JSON response from agent (handles markdown code blocks)
function parseAgentJsonResponse(response: string): Record<string, unknown> | null {
  try {
    let jsonStr = response.trim();
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

// SAFETY NET: Check if escalation should be forced based on domain output
// This ensures high-risk cases ALWAYS escalate regardless of agent responses
function shouldForceEscalation(domainOutput: Record<string, unknown>): {
  force: boolean;
  reason: string;
} {
  const domain = ((domainOutput.domain as string) || '').toLowerCase();
  const severity = ((domainOutput.severity as string) || '').toLowerCase();
  const escalationRecommended = (domainOutput.escalation_recommended as boolean) === true;

  if (domain === 'fraud') {
    return { force: true, reason: 'Fraud domain detected - mandatory escalation' };
  }
  if (severity === 'high') {
    return { force: true, reason: 'High severity case - mandatory escalation' };
  }
  if (escalationRecommended) {
    return { force: true, reason: 'Domain agent recommended escalation' };
  }
  return { force: false, reason: '' };
}

export function useAgentFlow() {
  const [steps, setSteps] = useState<FlowStep[]>(defaultSteps);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [outputs, setOutputs] = useState<Record<string, Record<string, unknown>>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);

  // Helper to infer probable intent from raw message when agent doesn't provide structured data
  const inferProbableIntent = (message: string): {
    customer_intent: string;
    category_hint: string;
    urgency: string;
    missing_information: string[];
  } => {
    const lowerMessage = message.toLowerCase();
    
    // Fraud detection patterns
    if (lowerMessage.includes('fraud') || lowerMessage.includes('unauthorized') || 
        lowerMessage.includes('stolen') || lowerMessage.includes('didn\'t buy') ||
        lowerMessage.includes('didnt buy') || lowerMessage.includes('not mine') ||
        lowerMessage.includes('hacked') || lowerMessage.includes('scam')) {
      return {
        customer_intent: 'report potential fraud or unauthorized activity',
        category_hint: 'fraud',
        urgency: 'high',
        missing_information: [],
      };
    }
    
    // Billing patterns
    if (lowerMessage.includes('bill') || lowerMessage.includes('charge') || 
        lowerMessage.includes('payment') || lowerMessage.includes('refund') ||
        lowerMessage.includes('overcharg') || lowerMessage.includes('double') ||
        lowerMessage.includes('subscription')) {
      return {
        customer_intent: 'inquire about billing or payment issue',
        category_hint: 'billing',
        urgency: 'medium',
        missing_information: [],
      };
    }
    
    // Complaint patterns
    if (lowerMessage.includes('complaint') || lowerMessage.includes('unhappy') || 
        lowerMessage.includes('dissatisfied') || lowerMessage.includes('terrible') ||
        lowerMessage.includes('worst') || lowerMessage.includes('angry') ||
        lowerMessage.includes('upset') || lowerMessage.includes('frustrated')) {
      return {
        customer_intent: 'file a complaint',
        category_hint: 'complaint',
        urgency: 'medium',
        missing_information: [],
      };
    }
    
    // Onboarding patterns
    if (lowerMessage.includes('onboard') || lowerMessage.includes('new account') || 
        lowerMessage.includes('sign up') || lowerMessage.includes('register') ||
        lowerMessage.includes('activate') || lowerMessage.includes('setup') ||
        lowerMessage.includes('getting started')) {
      return {
        customer_intent: 'inquire about onboarding or account setup',
        category_hint: 'onboarding',
        urgency: 'low',
        missing_information: [],
      };
    }
    
    // Card-related (could be fraud or general)
    if (lowerMessage.includes('card') || lowerMessage.includes('transaction')) {
      return {
        customer_intent: 'inquire about card or transaction',
        category_hint: 'general',
        urgency: 'medium',
        missing_information: ['specific details about the issue'],
      };
    }
    
    // Default: General inquiry
    return {
      customer_intent: 'general inquiry',
      category_hint: 'general',
      urgency: 'low',
      missing_information: ['more details about the specific issue'],
    };
  };

  // Helper to check if response contains clarification request (for logging only, NOT for blocking)
  const isClarificationRequest = (responseText: string): boolean => {
    const clarificationPatterns = [
      'please briefly describe your issue',
      'please describe your issue',
      'what can i help you with',
      'how can i assist',
      'could you provide more details',
      'please rephrase',
      'i was unable to analyze',
      'please provide more information',
      'can you clarify',
    ];
    
    const lowerResponse = responseText.toLowerCase().trim();
    
    for (const pattern of clarificationPatterns) {
      if (lowerResponse.includes(pattern)) {
        return true;
      }
    }
    return false;
  };

  // Helper to check if response has structured data from agent
  const hasStructuredAnalysis = (response: CustomerInteractionOutput | null): boolean => {
    if (!response) return false;
    
    const hasIntent = typeof response.intent === 'string' && response.intent.length > 0;
    const hasCategory = typeof response.category === 'string' && response.category.length > 0;
    const hasUrgency = typeof response.urgency === 'string' && response.urgency.length > 0;
    
    return hasIntent || hasCategory || hasUrgency;
  };

  // Process Customer Interaction step using real Lyzr API
  const processCustomerInteractionStep = useCallback(async (
    message: string,
    stepIndex: number
  ): Promise<{ 
    output: CustomerInteractionOutput | null; 
    success: boolean;
    needsClarification: boolean;
    clarificationMessage?: string;
  }> => {
    const stepId = 'input';
    
    // CRITICAL: Validate message is not empty
    if (!message || message.trim().length === 0) {
      console.error('[useAgentFlow] Cannot process empty message');
      setOutputs(prev => ({
        ...prev,
        [stepId]: { 
          error: 'Customer input missing — cannot call agent', 
          step1_failed: true,
          awaiting_input: true,
        },
      }));
      return { output: null, success: false, needsClarification: false };
    }
    
    setSteps(prev => prev.map((s, i) => 
      i === stepIndex ? { ...s, status: 'processing' as const } : s
    ));
    setCurrentStepIndex(stepIndex);

    try {
      const result = await processCustomerInteraction(message);
      
      if (result.success && result.data) {
        const responseText = result.data.response || '';
        const hasStructured = hasStructuredAnalysis(result.data);
        const isClari = isClarificationRequest(responseText);
        
        // ALWAYS attempt to extract structured data, even if agent returned clarification
        let finalOutput: Record<string, unknown>;
        
        if (hasStructured) {
          // Case 1: Agent returned structured analysis - use it directly
          console.log('[useAgentFlow] Step 1 completed with agent-provided structured analysis');
          finalOutput = {
            rawMessage: message,
            intent: result.data.intent || 'detected',
            category: result.data.category || 'general',
            urgency: result.data.urgency || 'normal',
            confidence: result.data.confidence || 0.9,
            agentResponse: result.data.response,
            step1_failed: false,
            ...result.data,
          };
        } else {
          // Case 2: Agent didn't return structured data - use best-effort inference
          // NEVER block the pipeline - always infer probable intent
          console.log('[useAgentFlow] Step 1: Agent returned no structure, using best-effort inference');
          const inferred = inferProbableIntent(message);
          
          finalOutput = {
            rawMessage: message,
            intent: inferred.customer_intent,
            customer_intent: inferred.customer_intent,
            category: inferred.category_hint,
            category_hint: inferred.category_hint,
            urgency: inferred.urgency,
            confidence: 'medium', // Lower confidence for inferred data
            missing_information: inferred.missing_information,
            agentResponse: responseText,
            step1_failed: false,
            inferred_from_input: true, // Flag that this was frontend-inferred
            ...result.data,
          };
          
          if (isClari) {
            console.log('[useAgentFlow] Agent requested clarification but pipeline continues with inferred data');
          }
        }
        
        // ALWAYS mark as completed and continue pipeline
        setSteps(prev => prev.map((s, i) => 
          i === stepIndex ? { ...s, status: 'completed' as const } : s
        ));
        setOutputs(prev => ({ ...prev, [stepId]: finalOutput }));
        
        // Return success - pipeline ALWAYS continues
        return { 
          output: {
            ...result.data,
            intent: finalOutput.intent as string,
            category: finalOutput.category as string,
            urgency: finalOutput.urgency as string,
            confidence: typeof finalOutput.confidence === 'number' ? finalOutput.confidence : 0.7,
            missing_information: finalOutput.missing_information as string[] | undefined,
          }, 
          success: true, 
          needsClarification: false, // Never stop for clarification
        };
        
      } else {
        // API call failed - THIS is an actual failure
        // But even here, try best-effort inference to continue pipeline
        console.error('[useAgentFlow] Customer interaction API failed:', result.error);
        console.log('[useAgentFlow] Attempting best-effort inference despite API failure');
        
        const inferred = inferProbableIntent(message);
        
        const fallbackOutput: Record<string, unknown> = {
          rawMessage: message,
          intent: inferred.customer_intent,
          customer_intent: inferred.customer_intent,
          category: inferred.category_hint,
          category_hint: inferred.category_hint,
          urgency: inferred.urgency,
          confidence: 'low', // Low confidence for fallback
          missing_information: inferred.missing_information,
          step1_failed: false, // Mark as NOT failed so pipeline continues
          inferred_from_input: true,
          api_error: result.error, // Keep error for debugging
        };
        
        setSteps(prev => prev.map((s, i) => 
          i === stepIndex ? { ...s, status: 'completed' as const } : s
        ));
        setOutputs(prev => ({ ...prev, [stepId]: fallbackOutput }));
        
        // Return success with inferred data - pipeline continues
        return { 
          output: {
            response: '',
            intent: inferred.customer_intent,
            category: inferred.category_hint,
            urgency: inferred.urgency,
            confidence: 0.5,
          }, 
          success: true, 
          needsClarification: false,
        };
      }
    } catch (error) {
      // Network/API error - try best-effort inference
      console.error('[useAgentFlow] Error processing customer interaction:', error);
      console.log('[useAgentFlow] Attempting best-effort inference despite error');
      
      const inferred = inferProbableIntent(message);
      
      const fallbackOutput: Record<string, unknown> = {
        rawMessage: message,
        intent: inferred.customer_intent,
        customer_intent: inferred.customer_intent,
        category: inferred.category_hint,
        category_hint: inferred.category_hint,
        urgency: inferred.urgency,
        confidence: 'low',
        missing_information: inferred.missing_information,
        step1_failed: false,
        inferred_from_input: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      
      setSteps(prev => prev.map((s, i) => 
        i === stepIndex ? { ...s, status: 'completed' as const } : s
      ));
      setOutputs(prev => ({ ...prev, [stepId]: fallbackOutput }));
      
      // Return success with inferred data - pipeline continues
      return { 
        output: {
          response: '',
          intent: inferred.customer_intent,
          category: inferred.category_hint,
          urgency: inferred.urgency,
          confidence: 0.5,
        }, 
        success: true, 
        needsClarification: false,
      };
    }
  }, []);

  // Parse raw JSON from orchestrator response
  const parseOrchestratorResponse = useCallback((data: OrchestratorResponse): Record<string, unknown> => {
    if (typeof data.response === 'string') {
      const parsed = parseAgentJsonResponse(data.response);
      if (parsed) {
        return { ...data, ...parsed, rawResponse: data.response };
      }
    }
    return { ...data };
  }, []);

  // Process Orchestrator Agent step (Step 2)
  const processOrchestratorStep = useCallback(async (
    interactionOutput: Record<string, unknown>,
    stepIndex: number
  ): Promise<{ response: OrchestratorResponse | null; parsedOutput: Record<string, unknown> }> => {
    const stepId = 'classification';
    
    setSteps(prev => prev.map((s, i) => 
      i === stepIndex ? { ...s, status: 'processing' as const } : s
    ));
    setCurrentStepIndex(stepIndex);

    try {
      const result = await processOrchestratorAgent(interactionOutput);
      
      if (result.success && result.data) {
        setSteps(prev => prev.map((s, i) => 
          i === stepIndex ? { ...s, status: 'completed' as const } : s
        ));
        
        const parsedData = parseOrchestratorResponse(result.data);
        setOutputs(prev => ({ ...prev, [stepId]: parsedData }));
        return { response: result.data, parsedOutput: parsedData };
      } else {
        setSteps(prev => prev.map((s, i) => 
          i === stepIndex ? { ...s, status: 'completed' as const } : s
        ));
        const errorOutput = { error: result.error || 'Failed to process', fallback: true };
        setOutputs(prev => ({ ...prev, [stepId]: errorOutput }));
        return { response: null, parsedOutput: errorOutput };
      }
    } catch (error) {
      console.error('[useAgentFlow] Error processing orchestrator:', error);
      setSteps(prev => prev.map((s, i) => 
        i === stepIndex ? { ...s, status: 'completed' as const } : s
      ));
      const errorOutput = { error: error instanceof Error ? error.message : 'Unknown error', fallback: true };
      setOutputs(prev => ({ ...prev, [stepId]: errorOutput }));
      return { response: null, parsedOutput: errorOutput };
    }
  }, [parseOrchestratorResponse]);

  // Process Domain Execution step (Step 3) - uses DomainExecutionManager agent
  const processDomainAgentStep = useCallback(async (
    routedAgent: string,
    interactionOutput: Record<string, unknown>,
    orchestratorOutput: Record<string, unknown>,
    stepIndex: number
  ): Promise<Record<string, unknown> | null> => {
    const stepId = 'execution';
    
    console.log(`[useAgentFlow] Processing domain execution via DomainExecutionManager for: ${routedAgent}`);
    
    setSteps(prev => prev.map((s, i) => 
      i === stepIndex ? { ...s, status: 'processing' as const } : s
    ));
    setCurrentStepIndex(stepIndex);

    try {
      // Extract fields from orchestrator output
      const finalIntent = (orchestratorOutput.final_intent as string) || 
                          (orchestratorOutput.intent as string) || 
                          'general_inquiry';
      const issueSummary = (orchestratorOutput.issue_summary as string) ||
                           (interactionOutput.rawMessage as string) ||
                           '';
      const confidence = (orchestratorOutput.confidence as number) || 0.9;

      console.log('[useAgentFlow] Calling DomainExecutionManager with:', {
        final_intent: finalIntent,
        routed_agent: routedAgent,
        issue_summary: issueSummary,
        confidence,
      });

      const result = await processDomainExecution({
        final_intent: finalIntent,
        routed_agent: routedAgent,
        issue_summary: issueSummary,
        confidence,
        interaction_output: interactionOutput,
        orchestrator_output: orchestratorOutput,
      });
      
      if (result.success && result.data) {
        setSteps(prev => prev.map((s, i) => 
          i === stepIndex ? { ...s, status: 'completed' as const } : s
        ));
        
        let parsedData: Record<string, unknown> = { 
          executed_by: routedAgent,
          handled_by: 'DomainExecutionManager',
        };
        
        // Parse the response if it's a JSON string
        if (typeof result.data.response === 'string') {
          const parsed = parseAgentJsonResponse(result.data.response);
          if (parsed) {
            parsedData = { ...parsed, executed_by: routedAgent, handled_by: 'DomainExecutionManager' };
          } else {
            parsedData = { ...result.data, executed_by: routedAgent, handled_by: 'DomainExecutionManager' };
          }
        } else {
          parsedData = { ...result.data, executed_by: routedAgent, handled_by: 'DomainExecutionManager' };
        }
        
        setOutputs(prev => ({ ...prev, [stepId]: parsedData }));
        console.log('[useAgentFlow] DomainExecutionManager completed:', parsedData);
        return parsedData;
      } else {
        setSteps(prev => prev.map((s, i) => 
          i === stepIndex ? { ...s, status: 'completed' as const } : s
        ));
        const errorOutput = { 
          error: result.error || 'Failed to process', 
          fallback: true, 
          attempted_agent: routedAgent,
          handled_by: 'DomainExecutionManager',
        };
        setOutputs(prev => ({ ...prev, [stepId]: errorOutput }));
        return null;
      }
    } catch (error) {
      console.error('[useAgentFlow] Error processing DomainExecutionManager:', error);
      setSteps(prev => prev.map((s, i) => 
        i === stepIndex ? { ...s, status: 'completed' as const } : s
      ));
      const errorOutput = { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        fallback: true, 
        attempted_agent: routedAgent,
        handled_by: 'DomainExecutionManager',
      };
      setOutputs(prev => ({ ...prev, [stepId]: errorOutput }));
      return null;
    }
  }, []);

  // Process Policy & Compliance step (Step 4) - uses Policy & Compliance Agent
  const processPolicyComplianceStep = useCallback(async (
    domainOutput: Record<string, unknown>,
    stepIndex: number
  ): Promise<Record<string, unknown> | null> => {
    const stepId = 'compliance';
    
    console.log(`[useAgentFlow] Processing Policy & Compliance step...`);
    
    setSteps(prev => prev.map((s, i) => 
      i === stepIndex ? { ...s, status: 'processing' as const } : s
    ));
    setCurrentStepIndex(stepIndex);

    try {
      // Extract fields from domain output
      const domain = (domainOutput.domain as string) || 'unknown';
      const category = (domainOutput.category as string) || 'general';
      const severity = (domainOutput.severity as string) || 'medium';
      const recommendedAction = (domainOutput.recommended_action as string) || 'review';
      const escalationRecommended = (domainOutput.escalation_recommended as boolean) || false;
      const handledBy = (domainOutput.handled_by as string) || 'DomainExecutionManager';
      const confidence = (domainOutput.confidence as number) || 0.9;

      console.log('[useAgentFlow] Calling Policy & Compliance Agent with:', {
        domain,
        category,
        severity,
        recommended_action: recommendedAction,
        escalation_recommended: escalationRecommended,
        handled_by: handledBy,
        confidence,
      });

      const result = await processPolicyCompliance({
        domain,
        category,
        severity,
        recommended_action: recommendedAction,
        escalation_recommended: escalationRecommended,
        handled_by: handledBy,
        confidence,
        domain_execution_output: domainOutput,
      });
      
      if (result.success && result.data) {
        setSteps(prev => prev.map((s, i) => 
          i === stepIndex ? { ...s, status: 'completed' as const } : s
        ));
        
        // NEW OUTPUT FORMAT - matches strict policy agent contract
        const parsedData: Record<string, unknown> = { 
          checked_by: 'PolicyComplianceAgent',
          action_reviewed: result.data.action_reviewed,
          decision: result.data.decision,
          reason: result.data.reason,
          policy_reference: result.data.policy_reference,
          escalation_required: result.data.escalation_required,
          confidence: result.data.confidence,
        };
        
        setOutputs(prev => ({ ...prev, [stepId]: parsedData }));
        console.log('[useAgentFlow] Policy & Compliance completed:', parsedData);
        return parsedData;
      } else {
        setSteps(prev => prev.map((s, i) => 
          i === stepIndex ? { ...s, status: 'completed' as const } : s
        ));
        const errorOutput = { 
          error: result.error || 'Failed to process', 
          fallback: true, 
          checked_by: 'PolicyComplianceAgent',
        };
        setOutputs(prev => ({ ...prev, [stepId]: errorOutput }));
        return null;
      }
    } catch (error) {
      console.error('[useAgentFlow] Error processing Policy & Compliance:', error);
      setSteps(prev => prev.map((s, i) => 
        i === stepIndex ? { ...s, status: 'completed' as const } : s
      ));
      const errorOutput = { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        fallback: true, 
        checked_by: 'PolicyComplianceAgent',
      };
      setOutputs(prev => ({ ...prev, [stepId]: errorOutput }));
      return null;
    }
  }, []);

  // Process Human Escalation step (Step 5) - uses Human Escalation Agent
  const processHumanEscalationStep = useCallback(async (
    policyOutput: Record<string, unknown>,
    domainOutput: Record<string, unknown>,
    orchestratorOutput: Record<string, unknown>,
    stepIndex: number
  ): Promise<Record<string, unknown> | null> => {
    const stepId = 'escalation';
    
    console.log(`[useAgentFlow] Processing Human Escalation step...`);
    
    setSteps(prev => prev.map((s, i) => 
      i === stepIndex ? { ...s, status: 'processing' as const } : s
    ));
    setCurrentStepIndex(stepIndex);

    try {
      // Map new policy output format to escalation agent input
      const decision = (policyOutput.decision as string) || '';
      const escalationRequired = (policyOutput.escalation_required as boolean) || false;
      const reason = (policyOutput.reason as string) || '';
      const confidence = (policyOutput.confidence as string) || 'medium';

      console.log('[useAgentFlow] Calling Human Escalation Agent with:', {
        decision,
        escalation_required: escalationRequired,
        reason,
        confidence,
      });

      const result = await processHumanEscalation({
        policy_checked: true,
        compliance_status: decision === 'escalate' ? 'requires_escalation' : decision,
        risk_level: decision === 'escalate' ? 'high' : 'medium',
        requires_human_review: escalationRequired,
        escalation_allowed: escalationRequired,
        policy_decision: decision,
        policy_reasoning: reason,
        confidence,
        domain_output: domainOutput,
        orchestrator_output: orchestratorOutput,
      });
      
      if (result.success && result.data) {
        setSteps(prev => prev.map((s, i) => 
          i === stepIndex ? { ...s, status: 'completed' as const } : s
        ));
        
        const parsedData: Record<string, unknown> = { 
          handled_by: 'HumanEscalationAgent',
          escalation_triggered: result.data.escalation_triggered,
          escalation_reason: result.data.escalation_reason,
          priority: result.data.priority,
          assigned_team: result.data.assigned_team,
          case_summary: result.data.case_summary,
          recommended_action: result.data.recommended_action,
          sla_hours: result.data.sla_hours,
          confidence: result.data.confidence,
        };
        
        setOutputs(prev => ({ ...prev, [stepId]: parsedData }));
        console.log('[useAgentFlow] Human Escalation completed:', parsedData);
        return parsedData;
      } else {
        setSteps(prev => prev.map((s, i) => 
          i === stepIndex ? { ...s, status: 'completed' as const } : s
        ));
        const errorOutput = { 
          error: result.error || 'Failed to process', 
          fallback: true, 
          handled_by: 'HumanEscalationAgent',
        };
        setOutputs(prev => ({ ...prev, [stepId]: errorOutput }));
        return null;
      }
    } catch (error) {
      console.error('[useAgentFlow] Error processing Human Escalation:', error);
      setSteps(prev => prev.map((s, i) => 
        i === stepIndex ? { ...s, status: 'completed' as const } : s
      ));
      const errorOutput = { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        fallback: true, 
        handled_by: 'HumanEscalationAgent',
      };
      setOutputs(prev => ({ ...prev, [stepId]: errorOutput }));
      return null;
    }
  }, []);

  // Process Outcome Monitoring step (Step 6) - read-only analytics agent
  const processOutcomeMonitoringStep = useCallback(async (
    interactionOutput: Record<string, unknown>,
    orchestratorOutput: Record<string, unknown>,
    domainOutput: Record<string, unknown> | null,
    policyOutput: Record<string, unknown> | null,
    escalationOutput: Record<string, unknown> | null,
    stepIndex: number
  ): Promise<Record<string, unknown> | null> => {
    const stepId = 'monitoring';
    
    console.log(`[useAgentFlow] Processing Outcome Monitoring step...`);
    
    setSteps(prev => prev.map((s, i) => 
      i === stepIndex ? { ...s, status: 'processing' as const } : s
    ));
    setCurrentStepIndex(stepIndex);

    try {
      // Build consolidated case summary
      const domain = (domainOutput?.domain as string) || 'unknown';
      const severity = (domainOutput?.severity as string) || 'medium';
      const policyDecision = (policyOutput?.decision as string) || 'none';
      const caseSummary = (escalationOutput?.case_summary as string) || 
                          (domainOutput?.recommended_action as string) || '';
      
      const escalationTriggered = (escalationOutput?.escalation_triggered as boolean) || false;
      const escalationReason = (escalationOutput?.escalation_reason as string) || '';
      const priority = (escalationOutput?.priority as string) || '';
      const assignedTeam = (escalationOutput?.assigned_team as string) || '';

      // Collect confidence levels from all agents
      const confidenceLevels: Record<string, unknown> = {
        interaction: interactionOutput?.confidence,
        classification: orchestratorOutput?.confidence,
        execution: domainOutput?.confidence,
        compliance: policyOutput?.confidence,
        escalation: escalationOutput?.confidence,
      };

      // Collect actions taken
      const actionsTaken: string[] = [];
      if (domainOutput?.recommended_action) actionsTaken.push(domainOutput.recommended_action as string);
      if (escalationOutput?.recommended_action) actionsTaken.push(escalationOutput.recommended_action as string);

      console.log('[useAgentFlow] Calling Outcome Monitoring Agent with:', {
        domain,
        severity,
        policy_decision: policyDecision,
        escalation_triggered: escalationTriggered,
      });

      const result = await processOutcomeMonitoring({
        domain,
        severity,
        actions_taken: actionsTaken,
        policy_decision: policyDecision,
        escalation_result: {
          triggered: escalationTriggered,
          reason: escalationReason,
          priority,
          assigned_team: assignedTeam,
        },
        confidence_levels: confidenceLevels,
        case_summary: caseSummary,
        full_context: {
          interaction: interactionOutput,
          classification: orchestratorOutput,
          execution: domainOutput || undefined,
          compliance: policyOutput || undefined,
          escalation: escalationOutput || undefined,
        },
      });
      
      if (result.success && result.data) {
        setSteps(prev => prev.map((s, i) => 
          i === stepIndex ? { ...s, status: 'completed' as const } : s
        ));
        
        const parsedData: Record<string, unknown> = { 
          analyzed_by: 'OutcomeMonitoringAgent',
          case_outcome: result.data.case_outcome,
          automation_effectiveness: result.data.automation_effectiveness,
          sla_met: result.data.sla_met,
          policy_alignment: result.data.policy_alignment,
          insights: result.data.insights,
          recommendations: result.data.recommendations,
          audit_trail: result.data.audit_trail,
          narrative_summary: result.data.narrative_summary,
        };
        
        setOutputs(prev => ({ ...prev, [stepId]: parsedData }));
        console.log('[useAgentFlow] Outcome Monitoring completed:', parsedData);
        return parsedData;
      } else {
        setSteps(prev => prev.map((s, i) => 
          i === stepIndex ? { ...s, status: 'completed' as const } : s
        ));
        const errorOutput = { 
          error: result.error || 'Failed to process', 
          fallback: true, 
          analyzed_by: 'OutcomeMonitoringAgent',
        };
        setOutputs(prev => ({ ...prev, [stepId]: errorOutput }));
        return null;
      }
    } catch (error) {
      console.error('[useAgentFlow] Error processing Outcome Monitoring:', error);
      setSteps(prev => prev.map((s, i) => 
        i === stepIndex ? { ...s, status: 'completed' as const } : s
      ));
      const errorOutput = { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        fallback: true, 
        analyzed_by: 'OutcomeMonitoringAgent',
      };
      setOutputs(prev => ({ ...prev, [stepId]: errorOutput }));
      return null;
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (isProcessing) return;

    // CRITICAL: Frontend validation - do not proceed with empty input
    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent.length === 0) {
      console.warn('[useAgentFlow] Blocked empty message submission');
      return;
    }

    setIsProcessing(true);

    // Add customer message
    const customerMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'customer',
      content: trimmedContent,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, customerMessage]);

    // Step 1: Process with real Lyzr Customer Interaction Agent
    // Pipeline ALWAYS continues - best-effort inference is used if agent fails
    const step1Result = await processCustomerInteractionStep(trimmedContent, 0);

    // With best-effort inference, step1Result.success should always be true
    // This is a safety check for unexpected failures
    if (!step1Result.success || !step1Result.output) {
      console.error('[useAgentFlow] Step 1 unexpectedly failed - this should not happen with best-effort inference');
      
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        sender: 'assistant',
        content: 'I was unable to process your request due to a technical issue. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsProcessing(false);
      return;
    }

    // Pipeline ALWAYS continues - no clarification blocking

    const lyzrResponse = step1Result.output!;

    // Step 2: Process with real Lyzr Orchestrator Agent
    const interactionOutput = {
      rawMessage: trimmedContent,
      intent: lyzrResponse.intent,
      category: lyzrResponse.category,
      urgency: lyzrResponse.urgency,
      confidence: lyzrResponse.confidence,
      response: lyzrResponse.response,
    };
    
    const { parsedOutput: orchestratorOutput } = await processOrchestratorStep(interactionOutput, 1);

    // Step 3: Route to DomainExecutionManager based on routed_agent field
    const routedAgent = orchestratorOutput?.routed_agent as string | undefined;
    
    console.log('[useAgentFlow] Orchestrator output:', orchestratorOutput);
    console.log('[useAgentFlow] Routed agent:', routedAgent);
    
    let domainOutput: Record<string, unknown> | null = null;
    
    // Call DomainExecutionManager for any valid routed agent
    if (routedAgent && routedAgent !== 'none' && routedAgent !== 'unknown') {
      domainOutput = await processDomainAgentStep(routedAgent, interactionOutput, orchestratorOutput, 2);
    } else {
      console.log(`[useAgentFlow] No domain agent routing for: ${routedAgent || 'undefined'}`);
    }

    // SAFETY NET: Check if escalation should be forced
    // This is deterministic and cannot be overridden by agent responses
    let forceEscalation = { force: false, reason: '' };
    if (domainOutput) {
      forceEscalation = shouldForceEscalation(domainOutput);
      console.log('[useAgentFlow] Escalation safety net check:', forceEscalation);
    }

    // Track outputs for Step 6
    let policyOutput: Record<string, unknown> | null = null;
    let escalationOutput: Record<string, unknown> | null = null;
    
    if (domainOutput && forceEscalation.force) {
      console.log('[useAgentFlow] MANDATORY: Triggering Policy & Compliance due to:', forceEscalation.reason);
      policyOutput = await processPolicyComplianceStep(domainOutput, 3);
      
      // Step 5: Human Escalation - ALWAYS trigger when safety net forces escalation
      // This is deterministic - high-risk cases MUST escalate
      console.log('[useAgentFlow] MANDATORY: Triggering Human Escalation due to:', forceEscalation.reason);
      escalationOutput = await processHumanEscalationStep(
        policyOutput || { 
          decision: 'escalate', 
          escalation_required: true, 
          reason: forceEscalation.reason 
        }, 
        domainOutput, 
        orchestratorOutput, 
        4
      );
    } else if (domainOutput) {
      // Non-mandatory path - check policy agent's decision
      const severity = (domainOutput.severity as string) || '';
      const escalationRecommended = (domainOutput.escalation_recommended as boolean) || false;
      
      if (severity.toLowerCase() === 'high' || escalationRecommended === true) {
        console.log('[useAgentFlow] Triggering Policy & Compliance check due to high severity or escalation flag');
        policyOutput = await processPolicyComplianceStep(domainOutput, 3);
        
        // Check policy output for escalation decision
        if (policyOutput) {
          const decision = (policyOutput.decision as string) || '';
          const escalationRequired = (policyOutput.escalation_required as boolean) || false;
          
          if (decision === 'escalate' || escalationRequired) {
            console.log('[useAgentFlow] Triggering Human Escalation due to policy decision');
            escalationOutput = await processHumanEscalationStep(policyOutput, domainOutput, orchestratorOutput, 4);
          } else {
            console.log('[useAgentFlow] Skipping Human Escalation - policy decision:', decision);
          }
        }
      } else {
        console.log('[useAgentFlow] Skipping Policy & Compliance - severity is not high and escalation not recommended');
      }
    }

    // Step 6: Outcome Monitoring & Reporting - ALWAYS runs after flow completes
    // This is a read-only analytics agent that observes and reports
    console.log('[useAgentFlow] Triggering Outcome Monitoring & Reporting...');
    await processOutcomeMonitoringStep(
      interactionOutput,
      orchestratorOutput,
      domainOutput,
      policyOutput,
      escalationOutput,
      5
    );

    console.log('[useAgentFlow] Flow completed.');

    // Generate customer-facing message using deterministic mapper
    // NEVER show raw agent JSON or internal outputs to customer
    const step1Data = {
      customer_intent: lyzrResponse.intent,
      intent: lyzrResponse.intent,
      category_hint: lyzrResponse.category,
      category: lyzrResponse.category,
      urgency: lyzrResponse.urgency,
      confidence: lyzrResponse.confidence,
      response: lyzrResponse.response,
      missing_information: [],
    };
    
    const customerFacingMessage = getCustomerMessage(step1Data);
    
    const assistantMessage: ChatMessage = {
      id: `msg-${Date.now()}-response`,
      sender: 'assistant',
      content: customerFacingMessage,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, assistantMessage]);

    setIsProcessing(false);
  }, [isProcessing, processCustomerInteractionStep, processOrchestratorStep, processDomainAgentStep, processPolicyComplianceStep, processHumanEscalationStep, processOutcomeMonitoringStep]);

  const resetFlow = useCallback(() => {
    setSteps(defaultSteps.map(s => ({ ...s, status: 'pending' as const })));
    setMessages([]);
    setOutputs({});
    setCurrentStepIndex(-1);
    setIsProcessing(false);
  }, []);

  return {
    steps,
    messages,
    outputs,
    isProcessing,
    currentStepIndex,
    sendMessage,
    resetFlow,
  };
}
