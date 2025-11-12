'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioRecorderService } from '@/lib/speechRecognition';

interface VoiceRecorderProps {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ onTranscript, onError, disabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [useTextInput, setUseTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [networkErrorCount, setNetworkErrorCount] = useState(0);
  const audioServiceRef = useRef<AudioRecorderService | null>(null);
  const lastErrorRef = useRef<string | null>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stopRecordingRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    const service = new AudioRecorderService();
    audioServiceRef.current = service;
    setIsSupported(service.isAvailable());

    return () => {
      service.stop();
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  const handleError = useCallback((messageToShow: string) => {
    // Deduplicate errors - only show if it's different from the last error
    // or if enough time has passed (2 seconds)
    const shouldShowError = 
      lastErrorRef.current !== messageToShow || 
      !errorTimeoutRef.current;

    if (shouldShowError) {
      // Clear any existing timeout
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }

      // Show the error
      onError?.(messageToShow);
      lastErrorRef.current = messageToShow;

      // Reset after 2 seconds to allow the same error to show again if it persists
      errorTimeoutRef.current = setTimeout(() => {
        lastErrorRef.current = null;
        errorTimeoutRef.current = null;
      }, 2000);
    }
  }, [onError]);

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

      // Reset error count on success
      setNetworkErrorCount(0);
      
      // Send transcript to parent
      if (data.transcript) {
        onTranscript(data.transcript, true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to transcribe audio';
      const isNetworkError = errorMessage.toLowerCase().includes('network') || 
                           errorMessage.toLowerCase().includes('fetch') ||
                           errorMessage.toLowerCase().includes('failed to transcribe');

      if (isNetworkError) {
        const nextCount = networkErrorCount + 1;
        setNetworkErrorCount(nextCount);
        
        if (nextCount >= 2 && !useTextInput) {
          setUseTextInput(true);
          handleError('Repeated network issues detected. Switched to text input mode automatically.');
          return;
        }
      }

      handleError(errorMessage);
    } finally {
      setIsTranscribing(false);
    }
  }, [isRecording, networkErrorCount, useTextInput, onTranscript, handleError]);

  // Store stopRecording in ref so it can be accessed from the silence callback
  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  const startRecording = async () => {
    if (!audioServiceRef.current || disabled) return;

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
      handleError(errorMessage);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      onTranscript(textInput.trim(), true);
      setTextInput('');
    }
  };

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center gap-4 w-full max-w-md">
        <div className="text-red-500 text-sm text-center mb-2">
          Microphone access not supported. Please type your response below.
        </div>
        <form onSubmit={handleTextSubmit} className="w-full">
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type your validation response here..."
            disabled={disabled}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none text-gray-900 bg-white"
            rows={3}
          />
          <button
            type="submit"
            disabled={disabled || !textInput.trim()}
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Response
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md">
      {!useTextInput ? (
        <>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled || isTranscribing}
            className={`
              px-10 py-5 rounded-full text-white font-bold text-lg
              transition-all duration-200 transform hover:scale-105 active:scale-95
              focus:outline-none focus:ring-4 focus:ring-opacity-50 shadow-lg hover:shadow-xl
              ${isRecording 
                ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 animate-pulse' 
                : isTranscribing
                ? 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700'
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700'
              }
              ${disabled || isTranscribing ? 'opacity-50 cursor-not-allowed transform-none' : ''}
            `}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            aria-pressed={isRecording}
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
              'Press to Speak'
            )}
          </button>
          {isRecording && (
            <p className="text-sm text-gray-600 animate-pulse" aria-live="polite">
              Listening...
            </p>
          )}
          {isTranscribing && (
            <p className="text-sm text-gray-600" aria-live="polite">
              Processing your speech...
            </p>
          )}
          {!isRecording && !isTranscribing && !disabled && (
            <p className="text-xs text-gray-500 text-center">
              Click to start speaking, recording will stop automatically when you're done
            </p>
          )}
          <button
            onClick={() => setUseTextInput(true)}
            disabled={disabled || isRecording || isTranscribing}
            className="text-sm text-blue-600 hover:text-blue-700 underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Or type your response instead
          </button>
          {networkErrorCount > 0 && (
            <p className="text-xs text-yellow-600 text-center">
              Voice recognition had trouble connecting. You can switch to typing if it keeps happening.
            </p>
          )}
        </>
      ) : (
        <div className="w-full space-y-2">
          <form onSubmit={handleTextSubmit} className="w-full">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your validation response here..."
              disabled={disabled}
              className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none text-gray-900 bg-white shadow-sm transition-all duration-200"
              rows={4}
            />
            <div className="flex gap-3 mt-3">
              <button
                type="submit"
                disabled={disabled || !textInput.trim()}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                Submit Response
              </button>
              <button
                type="button"
                onClick={() => {
                  setUseTextInput(false);
                  setTextInput('');
                  setNetworkErrorCount(0);
                }}
                disabled={disabled}
                className="px-6 py-3 bg-white border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                Use Voice
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
