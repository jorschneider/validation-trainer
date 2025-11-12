function getErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    'network': 'Network connection issue. Please check your internet connection and try again.',
    'not-allowed': 'Microphone access denied. Please allow microphone access in your browser settings.',
    'not-found': 'Microphone not found. Please check your microphone connection.',
    'audio-capture': 'Microphone not found or access denied. Please check your microphone permissions.',
  };

  return errorMessages[errorCode] || `Audio recording error: ${errorCode}. Please try again.`;
}

export class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private isSupported: boolean = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private silenceTimer: NodeJS.Timeout | null = null;
  private onSilenceDetected: (() => void) | null = null;
  private isMonitoring: boolean = false;
  private dataArray: Uint8Array | null = null;
  private animationFrameId: number | null = null;

  // Configuration for silence detection
  private readonly SILENCE_THRESHOLD = 30; // Volume threshold (0-255)
  private readonly SILENCE_DURATION_MS = 2500; // 2.5 seconds of silence before auto-stop
  private readonly CHECK_INTERVAL_MS = 50; // Check audio level every 50ms

  constructor() {
    if (typeof window !== 'undefined') {
      // Check if MediaRecorder API is supported
      this.isSupported = !!(
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function' &&
        window.MediaRecorder
      );
    }
  }

  async start(onSilenceDetected?: () => void): Promise<void> {
    if (!this.isSupported) {
      throw new Error('Audio recording not supported in this browser');
    }

    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Set up audio analysis for silence detection
      this.onSilenceDetected = onSilenceDetected || null;
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.3;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);

      // Find the best supported audio format
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/wav',
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        // Fallback to default
        this.mediaRecorder = new MediaRecorder(this.stream);
      } else {
        this.mediaRecorder = new MediaRecorder(this.stream, {
          mimeType: selectedMimeType,
        });
      }

      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
      };

      this.mediaRecorder.start();

      // Start monitoring for silence
      if (this.onSilenceDetected) {
        this.startSilenceMonitoring();
      }
    } catch (error) {
      // Handle permission denied or other errors
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          throw new Error(getErrorMessage('not-allowed'));
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          throw new Error(getErrorMessage('not-found'));
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          throw new Error(getErrorMessage('audio-capture'));
        }
      }
      throw error;
    }
  }

  private startSilenceMonitoring(): void {
    if (!this.analyser || !this.dataArray || this.isMonitoring) return;

    this.isMonitoring = true;
    let silenceStartTime: number | null = null;
    let hasDetectedSpeech = false;

    const checkAudioLevel = () => {
      if (!this.isMonitoring || !this.analyser || !this.dataArray) {
        return;
      }

      if (!this.dataArray) {
        return;
      }
      
      // Use the array directly - TypeScript type issue with Web Audio API
      (this.analyser as any).getByteFrequencyData(this.dataArray);
      
      // Calculate average volume
      const average = this.dataArray.reduce((sum, value) => sum + value, 0) / this.dataArray.length;
      
      // Detect if audio level is above threshold (speech detected)
      if (average > this.SILENCE_THRESHOLD) {
        hasDetectedSpeech = true;
        silenceStartTime = null; // Reset silence timer
      } else if (hasDetectedSpeech && average <= this.SILENCE_THRESHOLD) {
        // We've detected speech before and now we have silence
        if (silenceStartTime === null) {
          silenceStartTime = Date.now();
        } else {
          const silenceDuration = Date.now() - silenceStartTime;
          if (silenceDuration >= this.SILENCE_DURATION_MS && this.onSilenceDetected) {
            // Silence detected for long enough, trigger callback
            this.stopSilenceMonitoring();
            this.onSilenceDetected();
            return;
          }
        }
      }

      // Continue monitoring
      this.animationFrameId = requestAnimationFrame(() => {
        setTimeout(checkAudioLevel, this.CHECK_INTERVAL_MS);
      });
    };

    // Start checking after a brief delay to let the stream stabilize
    setTimeout(checkAudioLevel, 100);
  }

  private stopSilenceMonitoring(): void {
    this.isMonitoring = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  async stop(): Promise<Blob> {
    // Stop silence monitoring first
    this.stopSilenceMonitoring();

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder is not initialized'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        // Create a blob from all chunks
        const audioBlob = new Blob(this.audioChunks, {
          type: this.mediaRecorder?.mimeType || 'audio/webm',
        });

        // Clean up the stream
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
          this.stream = null;
        }

        // Clean up audio context
        if (this.audioContext) {
          this.audioContext.close().catch(console.error);
          this.audioContext = null;
        }

        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.onSilenceDetected = null;

        resolve(audioBlob);
      };

      this.mediaRecorder.onerror = (event) => {
        reject(new Error('Error stopping recording'));
      };

      if (this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      } else {
        reject(new Error('MediaRecorder is not recording'));
      }
    });
  }

  abort(): void {
    this.stopSilenceMonitoring();

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }

    this.analyser = null;
    this.microphone = null;
    this.dataArray = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.onSilenceDetected = null;
  }

  isAvailable(): boolean {
    return this.isSupported;
  }
}

// Keep the old class name for backward compatibility during migration
// but mark as deprecated
/**
 * @deprecated Use AudioRecorderService instead
 */
export class SpeechRecognitionService {
  constructor() {
    console.warn('SpeechRecognitionService is deprecated. Use AudioRecorderService instead.');
  }

  isAvailable(): boolean {
    return false;
  }

  start(): void {
    throw new Error('SpeechRecognitionService is deprecated. Please use AudioRecorderService instead.');
  }

  stop(): void {
    // No-op
  }

  abort(): void {
    // No-op
  }
}
