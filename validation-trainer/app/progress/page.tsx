'use client';

import { useState, useEffect } from 'react';
import { UserProgress } from '@/types/validation';

export default function ProgressPage() {
  const [progress, setProgress] = useState<UserProgress | null>(null);

  useEffect(() => {
    // Load progress from localStorage
    const saved = localStorage.getItem('validation-progress');
    if (saved) {
      try {
        setProgress(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading progress:', e);
      }
    }
  }, []);

  if (!progress || progress.totalSessions === 0) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Your Progress</h1>
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-600 text-lg">
              No practice sessions yet. Start practicing to track your progress!
            </p>
            <a
              href="/"
              className="mt-6 inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Start Practicing
            </a>
          </div>
        </div>
      </main>
    );
  }

  const topMistakes = Object.entries(progress.commonMistakes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold text-gray-900">Your Progress</h1>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-sm font-semibold text-gray-600 uppercase">Total Sessions</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{progress.totalSessions}</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-sm font-semibold text-gray-600 uppercase">Current Streak</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{progress.currentStreak} days</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-sm font-semibold text-gray-600 uppercase">Average Score</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {Math.round(progress.averageScore)}/100
            </p>
          </div>
        </div>

        {/* Common Mistakes */}
        {topMistakes.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Areas to Focus On</h2>
            <ul className="space-y-2">
              {topMistakes.map(([mistake, count]) => (
                <li key={mistake} className="flex justify-between items-center">
                  <span className="text-gray-700">{mistake}</span>
                  <span className="text-red-600 font-semibold">{count} times</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recent Sessions */}
        {progress.sessions.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Sessions</h2>
            <div className="space-y-3">
              {progress.sessions.slice(-5).reverse().map((session) => (
                <div
                  key={session.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{session.scenarioTitle}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(session.startTime).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {session.feedback.overallScore}/100
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

