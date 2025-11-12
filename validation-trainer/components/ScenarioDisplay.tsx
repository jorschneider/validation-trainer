'use client';

import { Scenario } from '@/types/validation';

interface ScenarioDisplayProps {
  scenario: Scenario;
  onStart: () => void;
  onSelectDifferent?: () => void;
}

export default function ScenarioDisplay({ scenario, onStart, onSelectDifferent }: ScenarioDisplayProps) {
  const difficultyColors = {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    hard: 'bg-red-100 text-red-800',
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-gray-100 animate-in fade-in slide-in-from-bottom-5">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <h2 className="text-3xl font-extrabold text-gray-900 leading-tight">{scenario.title}</h2>
          <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${difficultyColors[scenario.difficulty]}`}>
            {scenario.difficulty}
          </span>
        </div>
      </div>

      <div className="text-gray-700 space-y-4">
        <p className="text-lg leading-relaxed">{scenario.description}</p>
        <div className="mt-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-sm">
          <p className="text-sm font-bold text-blue-900 mb-3 uppercase tracking-wide">What to expect:</p>
          <p className="text-gray-800 text-base leading-relaxed">
            You'll start the conversation. Your partner might naturally bring up something like: <span className="italic">"{scenario.partnerOpening}"</span>
          </p>
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button
          onClick={onStart}
          className="flex-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-indigo-300"
          aria-label="Start practice session"
        >
          Start Practice Session
        </button>
        {onSelectDifferent && (
          <button
            onClick={onSelectDifferent}
            className="px-6 py-4 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-xl transition-all duration-200 font-semibold text-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-300 transform hover:scale-[1.02] active:scale-[0.98]"
            aria-label="Generate a different scenario"
          >
            Generate Different Scenario
          </button>
        )}
      </div>
    </div>
  );
}

