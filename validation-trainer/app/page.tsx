'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Scenario, ConversationMessage, ValidationFeedback } from '@/types/validation';
import scenariosData from '@/data/scenarios.json';
import ScenarioDisplay from '@/components/ScenarioDisplay';
import PartnerDescription from '@/components/PartnerDescription';
import VoiceRecorder from '@/components/VoiceRecorder';
import ConversationThread from '@/components/ConversationThread';
import FeedbackPanel from '@/components/FeedbackPanel';
import LiveHints from '@/components/LiveHints';
import QuickTip from '@/components/QuickTip';
import PlaybookQuickReference from '@/components/PlaybookQuickReference';
import { ToastContainer } from '@/components/Toast';
import { generatePartnerResponse, generatePartnerResponseStream, analyzeValidationResponse } from '@/lib/openai';
import { analyzeResponse } from '@/lib/validationAnalyzer';
import { addSessionToProgress, saveProgress, createSession } from '@/lib/progress';
import { toast } from '@/lib/toast';

type SessionState = 'describing_partner' | 'scenario_generated' | 'active' | 'analyzing' | 'reviewing';

export default function Home() {
  const [scenarios] = useState<Scenario[]>(scenariosData.scenarios as Scenario[]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>('describing_partner');
  const [partnerDescription, setPartnerDescription] = useState<string>('');
  const [isGeneratingScenario, setIsGeneratingScenario] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [feedback, setFeedback] = useState<ValidationFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }>>([]);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [showHints, setShowHints] = useState(true);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const lastSpokenRef = useRef<string | null>(null);
  const streamingMessageIdRef = useRef<number | null>(null);
  const accumulatedTextRef = useRef<string>('');
  const sentenceBufferRef = useRef<string>('');

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const synth = window.speechSynthesis;
    synthRef.current = synth;

    const selectVoice = () => {
      if (!synthRef.current) {
        return;
      }

      const voices = synthRef.current.getVoices();
      if (!voices || voices.length === 0) {
        return;
      }

      // Prioritize neural/natural voices for better quality
      const neuralVoiceNames = [
        'Microsoft Aria Online (Natural) - English (United States)',
        'Microsoft Jenny Online (Natural) - English (United States)',
        'Microsoft Aria - English (United States)',
        'Microsoft Jenny - English (United States)',
        'Microsoft Zira - English (United States)',
        'Google US English',
        'Google UK English Female',
        'Google UK English Male',
        'en-US-Neural2-A',
        'en-US-Neural2-B',
        'en-US-Neural2-C',
        'en-US-Neural2-D',
        'en-US-Neural2-E',
        'en-US-Neural2-F',
        'en-US-Neural2-G',
        'en-US-Neural2-H',
        'en-US-Neural2-I',
        'en-US-Neural2-J',
      ];

      // First try to find a neural/natural voice
      let selectedVoice = neuralVoiceNames
        .map((name) => voices.find((voice) => voice.name === name))
        .find((voice) => voice);

      // If no exact match, look for voices with "neural", "natural", or "premium" in the name
      if (!selectedVoice) {
        selectedVoice = voices.find(
          (voice) =>
            voice.lang.toLowerCase().startsWith('en') &&
            (/neural|natural|premium|enhanced|aria|jenny/i.test(voice.name) ||
              (voice.name.includes('Online') && voice.name.includes('Natural')))
        );
      }

      // Fallback to high-quality macOS voices (Samantha, Victoria are quite natural)
      if (!selectedVoice) {
        const macosVoices = ['Samantha', 'Victoria', 'Allison', 'Susan'];
        selectedVoice = macosVoices
          .map((name) => voices.find((voice) => voice.name === name))
          .find((voice) => voice);
      }

      // Fallback to any English female voice
      if (!selectedVoice) {
        selectedVoice = voices.find(
          (voice) =>
            voice.lang.toLowerCase().startsWith('en') &&
            /female|woman|girl|aria|samantha|victoria|jenny|allison|amy|emma|zoe|susan/i.test(voice.name)
        );
      }

      // Final fallback to any English voice
      if (!selectedVoice) {
        selectedVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith('en'));
      }

      // Absolute fallback
      voiceRef.current = selectedVoice ?? voices[0] ?? null;
    };

    const handleVoicesChanged = () => {
      selectVoice();
    };

    // Try to select voice immediately
    selectVoice();
    
    // Sometimes voices aren't loaded immediately, so wait a bit and try again
    const timeoutId = setTimeout(() => {
      selectVoice();
    }, 100);

    synth.addEventListener('voiceschanged', handleVoicesChanged);

    return () => {
      synth.removeEventListener('voiceschanged', handleVoicesChanged);
      synth.cancel();
      clearTimeout(timeoutId);
    };
  }, []);

  // Helper function to speak a sentence
  const speakSentence = useCallback((sentence: string) => {
    if (!synthRef.current || !sentence.trim()) return;
    
    const utterance = new SpeechSynthesisUtterance(sentence.trim());
    
    if (voiceRef.current) {
      utterance.voice = voiceRef.current;
    }
    
    utterance.pitch = 1.0;
    utterance.rate = 1.2;
    utterance.volume = 1;
    
    synthRef.current.speak(utterance);
  }, []);

  // Helper function to process streaming chunks and speak complete sentences
  const processStreamingChunk = useCallback((chunk: string, messageId: number) => {
    // Update the message content in real-time
    setMessages((prev) => {
      const updated = [...prev];
      // Find the LAST partner message with this exact timestamp (most recent one)
      let messageIndex = -1;
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].role === 'partner' && updated[i].timestamp === messageId) {
          messageIndex = i;
          break;
        }
      }
      
      if (messageIndex >= 0) {
        // Ensure we're only updating partner messages, and verify the role
        const targetMessage = updated[messageIndex];
        if (targetMessage.role === 'partner' && targetMessage.timestamp === messageId) {
          // Safety check: if the current content matches a user message, log a warning
          const userMessages = updated.filter(msg => msg.role === 'user');
          const matchesUserMessage = userMessages.some(msg => 
            msg.content.trim() && targetMessage.content.includes(msg.content.trim())
          );
          if (matchesUserMessage && targetMessage.content.length > 0) {
            console.warn('Warning: Partner message content appears to match a user message!', {
              partnerContent: targetMessage.content,
              messageId
            });
          }
          
          updated[messageIndex] = {
            ...targetMessage,
            content: targetMessage.content + chunk,
          };
        } else {
          console.error('Message role/timestamp mismatch!', {
            expectedRole: 'partner',
            expectedTimestamp: messageId,
            actualRole: targetMessage.role,
            actualTimestamp: targetMessage.timestamp
          });
        }
      } else {
        console.warn(`Could not find partner message with timestamp ${messageId}`);
      }
      
      return updated;
    });
    
    // Accumulate text and detect sentence boundaries
    sentenceBufferRef.current += chunk;
    accumulatedTextRef.current += chunk;
    
    // Detect sentence endings (., !, ? followed by space or end of string)
    // Also handle cases where sentence ends at the end of the buffer
    const sentenceEndRegex = /([.!?])(\s+|$)/g;
    let match;
    let lastIndex = 0;
    
    while ((match = sentenceEndRegex.exec(sentenceBufferRef.current)) !== null) {
      const sentenceEnd = match.index + match[0].length;
      const sentence = sentenceBufferRef.current.substring(0, sentenceEnd).trim();
      
      if (sentence) {
        speakSentence(sentence);
      }
      
      lastIndex = sentenceEnd;
    }
    
    // Remove processed sentences from buffer
    if (lastIndex > 0) {
      sentenceBufferRef.current = sentenceBufferRef.current.substring(lastIndex);
    }
  }, [speakSentence]);

  useEffect(() => {
    if (!synthRef.current || messages.length === 0) {
      return;
    }

    const latestMessage = messages[messages.length - 1];
    if (latestMessage.role !== 'partner' || !latestMessage.content.trim()) {
      return;
    }

    // Only speak if this is not a streaming message (streaming messages are spoken sentence by sentence)
    if (streamingMessageIdRef.current === latestMessage.timestamp) {
      return;
    }

    const messageKey = `${latestMessage.timestamp}-${latestMessage.content}`;
    if (lastSpokenRef.current === messageKey) {
      return;
    }

    lastSpokenRef.current = messageKey;

    const utterance = new SpeechSynthesisUtterance(latestMessage.content);

    if (voiceRef.current) {
      utterance.voice = voiceRef.current;
    }

    // More natural prosody settings
    // Pitch: 1.0 is default, slightly lower can sound more natural
    utterance.pitch = 1.0;
    // Rate: 1.2 is faster than normal for quicker speech
    utterance.rate = 1.2;
    utterance.volume = 1;

    synthRef.current.cancel();
    synthRef.current.speak(utterance);
  }, [messages]);

  // Select random scenario on mount
  useEffect(() => {
    if (scenarios.length > 0 && !selectedScenario) {
      const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
      setSelectedScenario(randomScenario);
    }
  }, [scenarios, selectedScenario]);

  // Subscribe to toast notifications
  useEffect(() => {
    const unsubscribe = toast.subscribe((newToasts) => {
      setToasts(newToasts);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Update session duration timer
  useEffect(() => {
    if (!sessionStartTime || sessionState !== 'active') {
      setSessionDuration(0);
      return;
    }

    const interval = setInterval(() => {
      setSessionDuration(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStartTime, sessionState]);

  const handlePartnerDescription = async (description: string) => {
    setPartnerDescription(description);
    setIsGeneratingScenario(true);
    
    try {
      const response = await fetch('/api/generate-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerDescription: description }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to generate scenario');
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.message || data.error);
      }

      setSelectedScenario(data.scenario);
      setSessionState('scenario_generated');
      setIsGeneratingScenario(false);
      toast.success('Scenario generated! Review it and start when ready.');
    } catch (error) {
      console.error('Error generating scenario:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setIsGeneratingScenario(false);
      toast.error(`Failed to generate scenario: ${errorMessage}`);
      throw error; // Re-throw so component can handle it
    }
  };

  const startSession = async () => {
    if (!selectedScenario) return;
    setSessionState('active');
    setSessionStartTime(Date.now());
    setCurrentTranscript('');
    setFeedback(null);
    setIsLoading(true);
    
    // Reset streaming state
    streamingMessageIdRef.current = null;
    accumulatedTextRef.current = '';
    sentenceBufferRef.current = '';
    
    try {
      // Create placeholder message for streaming
      // Use a unique ID to avoid collisions (timestamp + microsecond precision)
      const messageId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
      streamingMessageIdRef.current = messageId;
      
      const partnerMessage: ConversationMessage = {
        role: 'partner',
        content: '',
        timestamp: messageId,
      };
      
      setMessages([partnerMessage]);
      
      // Stream the partner's opening
      await generatePartnerResponseStream(
        selectedScenario,
        [], // Empty conversation history
        '', // No user response yet - partner is starting
        partnerDescription,
        (chunk) => {
          processStreamingChunk(chunk, messageId);
        },
        (fullResponse, validationQuality) => {
          // Finalize the message
          setMessages((prev) => {
            const updated = [...prev];
            // Find the LAST partner message with this exact timestamp
            let messageIndex = -1;
            for (let i = updated.length - 1; i >= 0; i--) {
              if (updated[i].role === 'partner' && updated[i].timestamp === messageId) {
                messageIndex = i;
                break;
              }
            }
            if (messageIndex >= 0) {
              const targetMessage = updated[messageIndex];
              // Double-check we're updating the right message
              if (targetMessage.role === 'partner' && targetMessage.timestamp === messageId) {
                updated[messageIndex] = {
                  ...targetMessage,
                  content: fullResponse,
                };
              }
            } else {
              console.warn(`Could not find partner message with timestamp ${messageId} to finalize`);
            }
            return updated;
          });
          
          // Speak any remaining text in the buffer
          if (sentenceBufferRef.current.trim()) {
            speakSentence(sentenceBufferRef.current);
            sentenceBufferRef.current = '';
          }
          
          streamingMessageIdRef.current = null;
          setIsLoading(false);
          toast.success('Session started! Your partner has begun the conversation.');
        },
        (error) => {
          console.error('Error generating partner opening:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          toast.error(`Failed to start conversation: ${errorMessage}`);
          setMessages([]);
          streamingMessageIdRef.current = null;
          setIsLoading(false);
        }
      );
    } catch (error) {
      console.error('Error starting session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to start conversation: ${errorMessage}`);
      setMessages([]);
      setIsLoading(false);
    }
  };

  const handleTranscript = async (text: string, isFinal: boolean) => {
    setCurrentTranscript(text);

    if (isFinal && text.trim()) {
      setIsLoading(true);
      
      // Add user's message
      const userMessage: ConversationMessage = {
        role: 'user',
        content: text,
        timestamp: Date.now(),
      };
      
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setCurrentTranscript('');

      // Reset streaming state
      streamingMessageIdRef.current = null;
      accumulatedTextRef.current = '';
      sentenceBufferRef.current = '';

      try {
        // Create placeholder message for streaming
        // Use a unique ID to avoid collisions (timestamp + microsecond precision)
        const messageId = Date.now() * 1000 + Math.floor(Math.random() * 1000);
        streamingMessageIdRef.current = messageId;

        const partnerMessage: ConversationMessage = {
          role: 'partner',
          content: '',
          timestamp: messageId,
        };

        setMessages([...updatedMessages, partnerMessage]);
        
        // Stream the partner's response
        await generatePartnerResponseStream(
            selectedScenario!,
            updatedMessages,
          text,
          partnerDescription,
          (chunk) => {
            processStreamingChunk(chunk, messageId);
          },
          (fullResponse, validationQuality) => {
            // Finalize the message
            setMessages((prev) => {
              const updated = [...prev];
              // Find the LAST partner message with this exact timestamp
              let messageIndex = -1;
              for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].role === 'partner' && updated[i].timestamp === messageId) {
                  messageIndex = i;
                  break;
                }
              }
              if (messageIndex >= 0) {
                const targetMessage = updated[messageIndex];
                // Double-check we're updating the right message
                if (targetMessage.role === 'partner' && targetMessage.timestamp === messageId) {
                  updated[messageIndex] = {
                    ...targetMessage,
                    content: fullResponse,
                  };
                }
              } else {
                console.warn(`Could not find partner message with timestamp ${messageId} to finalize`);
              }
              return updated;
            });
            
            // Speak any remaining text in the buffer
            if (sentenceBufferRef.current.trim()) {
              speakSentence(sentenceBufferRef.current);
              sentenceBufferRef.current = '';
            }
            
            streamingMessageIdRef.current = null;
            setIsLoading(false);
          },
          (error) => {
            console.error('Error processing response:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            streamingMessageIdRef.current = null;
            setIsLoading(false);
            
            // Retry with non-streaming fallback
            generatePartnerResponse(
              selectedScenario!,
              updatedMessages,
              text,
              partnerDescription
            ).then((partnerResponse) => {
              const fallbackMessage: ConversationMessage = {
            role: 'partner',
            content: partnerResponse,
            timestamp: Date.now(),
          };
              setMessages([...updatedMessages, fallbackMessage]);
            }).catch((retryError) => {
          console.error('Retry also failed:', retryError);
              toast.error('Failed to get partner response. Please try again.');
            });
          }
        );
      } catch (error) {
        // This catch handles synchronous errors from generatePartnerResponseStream
        // Streaming errors are handled in the onError callback
        console.error('Error initiating stream:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        streamingMessageIdRef.current = null;
        setIsLoading(false);
        toast.error(`Failed to start response stream: ${errorMessage}`);
      }
    }
  };

  const endSession = async () => {
    if (!selectedScenario || messages.length === 0) {
      toast.warning('No session data to save. Please have a conversation first.');
      return;
    }

    setIsLoading(true);
    
    try {
      // Analyze all user's responses from the conversation
      const userResponses = messages.filter(m => m.role === 'user');
      if (userResponses.length === 0) {
        toast.warning('No responses to analyze. Please have a conversation first.');
        setIsLoading(false);
        return;
      }

      // Get the last response for detailed analysis
      const lastResponse = userResponses[userResponses.length - 1];
      const conversationTurn = userResponses.length;

      // Analyze the last response - retry up to 3 times if it fails
      let analysis;
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          analysis = await analyzeValidationResponse(
            lastResponse.content,
            selectedScenario!,
            messages
          );
          break; // Success, exit retry loop
        } catch (analysisError) {
          retries++;
          if (retries >= maxRetries) {
            // Final retry failed, throw the error
            throw analysisError;
          }
          // Wait a bit before retrying (exponential backoff, but faster)
          await new Promise(resolve => setTimeout(resolve, 500 * retries));
        }
      }

      if (!analysis) {
        throw new Error('Failed to analyze response after retries');
      }

      // Combine local and AI analysis
      const localAnalysis = analyzeResponse(
        lastResponse.content, 
        selectedScenario!.emotions, 
        conversationTurn
      );
      
      // Calculate weighted average score: 70% AI analysis (more context-aware) + 30% local analysis (rule-based)
      // This gives more weight to the AI's nuanced understanding while still considering the rule-based checks
      const aiScore = analysis.score || 0;
      const localScore = localAnalysis.overallScore || 0;
      const combinedScore = Math.round((aiScore * 0.7) + (localScore * 0.3));
      
      const combinedFeedback: ValidationFeedback = {
        ...localAnalysis,
        modelResponse: analysis.modelResponse,
        positives: [...localAnalysis.positives, ...analysis.positives],
        mistakes: [...localAnalysis.mistakes, ...analysis.mistakes],
        suggestions: [...localAnalysis.suggestions, ...analysis.suggestions],
        overallScore: Math.min(100, Math.max(0, combinedScore)), // Ensure score is between 0-100
      };

      setFeedback(combinedFeedback);

      // Save session to progress
      const session = createSession(
        selectedScenario.id,
        selectedScenario.title,
        messages,
        combinedFeedback,
        sessionStartTime || undefined
      );
      const updatedProgress = addSessionToProgress(session);
      saveProgress(updatedProgress);
      
      setSessionState('reviewing');
      toast.success('Session complete! Review your feedback below.');
    } catch (error) {
      console.error('Error analyzing or saving session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to analyze session: ${errorMessage}`);
      setSessionState('reviewing');
    } finally {
      setIsLoading(false);
    }
  };

  const resetSession = () => {
    setSessionState('describing_partner');
    setMessages([]);
    setCurrentTranscript('');
    setFeedback(null);
    setSessionStartTime(null);
    setPartnerDescription('');
    setSelectedScenario(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <ToastContainer 
        toasts={toasts} 
        onRemove={(id) => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }} 
      />
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3 pt-4">
          <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2 tracking-tight">
            Validation Practice Trainer
          </h1>
          <p className="text-lg text-gray-600 font-medium">
            Practice validating emotions using the Four-Step Method
          </p>
          <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mx-auto"></div>
        </div>

        {/* Main Content */}
        {sessionState === 'describing_partner' && (
          <>
            {isGeneratingScenario ? (
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-600 font-medium">Generating a personalized scenario based on your partner description...</p>
                </div>
              </div>
            ) : (
              <PartnerDescription
                onContinue={handlePartnerDescription}
              />
            )}
          </>
        )}

        {sessionState === 'scenario_generated' && selectedScenario && (
          <>
            <QuickTip />
            <ScenarioDisplay
              scenario={selectedScenario}
              onStart={startSession}
              onSelectDifferent={() => {
                // Regenerate scenario with same partner description
                handlePartnerDescription(partnerDescription);
              }}
            />
          </>
        )}

        {sessionState === 'active' && selectedScenario && (
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {/* Left Column: Conversation */}
            <div className="space-y-6 order-2 md:order-1 md:col-span-2">
              <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900">Conversation</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowHints(!showHints)}
                    className={`text-xs px-4 py-2 rounded-full font-semibold transition-all duration-200 shadow-sm ${
                      showHints 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:shadow-md hover:scale-105' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={showHints ? 'Hide hints' : 'Show hints'}
                  >
                    💡 {showHints ? 'Hints On' : 'Hints Off'}
                  </button>
                  {sessionStartTime && (
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2 rounded-lg shadow-md">
                      <span className="text-sm font-mono font-semibold">
                        {Math.floor(sessionDuration / 60)}:{(sessionDuration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <ConversationThread 
                messages={messages} 
                showHints={showHints}
                currentTranscript={currentTranscript}
                scenario={selectedScenario}
              />
              
              {currentTranscript && (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-4 animate-in fade-in shadow-md">
                  <p className="text-sm text-amber-900 font-semibold flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
                    Speaking...
                  </p>
                  <p className="text-amber-900 italic break-words leading-relaxed">{currentTranscript}</p>
                </div>
              )}

              <VoiceRecorder
                onTranscript={handleTranscript}
                disabled={isLoading}
                onError={(error) => {
                  // Error message is already user-friendly from speechRecognition.ts
                  toast.error(error);
                }}
              />

              <button
                onClick={endSession}
                className="w-full bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={messages.length <= 1}
                aria-label="End practice session"
              >
                End Session
              </button>
            </div>

            {/* Right Column: Session Info & Playbook */}
            <div className="space-y-4 order-1 md:order-2">
              <PlaybookQuickReference />
              
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Session Info</h2>
              <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-xl p-6 text-center border border-blue-100 animate-in fade-in">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg">
                  💬
                </div>
                <p className="text-gray-700 font-semibold mb-2 text-lg">Focus on the conversation</p>
                <p className="text-sm text-gray-500 mb-4">
                  Feedback will appear after you end the session
                </p>
                <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Responses</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {messages.filter(m => m.role === 'user').length}
                  </p>
                </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {sessionState === 'reviewing' && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-lg">
                  ✓
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Session Complete</h2>
              </div>
              <ConversationThread messages={messages} scenario={selectedScenario} />
            </div>
            {feedback && (
              <FeedbackPanel feedback={feedback} conversationTurn={Math.floor(messages.filter(m => m.role === 'user').length)} />
            )}
            {!feedback && isLoading && (
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/3"></div>
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded"></div>
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-5/6"></div>
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-4/6"></div>
                </div>
                <p className="text-center text-gray-600 mt-6 font-medium">Analyzing your conversation...</p>
              </div>
            )}
            <button
              onClick={resetSession}
              className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              aria-label="Start a new practice session"
              disabled={isLoading}
            >
              Practice Another Scenario
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
