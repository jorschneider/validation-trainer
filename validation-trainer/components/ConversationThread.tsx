'use client';

import { useEffect, useRef } from 'react';
import { ConversationMessage, Scenario } from '@/types/validation';

interface ConversationThreadProps {
  messages: ConversationMessage[];
  showHints?: boolean;
  currentTranscript?: string;
  scenario?: Scenario | null;
}

// Extract hint logic inline
function getHintForMessage(message: ConversationMessage, allMessages: ConversationMessage[]): { hint: string; type: 'tip' | 'warning' | 'success' } | null {
  if (message.role !== 'user') return null;
  
  const userMessages = allMessages.filter(m => m.role === 'user');
  const messageIndex = userMessages.findIndex(m => m.timestamp === message.timestamp);
  const conversationTurn = messageIndex;
  const contentToAnalyze = message.content.toLowerCase();

  // First response - encourage listening only
  if (conversationTurn === 0 && contentToAnalyze) {
    if (contentToAnalyze.includes('you should') || contentToAnalyze.includes('why don\'t you')) {
      return { hint: 'Remember: Listen first, don\'t jump to solutions yet', type: 'warning' };
    }
    if (contentToAnalyze.includes('what') || contentToAnalyze.includes('tell me')) {
      return { hint: 'Great - asking questions to understand more!', type: 'success' };
    }
    return { hint: 'Focus on listening and understanding how they feel', type: 'tip' };
  }

  // Check for common mistakes
  if (contentToAnalyze) {
    // Check for "but"
    if (contentToAnalyze.includes(' but ') || contentToAnalyze.includes('however')) {
      return { hint: 'Try "and" instead of "but" - "but" negates what you said before', type: 'warning' };
    }

    // Check for invalidating phrases
    if (contentToAnalyze.match(/don't worry|you'll be fine|it could be worse|at least/)) {
      return { hint: 'That might feel dismissive. Try validating the emotion instead', type: 'warning' };
    }

    // Check for premature advice
    if (conversationTurn === 1 && contentToAnalyze.match(/you should|why don't you|have you tried/)) {
      return { hint: 'Consider validating first before giving advice', type: 'warning' };
    }

    // Check for good validation
    if (contentToAnalyze.match(/that makes sense|i don't blame you|i can see why|that sounds/)) {
      return { hint: 'Nice validation! You\'re acknowledging their feelings', type: 'success' };
    }
  }

  // Default hints based on conversation stage (only if no specific hint was found above)
  // Always provide a hint for user messages
  if (conversationTurn === 0) {
    // This should have been handled above, but fallback just in case
    return { hint: 'Focus on listening and understanding how they feel', type: 'tip' };
  } else if (conversationTurn === 1) {
    return { hint: 'Step 2: Validate the emotion - name it and explain why it makes sense', type: 'tip' };
  } else if (conversationTurn === 2) {
    return { hint: 'If offering advice, ask first: "How can I help?" or "Would you like my thoughts?"', type: 'tip' };
  } else {
    // For later turns, provide a general hint
    return { hint: 'Continue validating their emotions and showing you understand', type: 'tip' };
  }
}

export default function ConversationThread({ messages, showHints = false, currentTranscript = '', scenario }: ConversationThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div 
      className="space-y-4 max-h-96 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl scroll-smooth border border-gray-200 shadow-inner"
      role="log"
      aria-live="polite"
      aria-label="Conversation thread"
      style={{ scrollbarWidth: 'thin' }}
    >
      {messages.length === 0 ? (
        <div className="space-y-4">
          {scenario && (
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-5 border-2 border-blue-200 shadow-md">
              <div className="flex items-start gap-3 mb-3">
                <div className="bg-blue-100 rounded-full p-2">
                  <span className="text-blue-600 text-lg">📋</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1 text-lg">{scenario.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{scenario.description}</p>
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <p className="text-xs font-semibold text-blue-900 mb-1 uppercase tracking-wide">What your partner might say:</p>
                    <p className="text-sm text-gray-700 italic">"{scenario.partnerOpening}"</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="text-center py-8">
            <div className="bg-white/60 backdrop-blur-sm rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 text-3xl">
              💬
            </div>
            <p className="text-gray-500 font-medium">Start the conversation below...</p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message, index) => {
            // Only show hints for finalized messages (not for the last message if there's active transcript)
            const isLastMessage = index === messages.length - 1;
            const hasActiveTranscript = !!currentTranscript;
            const shouldShowHint = showHints && message.role === 'user' && !(isLastMessage && hasActiveTranscript);
            const hint = shouldShowHint ? getHintForMessage(message, messages) : null;
            
            return (
              <div key={`${message.timestamp}-${index}`} className="space-y-2">
                <div
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}
                >
                  <div
                    className={`
                      max-w-[80%] rounded-2xl px-5 py-3 shadow-md
                      transition-all duration-200 transform hover:scale-[1.02]
                      ${message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                        : 'bg-white text-gray-800 border-2 border-gray-200'
                      }
                    `}
                    role="article"
                    aria-label={`Message from ${message.role === 'user' ? 'You' : 'Partner'}`}
                  >
                    <div className={`text-xs font-bold mb-2 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                      {message.role === 'user' ? 'You' : 'Partner'}
                    </div>
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
                  </div>
                </div>
                {/* Show hint after user messages when enabled */}
                {hint && (
                  <div className={`flex justify-end animate-in fade-in slide-in-from-bottom-2`}>
                    <div className={`max-w-[80%] rounded-xl px-4 py-2 text-xs font-medium shadow-sm border-2 ${
                      hint.type === 'success' 
                        ? 'bg-green-50 border-green-300 text-green-800' 
                        : hint.type === 'warning'
                        ? 'bg-orange-50 border-orange-300 text-orange-800'
                        : 'bg-blue-50 border-blue-300 text-blue-800'
                    }`}>
                      <span className="mr-2">
                        {hint.type === 'success' ? '✅' : hint.type === 'warning' ? '⚠️' : '💡'}
                      </span>
                      {hint.hint}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {/* Show hint for current transcript if typing */}
          {showHints && currentTranscript && (
            <div className="flex justify-end animate-in fade-in">
              <div className="max-w-[80%] rounded-xl px-4 py-2 text-xs font-medium shadow-sm border-2 bg-blue-50 border-blue-300 text-blue-800">
                <span className="mr-2">💡</span>
                {(() => {
                  const userMessages = messages.filter(m => m.role === 'user');
                  const conversationTurn = userMessages.length;
                  const transcript = currentTranscript.toLowerCase();
                  
                  if (transcript.includes('you should') || transcript.includes('why don\'t you')) {
                    return 'Remember: Listen first, don\'t jump to solutions yet';
                  }
                  if (transcript.includes('what') || transcript.includes('tell me')) {
                    return 'Great - asking questions to understand more!';
                  }
                  if (conversationTurn === 0) {
                    return 'Focus on listening and understanding how they feel';
                  }
                  if (conversationTurn === 1) {
                    return 'Step 2: Validate the emotion - name it and explain why it makes sense';
                  }
                  return 'Keep validating their emotions';
                })()}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}

