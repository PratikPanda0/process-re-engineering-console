import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, MessageSquare, Tag, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerInputOutputProps {
  data: Record<string, unknown>;
  stepNumber?: number;
}

const urgencyColors: Record<string, string> = {
  high: 'bg-red-500/10 text-red-600 border-red-500/30',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  low: 'bg-green-500/10 text-green-600 border-green-500/30',
};

const confidenceColors: Record<string, string> = {
  high: 'text-green-600',
  medium: 'text-amber-600',
  low: 'text-red-600',
};

export function CustomerInputOutput({ data, stepNumber }: CustomerInputOutputProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Parse the agent response - it may be in agentResponse or response as a JSON string
  const parseAgentData = (): Record<string, unknown> => {
    const responseStr = data.agentResponse || data.response;
    if (typeof responseStr === 'string' && responseStr.includes('{')) {
      try {
        return JSON.parse(responseStr);
      } catch {
        // Not valid JSON, return original data
      }
    }
    return data;
  };
  
  const parsedData = parseAgentData();
  
  // Extract fields from parsed data
  const intent = String(parsedData.customer_intent || parsedData.intent || data.customer_intent || 'Unknown intent');
  const description = String(parsedData.issue_description || parsedData.description || data.issue_description || '');
  const category = String(parsedData.category_hint || parsedData.category || data.category_hint || 'general');
  const urgency = String(parsedData.urgency || data.urgency || 'medium').toLowerCase();
  const confidence = String(parsedData.confidence || data.confidence || 'medium').toLowerCase();
  const missingInfo = Array.isArray(parsedData.missing_information) ? parsedData.missing_information : 
                      Array.isArray(data.missing_information) ? data.missing_information : [];
  const isInferred = Boolean(parsedData.inferred_from_input || data.inferred_from_input);

  // Generate plain English summary
  const generateSummary = () => {
    const urgencyText = urgency === 'high' ? 'requires immediate attention' : 
                        urgency === 'medium' ? 'needs timely resolution' : 
                        'can be handled at normal priority';
    
    const categoryText = category === 'fraud' ? 'potential fraud' :
                         category === 'billing' ? 'billing concern' :
                         category === 'complaint' ? 'customer complaint' :
                         category === 'onboarding' ? 'onboarding request' :
                         category === 'support' ? 'support request' :
                         'customer inquiry';

    // Clean up intent text
    const cleanIntent = intent.toLowerCase().replace('unknown intent', 'get assistance');
    
    return `Customer wants to ${cleanIntent}. This ${categoryText} ${urgencyText}.`;
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden transition-all duration-200">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        {stepNumber && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold bg-primary/10 text-primary">
            {stepNumber}
          </div>
        )}
        <div className="flex-1 text-left">
          <p className="font-semibold text-foreground">Customer Input</p>
          <p className="text-xs text-muted-foreground">Issue captured and analyzed</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </span>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Content - Plain English */}
      {isExpanded && (
        <div className="border-t border-border/20 px-4 py-4 bg-background/50 space-y-4">
          {/* Main Summary */}
          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-foreground leading-relaxed">
              {generateSummary()}
            </p>
          </div>

          {/* Issue Description */}
          {description && (
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-sm text-muted-foreground italic">
                "{description}"
              </p>
            </div>
          )}

          {/* Key Attributes */}
          <div className="flex flex-wrap gap-2">
            {/* Category */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Tag className="h-3 w-3" />
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </span>

            {/* Urgency */}
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
              urgencyColors[urgency] || urgencyColors.medium
            )}>
              <AlertTriangle className="h-3 w-3" />
              {urgency.charAt(0).toUpperCase() + urgency.slice(1)} Urgency
            </span>

            {/* Confidence */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Gauge className="h-3 w-3" />
              <span className={confidenceColors[confidence] || 'text-muted-foreground'}>
                {confidence.charAt(0).toUpperCase() + confidence.slice(1)}
              </span>
              {' '}Confidence
            </span>

            {/* Inferred indicator */}
            {isInferred && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-600">
                Best-effort
              </span>
            )}
          </div>

          {/* Missing Information */}
          {missingInfo.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-xs font-medium text-amber-600 mb-1">Additional information needed:</p>
              <ul className="text-sm text-amber-700 list-disc list-inside">
                {missingInfo.map((item, index) => (
                  <li key={index}>{String(item)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
