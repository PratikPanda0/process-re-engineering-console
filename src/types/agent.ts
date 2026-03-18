export type StepStatus = 'pending' | 'processing' | 'completed';

export interface FlowStep {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
  output?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  sender: 'customer' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  initialMessage: string;
  steps: FlowStep[];
  messages: ChatMessage[];
  outputs: Record<string, Record<string, unknown>>;
}

// Customer Interaction Agent response structure
export interface CustomerInteractionOutput {
  response?: string;
  intent?: string;
  category?: string;
  urgency?: string;
  confidence?: number;
  [key: string]: unknown;
}

// Future-ready: Orchestrator decision structure
export interface OrchestratorDecision {
  targetAgent: string;
  priority: string;
  context: Record<string, unknown>;
}

// Future-ready: Domain agent execution result
export interface DomainAgentResult {
  agentId: string;
  status: 'success' | 'failure' | 'escalate';
  result: Record<string, unknown>;
}
