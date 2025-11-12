'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioRecorderService } from '@/lib/speechRecognition';

interface PartnerDescriptionProps {
  onContinue: (partnerDescription: string) => void;
}

export default function PartnerDescription({ onContinue }: PartnerDescriptionProps) {
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useVoice, setUseVoice] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const audioServiceRef = useRef<AudioRecorderService | null>(null);
  const stopRecordingRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    const service = new AudioRecorderService();
    audioServiceRef.current = service;
    setIsSupported(service.isAvailable());

    return () => {
      // Use abort() for cleanup - it safely handles cases where MediaRecorder isn't initialized
      service.abort();
    };
  }, []);

  const stopRecording = useCallback(async () => {
    if (!audioServiceRef.current || !isRecording) return;

    setIsRecording(false);
    setIsTranscribing(true);

    try {
      const audioBlob = await audioServiceRef.current.stop();
      
      // Send audio to server for transcription
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to transcribe audio');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.message || data.error);
      }

      // Populate the textarea with transcribed text
      if (data.transcript) {
        setDescription(prev => {
          // Append to existing text if any, otherwise replace
          const newText = prev.trim() ? `${prev} ${data.transcript}` : data.transcript;
          return newText;
        });
        // Keep voice mode active so user can continue recording if needed
      }
    } catch (error) {
      console.error('Transcription error:', error);
      alert(error instanceof Error ? error.message : 'Failed to transcribe audio');
    } finally {
      setIsTranscribing(false);
    }
  }, [isRecording]);

  // Store stopRecording in ref so it can be accessed from the silence callback
  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  const startRecording = async () => {
    if (!audioServiceRef.current) return;

    try {
      // Pass callback for automatic silence detection
      await audioServiceRef.current.start(() => {
        // Automatically stop recording when silence is detected
        if (stopRecordingRef.current) {
          stopRecordingRef.current();
        }
      });
      setIsRecording(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
      alert(errorMessage);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 10) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onContinue(description.trim());
    } catch (error) {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-gray-100 animate-in fade-in slide-in-from-bottom-5">
      <div className="space-y-3">
        <h2 className="text-3xl font-extrabold text-gray-900 leading-tight">Describe Your Partner</h2>
        <p className="text-gray-600 text-lg">
          Tell us about the person you'll be practicing with. We'll create a realistic scenario based on your description.
        </p>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200 shadow-sm">
        <p className="text-sm font-bold text-blue-900 mb-2 uppercase tracking-wide">What to include:</p>
        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
          <li>Their age and relationship to you (partner, friend, family member, etc.)</li>
          <li>Life situation (work, family, living situation, etc.)</li>
          <li>Personality traits and communication style</li>
          <li>Any relevant context that would help create an authentic scenario</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="partner-description" className="block text-sm font-semibold text-gray-700">
              Partner Description
            </label>
            {isSupported && (
              <button
                type="button"
                onClick={() => {
                  setUseVoice(!useVoice);
                  if (isRecording && stopRecordingRef.current) {
                    stopRecordingRef.current();
                  }
                }}
                className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all ${
                  useVoice 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {useVoice ? '🎤 Voice Mode' : 'Use Voice'}
              </button>
            )}
          </div>
          
          <div className="space-y-3">
            {useVoice && isSupported && (
              <div className="space-y-3 pb-3 border-b border-gray-200">
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isTranscribing}
                    className={`
                      px-8 py-4 rounded-full text-white font-bold text-base
                      transition-all duration-200 transform hover:scale-105 active:scale-95
                      focus:outline-none focus:ring-4 focus:ring-opacity-50 shadow-lg hover:shadow-xl
                      ${isRecording 
                        ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 animate-pulse' 
                        : isTranscribing
                        ? 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700'
                        : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700'
                      }
                      ${isTranscribing ? 'opacity-50 cursor-not-allowed transform-none' : ''}
                    `}
                  >
                    {isTranscribing ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-white rounded-full animate-spin border-2 border-white border-t-transparent"></span>
                        Transcribing...
                      </span>
                    ) : isRecording ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
                        Stop Recording
                      </span>
                    ) : (
                      '🎤 Start Recording'
                    )}
                  </button>
                </div>
                {isRecording && (
                  <p className="text-sm text-gray-600 text-center animate-pulse">
                    Recording... (will stop automatically after 2.5 seconds of silence)
                  </p>
                )}
                {isTranscribing && (
                  <p className="text-sm text-gray-600 text-center">
                    Processing your speech...
                  </p>
                )}
              </div>
            )}
            <textarea
              id="partner-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., My partner is in their mid-30s, we've been together for 5 years, they're usually very patient but get overwhelmed when dealing with our toddler in public..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900 bg-white shadow-sm transition-all duration-200"
              rows={6}
              required
              minLength={10}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Minimum 10 characters. Be as specific as you'd like - this helps create a more realistic practice session.
          </p>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={description.trim().length < 10 || isSubmitting}
            className="flex-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isSubmitting ? 'Generating Scenario...' : 'Generate Scenario'}
          </button>
        </div>
      </form>
    </div>
  );
}

