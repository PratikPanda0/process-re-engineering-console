import { Scenario } from '@/types/agent';

export const mockScenarios: Scenario[] = [
  {
    id: 'fraud',
    name: 'Fraud Complaint',
    description: 'High severity fraud case with escalation',
    initialMessage: "I noticed several unauthorized transactions on my account totaling $2,500. I didn't make these purchases and I'm very concerned.",
    steps: [
      { id: 'input', title: 'Customer Input', description: 'Issue captured and summarized', status: 'pending' },
      { id: 'classification', title: 'Classification & Routing', description: 'Intent detected, agent selected', status: 'pending' },
      { id: 'execution', title: 'Task Execution', description: 'Domain agent processes request', status: 'pending' },
      { id: 'compliance', title: 'Policy & Compliance', description: 'Checks against rules', status: 'pending' },
      { id: 'escalation', title: 'Human Escalation', description: 'Flagged for human review', status: 'pending' },
    ],
    messages: [],
    outputs: {
      input: {
        summary: 'Customer reports unauthorized transactions',
        amount: '$2,500',
        urgency: 'high',
      },
      classification: {
        intent: 'fraud_complaint',
        confidence: 0.94,
        category: 'security',
      },
      execution: {
        agent: 'FraudDomainAgent',
        priority: 'high',
        action: 'account_freeze_initiated',
        response: 'Account temporarily secured. Investigation opened.',
      },
      compliance: {
        passed: true,
        flags: ['high_value_transaction'],
        regulation: 'PCI-DSS',
      },
      escalation: {
        required: true,
        reason: 'Amount exceeds $1,000 threshold',
        assignedTo: 'Fraud Investigation Team',
      },
    },
  },
  {
    id: 'billing',
    name: 'Billing Inquiry',
    description: 'Standard billing question, resolved quickly',
    initialMessage: "I was charged twice for my subscription this month. Can you help me understand why?",
    steps: [
      { id: 'input', title: 'Customer Input', description: 'Issue captured and summarized', status: 'pending' },
      { id: 'classification', title: 'Classification & Routing', description: 'Intent detected, agent selected', status: 'pending' },
      { id: 'execution', title: 'Task Execution', description: 'Domain agent processes request', status: 'pending' },
      { id: 'compliance', title: 'Policy & Compliance', description: 'Checks against rules', status: 'pending' },
      { id: 'escalation', title: 'Human Escalation', description: 'Not required', status: 'pending' },
    ],
    messages: [],
    outputs: {
      input: {
        summary: 'Customer reports duplicate subscription charge',
        type: 'billing_dispute',
        urgency: 'medium',
      },
      classification: {
        intent: 'billing_inquiry',
        confidence: 0.91,
        category: 'billing',
      },
      execution: {
        agent: 'BillingDomainAgent',
        priority: 'medium',
        action: 'refund_processed',
        response: 'Duplicate charge identified. Refund of $14.99 initiated.',
      },
      compliance: {
        passed: true,
        flags: [],
        regulation: 'Standard billing policy',
      },
      escalation: {
        required: false,
        reason: null,
      },
    },
  },
  {
    id: 'access',
    name: 'Account Access Issue',
    description: 'Password reset and account recovery',
    initialMessage: "I can't log into my account. I've tried resetting my password but I'm not receiving the email.",
    steps: [
      { id: 'input', title: 'Customer Input', description: 'Issue captured and summarized', status: 'pending' },
      { id: 'classification', title: 'Classification & Routing', description: 'Intent detected, agent selected', status: 'pending' },
      { id: 'execution', title: 'Task Execution', description: 'Domain agent processes request', status: 'pending' },
      { id: 'compliance', title: 'Policy & Compliance', description: 'Checks against rules', status: 'pending' },
      { id: 'escalation', title: 'Human Escalation', description: 'Not required', status: 'pending' },
    ],
    messages: [],
    outputs: {
      input: {
        summary: 'Customer unable to access account, password reset emails not received',
        type: 'access_issue',
        urgency: 'medium',
      },
      classification: {
        intent: 'account_access',
        confidence: 0.89,
        category: 'authentication',
      },
      execution: {
        agent: 'AuthDomainAgent',
        priority: 'medium',
        action: 'email_verified_alternate_sent',
        response: 'Email delivery issue detected. Reset link sent to alternate contact.',
      },
      compliance: {
        passed: true,
        flags: ['identity_verification_required'],
        regulation: 'KYC policy',
      },
      escalation: {
        required: false,
        reason: null,
      },
    },
  },
  {
    id: 'general',
    name: 'General Query',
    description: 'Low priority, quick resolution',
    initialMessage: "What are your business hours and how can I contact support by phone?",
    steps: [
      { id: 'input', title: 'Customer Input', description: 'Issue captured and summarized', status: 'pending' },
      { id: 'classification', title: 'Classification & Routing', description: 'Intent detected, agent selected', status: 'pending' },
      { id: 'execution', title: 'Task Execution', description: 'Domain agent processes request', status: 'pending' },
      { id: 'compliance', title: 'Policy & Compliance', description: 'Checks against rules', status: 'pending' },
      { id: 'escalation', title: 'Human Escalation', description: 'Not required', status: 'pending' },
    ],
    messages: [],
    outputs: {
      input: {
        summary: 'Customer asking for business hours and phone support',
        type: 'general_inquiry',
        urgency: 'low',
      },
      classification: {
        intent: 'general_query',
        confidence: 0.97,
        category: 'information',
      },
      execution: {
        agent: 'GeneralDomainAgent',
        priority: 'low',
        action: 'information_provided',
        response: 'Business hours: Mon-Fri 9AM-6PM EST. Phone: 1-800-555-0123.',
      },
      compliance: {
        passed: true,
        flags: [],
        regulation: 'N/A',
      },
      escalation: {
        required: false,
        reason: null,
      },
    },
  },
];
