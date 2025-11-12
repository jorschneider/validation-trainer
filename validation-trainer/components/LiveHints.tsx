'use client';

import { ConversationMessage } from '@/types/validation';
import { useState, useEffect } from 'react';

interface LiveHintsProps {
  messages: ConversationMessage[];
  currentTranscript: string;
  enabled: boolean;
}

export default function LiveHints({ messages, currentTranscript, enabled }: LiveHintsProps) {
  const [currentHint, setCurrentHint] = useState<string | null>(null);
  const [hintType, setHintType] = useState<'tip' | 'warning' | 'success'>('tip');

  useEffect(() => {
    if (!enabled) {
      setCurrentHint(null);
      return;
    }

    const userMessages = messages.filter(m => m.role === 'user');
    const conversationTurn = userMessages.length;
    const lastUserMessage = userMessages[userMessages.length - 1]?.content.toLowerCase() || '';
    const transcript = currentTranscript.toLowerCase();

    // First response - encourage listening only
    if (conversationTurn === 0 && transcript) {
      if (transcript.includes('you should') || transcript.includes('why don\'t you')) {
        setHintType('warning');
        setCurrentHint('Remember: Listen first, don\'t jump to solutions yet');
        return;
      }
      if (transcript.includes('what') || transcript.includes('tell me')) {
        setHintType('success');
        setCurrentHint('Great - asking questions to understand more!');
        return;
      }
      setHintType('tip');
      setCurrentHint('Focus on listening and understanding how they feel');
      return;
    }

    // Check recent response for common mistakes
    if (lastUserMessage) {
      // Check for "but"
      if (lastUserMessage.includes(' but ') || lastUserMessage.includes('however')) {
        setHintType('warning');
        setCurrentHint('Try "and" instead of "but" - "but" negates what you said before');
        return;
      }

      // Check for invalidating phrases
      if (lastUserMessage.match(/don't worry|you'll be fine|it could be worse|at least/)) {
        setHintType('warning');
        setCurrentHint('That might feel dismissive. Try validating the emotion instead');
        return;
      }

      // Check for premature advice
      if (conversationTurn === 1 && lastUserMessage.match(/you should|why don't you|have you tried/)) {
        setHintType('warning');
        setCurrentHint('Consider validating first before giving advice');
        return;
      }

      // Check for good validation
      if (lastUserMessage.match(/that makes sense|i don't blame you|i can see why|that sounds/)) {
        setHintType('success');
        setCurrentHint('Nice validation! You\'re acknowledging their feelings');
        return;
      }
    }

    // Default hints based on conversation stage
    if (conversationTurn === 1) {
      setHintType('tip');
      setCurrentHint('Step 2: Validate the emotion - name it and explain why it makes sense');
    } else if (conversationTurn === 2) {
      setHintType('tip');
      setCurrentHint('If offering advice, ask first: "How can I help?" or "Would you like my thoughts?"');
    } else {
      setCurrentHint(null);
    }
  }, [messages, currentTranscript, enabled]);

  if (!enabled || !currentHint) return null;

  const bgColor = 
    hintType === 'success' ? 'bg-green-50 border-green-300' :
    hintType === 'warning' ? 'bg-orange-50 border-orange-300' :
    'bg-blue-50 border-blue-300';

  const icon =
    hintType === 'success' ? '✅' :
    hintType === 'warning' ? '⚠️' :
    '💡';

  const textColor =
    hintType === 'success' ? 'text-green-800' :
    hintType === 'warning' ? 'text-orange-800' :
    'text-blue-800';

  return (
    <div className={`${bgColor} border-2 rounded-xl p-5 transition-all duration-300 shadow-md animate-in fade-in slide-in-from-bottom-2`}>
      <div className="flex items-start gap-4">
        <span className="text-3xl">{icon}</span>
        <div className="flex-1">
          <p className={`text-sm font-semibold ${textColor} leading-relaxed`}>
            {currentHint}
          </p>
        </div>
      </div>
    </div>
  );
}

