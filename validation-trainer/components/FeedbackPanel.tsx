'use client';

import { ValidationFeedback } from '@/types/validation';

interface FeedbackPanelProps {
  feedback: ValidationFeedback;
  isLoading?: boolean;
  conversationTurn?: number;
}

function getFourStepGuidance(turn: number) {
  if (turn === 1) {
    return {
      step: 'Step 1: Listen Empathically',
      color: 'blue',
      guidance: 'Focus on understanding. Ask questions. Use micro validations like "Really?", "Tell me more", "That sounds tough".'
    };
  } else if (turn === 2) {
    return {
      step: 'Step 2: Validate the Emotion',
      color: 'green',
      guidance: 'Name the specific emotion and explain why it makes sense. "I don\'t blame you for being frustrated, especially since..."'
    };
  } else if (turn === 3) {
    return {
      step: 'Step 3: Offer Help (Optional)',
      color: 'yellow',
      guidance: 'If appropriate, ask: "How can I help?" or "Would you like my thoughts?" before giving advice.'
    };
  } else {
    return {
      step: 'Step 4: Validate Again',
      color: 'purple',
      guidance: 'Wrap up with one more validating comment. Thank her for opening up.'
    };
  }
}

const MAX_BULLETS = 3;

function summarizeItems(items: string[]) {
  return {
    visible: items.slice(0, MAX_BULLETS),
    moreCount: Math.max(items.length - MAX_BULLETS, 0),
  };
}

export default function FeedbackPanel({ feedback, isLoading, conversationTurn = 1 }: FeedbackPanelProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  const scoreColor = 
    feedback.overallScore >= 80 ? 'text-green-600' :
    feedback.overallScore >= 60 ? 'text-yellow-600' :
    'text-red-600';
  
  const stepGuidance = getFourStepGuidance(conversationTurn);
  const stepColorClasses = {
    blue: 'bg-blue-50 border-blue-300 text-blue-800',
    green: 'bg-green-50 border-green-300 text-green-800',
    yellow: 'bg-yellow-50 border-yellow-300 text-yellow-800',
    purple: 'bg-purple-50 border-purple-300 text-purple-800',
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8 animate-in fade-in slide-in-from-right-5 border border-gray-100">
      {/* Four-Step Method Context */}
      <div className={`${stepColorClasses[stepGuidance.color as keyof typeof stepColorClasses]} border-2 rounded-xl p-5 shadow-sm`}>
        <h4 className="font-bold text-base mb-2">{stepGuidance.step}</h4>
        <p className="text-sm opacity-90 leading-relaxed">{stepGuidance.guidance}</p>
      </div>
      
      <div className="flex items-center justify-between border-b-2 border-gray-100 pb-6">
        <h3 className="text-3xl font-extrabold text-gray-900">Feedback</h3>
        <div className={`text-4xl font-black ${scoreColor} transition-colors duration-300 bg-gradient-to-br from-white to-gray-50 px-6 py-3 rounded-xl shadow-md border-2 ${scoreColor.includes('green') ? 'border-green-200' : scoreColor.includes('yellow') ? 'border-yellow-200' : 'border-red-200'}`}>
          {feedback.overallScore}/100
        </div>
      </div>

      {/* Score visualization */}
      <div className="space-y-2">
        <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner overflow-hidden">
          <div
            className={`h-4 rounded-full transition-all duration-700 shadow-lg ${
              feedback.overallScore >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
              feedback.overallScore >= 60 ? 'bg-gradient-to-r from-yellow-500 to-amber-500' :
              'bg-gradient-to-r from-red-500 to-rose-500'
            }`}
            style={{ width: `${feedback.overallScore}%` }}
            role="progressbar"
            aria-valuenow={feedback.overallScore}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {feedback.positives.length > 0 && (() => {
        const { visible, moreCount } = summarizeItems(feedback.positives);
        return (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-200 shadow-sm">
            <h4 className="text-xl font-bold text-green-800 mb-3 flex items-center gap-2">
              <span className="text-2xl">✅</span> What You Did Well
            </h4>
            <ul className="list-disc list-inside space-y-2 text-gray-800 ml-2">
              {visible.map((positive, index) => (
                <li key={index} className="leading-relaxed">{positive}</li>
              ))}
            </ul>
            {moreCount > 0 && (
              <p className="text-xs text-green-700 mt-3 font-semibold bg-white/60 px-3 py-1 rounded-full inline-block">+{moreCount} more strengths detected</p>
            )}
          </div>
        );
      })()}

      {feedback.mistakes.length > 0 && (() => {
        const { visible, moreCount } = summarizeItems(feedback.mistakes);
        return (
          <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-5 border-2 border-red-200 shadow-sm">
            <h4 className="text-xl font-bold text-red-800 mb-3 flex items-center gap-2">
              <span className="text-2xl">❌</span> Areas to Improve
            </h4>
            <ul className="list-disc list-inside space-y-2 text-gray-800 ml-2">
              {visible.map((mistake, index) => (
                <li key={index} className="leading-relaxed">{mistake}</li>
              ))}
            </ul>
            {moreCount > 0 && (
              <p className="text-xs text-red-700 mt-3 font-semibold bg-white/60 px-3 py-1 rounded-full inline-block">+{moreCount} more things to revisit</p>
            )}
          </div>
        );
      })()}

      {feedback.suggestions.length > 0 && (() => {
        const { visible, moreCount } = summarizeItems(feedback.suggestions);
        return (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-200 shadow-sm">
            <h4 className="text-xl font-bold text-blue-800 mb-3 flex items-center gap-2">
              <span className="text-2xl">💡</span> Suggestions
            </h4>
            <ul className="list-disc list-inside space-y-2 text-gray-800 ml-2">
              {visible.map((suggestion, index) => (
                <li key={index} className="leading-relaxed">{suggestion}</li>
              ))}
            </ul>
            {moreCount > 0 && (
              <p className="text-xs text-blue-700 mt-3 font-semibold bg-white/60 px-3 py-1 rounded-full inline-block">Showing top tips. +{moreCount} more available in detailed report.</p>
            )}
          </div>
        );
      })()}

      {feedback.modelResponse && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border-2 border-purple-200 shadow-sm">
          <h4 className="text-xl font-bold text-purple-800 mb-3 flex items-center gap-2">
            <span className="text-2xl">📝</span> Model Response
          </h4>
          <div className="bg-white/80 backdrop-blur-sm border-l-4 border-purple-500 p-5 rounded-lg shadow-sm">
            <p className="text-gray-800 italic leading-relaxed">"{feedback.modelResponse}"</p>
          </div>
        </div>
      )}
    </div>
  );
}

