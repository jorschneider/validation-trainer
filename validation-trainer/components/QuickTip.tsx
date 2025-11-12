'use client';

import { useState, useEffect } from 'react';

const tips = [
  {
    title: "Listen First, Fix Later",
    tip: "Your first response should focus on understanding, not solving. Ask questions, show empathy, and save advice for later."
  },
  {
    title: "Name the Emotion",
    tip: "Identify the specific emotion: frustrated, exhausted, excited, worried. Don't just say 'upset' or 'good'."
  },
  {
    title: "Justify the Feeling",
    tip: "Show why the emotion makes sense: 'I don't blame you for being frustrated, especially since...' or 'Of course you're excited after working so hard on this.'"
  },
  {
    title: "Use 'And' not 'But'",
    tip: "'But' negates everything before it. Try: 'I understand AND here's what I'm thinking' instead of 'I understand BUT...'"
  },
  {
    title: "Ask Permission for Advice",
    tip: "Before giving advice, ask: 'How can I help?' or 'Would you like my thoughts?' Most of the time, people just need to be heard."
  },
  {
    title: "Avoid 'Don't Worry'",
    tip: "Phrases like 'don't worry', 'it could be worse', or 'you'll be fine' dismiss feelings. Validate the worry instead."
  },
  {
    title: "Match Her Energy",
    tip: "If she's excited, be excited with her. If she's sad, speak softly and compassionately. Energy matching shows you're connected."
  },
  {
    title: "Micro Validations Matter",
    tip: "Small phrases like 'Wow', 'That makes sense', 'I can see that', 'Really?' show you're engaged and understanding."
  },
  {
    title: "You Can Validate and Disagree",
    tip: "You don't have to agree to validate. Focus on understanding her perspective: 'I can see why you'd feel that way given the situation.'"
  },
  {
    title: "It's Not About Fixing",
    tip: "She's not broken and doesn't need to be fixed. She needs to feel heard, understood, and supported."
  }
];

interface QuickTipProps {
  onDismiss?: () => void;
}

export default function QuickTip({ onDismiss }: QuickTipProps) {
  const [currentTip, setCurrentTip] = useState(tips[0]);

  useEffect(() => {
    // Show a random tip each time the component mounts
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    setCurrentTip(randomTip);
  }, []);

  return (
    <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-300 rounded-2xl p-6 mb-6 shadow-lg animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full p-2 shadow-md">
              <span className="text-2xl">💡</span>
            </div>
            <h3 className="text-xl font-extrabold text-gray-900">Today's Focus: {currentTip.title}</h3>
          </div>
          <p className="text-gray-700 leading-relaxed text-base ml-12">{currentTip.tip}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors hover:bg-white/50 rounded-full p-1"
            aria-label="Dismiss tip"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

