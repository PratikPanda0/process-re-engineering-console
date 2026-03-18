import { Header } from '@/components/layout/Header';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { AgentFlowPanel } from '@/components/flow/AgentFlowPanel';
import { DecisionPanel } from '@/components/decision/DecisionPanel';
import { useAgentFlow } from '@/hooks/useAgentFlow';

const Index = () => {
  const {
    steps,
    messages,
    outputs,
    isProcessing,
    currentStepIndex,
    sendMessage,
    resetFlow,
  } = useAgentFlow();

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      {/* Header */}
      <Header
        onReset={resetFlow}
        isProcessing={isProcessing}
        hasMessages={messages.length > 0}
      />

      {/* Main content area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left column: Chat (60%) + Agent Flow (40%) */}
        <div className="flex flex-[7] min-w-0 border-r border-border/30">
          {/* Chat Panel - Primary */}
          <div className="flex-[3] min-w-0 border-r border-border/20">
            <ChatPanel
              messages={messages}
              onSendMessage={sendMessage}
              isProcessing={isProcessing}
            />
          </div>

          {/* Agent Flow Panel - Secondary */}
          <div className="flex-[2] min-w-0">
            <AgentFlowPanel
              steps={steps}
              currentStepIndex={currentStepIndex}
            />
          </div>
        </div>

        {/* Right column: Decision & Outcome Panel - Always Visible */}
        <div className="flex-[3] min-w-0">
          <DecisionPanel outputs={outputs} />
        </div>
      </div>
    </div>
  );
};

export default Index;
