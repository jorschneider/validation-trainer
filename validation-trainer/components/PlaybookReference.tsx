'use client';

import { fourStepMethod, commonMistakes, microValidationPhrases, empathyTips } from '@/lib/playbookData';

export default function PlaybookReference() {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6 max-h-[600px] overflow-y-auto">
      <h2 className="text-2xl font-bold text-gray-900">Four-Step Validation Method</h2>

      {/* Step 1 */}
      <div className="border-l-4 border-blue-500 pl-4">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Step 1: {fourStepMethod.step1.title}
        </h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          {fourStepMethod.step1.principles.map((principle, index) => (
            <li key={index}>{principle}</li>
          ))}
        </ul>
      </div>

      {/* Step 2 */}
      <div className="border-l-4 border-green-500 pl-4">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Step 2: {fourStepMethod.step2.title}
        </h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700 mb-3">
          {fourStepMethod.step2.principles.map((principle, index) => (
            <li key={index}>{principle}</li>
          ))}
        </ul>
        <div className="bg-green-50 p-3 rounded mt-2">
          <p className="text-sm font-semibold text-green-900 mb-1">Examples:</p>
          {fourStepMethod.step2.examples.map((example, index) => (
            <p key={index} className="text-sm text-gray-700 italic">"{example}"</p>
          ))}
        </div>
      </div>

      {/* Step 3 */}
      <div className="border-l-4 border-yellow-500 pl-4">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Step 3: {fourStepMethod.step3.title}
        </h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          {fourStepMethod.step3.principles.map((principle, index) => (
            <li key={index}>{principle}</li>
          ))}
        </ul>
      </div>

      {/* Step 4 */}
      <div className="border-l-4 border-purple-500 pl-4">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Step 4: {fourStepMethod.step4.title}
        </h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          {fourStepMethod.step4.principles.map((principle, index) => (
            <li key={index}>{principle}</li>
          ))}
        </ul>
      </div>

      {/* Common Mistakes */}
      <div>
        <h3 className="text-xl font-semibold text-red-700 mb-2">Common Mistakes to Avoid</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          {commonMistakes.map((mistake, index) => (
            <li key={index}>{mistake}</li>
          ))}
        </ul>
      </div>

      {/* Micro Validations */}
      <div>
        <h3 className="text-xl font-semibold text-blue-700 mb-2">Micro Validation Phrases</h3>
        <div className="flex flex-wrap gap-2">
          {microValidationPhrases.map((phrase, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              "{phrase}"
            </span>
          ))}
        </div>
      </div>

      {/* Empathy Tips */}
      <div>
        <h3 className="text-xl font-semibold text-indigo-700 mb-2">Empathy Tips</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          {empathyTips.map((tip, index) => (
            <li key={index}>{tip}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

