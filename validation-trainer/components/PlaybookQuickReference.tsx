'use client';

import { useState } from 'react';
import { fourStepMethod, commonMistakes, microValidationPhrases } from '@/lib/playbookData';

export default function PlaybookQuickReference() {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors flex items-center justify-between border-b border-gray-200"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">📖</span>
          <span className="font-bold text-gray-900">Validation Quick Reference</span>
        </div>
        <span className="text-gray-600 text-sm">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
          {/* Four Steps - Condensed */}
          <div className="space-y-3">
            <div className="border-l-4 border-blue-500 pl-3">
              <h4 className="font-semibold text-sm text-gray-900 mb-1">
                1. {fourStepMethod.step1.title}
              </h4>
              <ul className="text-xs text-gray-700 space-y-0.5">
                <li>• Give full attention</li>
                <li>• Match their energy</li>
                <li>• Use micro validations</li>
                <li>• Ask questions</li>
                <li>• Don't try to fix</li>
              </ul>
            </div>

            <div className="border-l-4 border-green-500 pl-3">
              <h4 className="font-semibold text-sm text-gray-900 mb-1">
                2. {fourStepMethod.step2.title}
              </h4>
              <ul className="text-xs text-gray-700 space-y-0.5">
                <li>• Name the specific emotion</li>
                <li>• Explain why it makes sense</li>
                <li>• Still don't try to fix</li>
              </ul>
            </div>

            <div className="border-l-4 border-yellow-500 pl-3">
              <h4 className="font-semibold text-sm text-gray-900 mb-1">
                3. {fourStepMethod.step3.title}
              </h4>
              <ul className="text-xs text-gray-700 space-y-0.5">
                <li>• Ask permission first</li>
                <li>• Use "AND" not "BUT"</li>
                <li>• Use "I" statements</li>
              </ul>
            </div>

            <div className="border-l-4 border-purple-500 pl-3">
              <h4 className="font-semibold text-sm text-gray-900 mb-1">
                4. {fourStepMethod.step4.title}
              </h4>
              <ul className="text-xs text-gray-700 space-y-0.5">
                <li>• Re-validate their feelings</li>
                <li>• Thank them for sharing</li>
              </ul>
            </div>
          </div>

          {/* Quick Phrases */}
          <div className="pt-3 border-t border-gray-200">
            <h4 className="font-semibold text-sm text-blue-700 mb-2">Quick Phrases:</h4>
            <div className="flex flex-wrap gap-1.5">
              {microValidationPhrases.slice(0, 12).map((phrase, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
                >
                  {phrase}
                </span>
              ))}
            </div>
          </div>

          {/* Common Mistakes - Condensed */}
          <div className="pt-3 border-t border-gray-200">
            <h4 className="font-semibold text-sm text-red-700 mb-2">Avoid:</h4>
            <ul className="text-xs text-gray-700 space-y-0.5">
              {commonMistakes.slice(0, 5).map((mistake, index) => (
                <li key={index}>• {mistake}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

