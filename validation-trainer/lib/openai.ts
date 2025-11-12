import { Scenario, ConversationMessage } from '@/types/validation';

export async function generatePartnerResponseStream(
  scenario: Scenario,
  conversationHistory: ConversationMessage[],
  userResponse: string,
  partnerDescription: string | undefined,
  onChunk: (chunk: string) => void,
  onComplete: (fullResponse: string, validationQuality?: string) => void,
  onError: (error: Error) => void
): Promise<void> {
  try {
    const response = await fetch('/api/partner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario,
        conversationHistory,
        userResponse,
        partnerDescription,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: Failed to generate response`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.error) {
              throw new Error(data.message || data.error);
            }
            
            if (data.chunk) {
              onChunk(data.chunk);
            }
            
            if (data.done) {
              onComplete(data.fullResponse || '', data.validationQuality);
              return;
            }
          } catch (parseError) {
            console.error('Error parsing stream data:', parseError);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error generating partner response stream:', error);
    onError(error instanceof Error ? error : new Error('Unknown error occurred'));
  }
}

// Keep the old function for backward compatibility (though we'll migrate away from it)
export async function generatePartnerResponse(
  scenario: Scenario,
  conversationHistory: ConversationMessage[],
  userResponse: string,
  partnerDescription?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    let fullResponse = '';
    
    generatePartnerResponseStream(
      scenario,
      conversationHistory,
      userResponse,
      partnerDescription,
      (chunk) => {
        fullResponse += chunk;
      },
      (completeResponse) => {
        resolve(completeResponse || fullResponse || "I'm having trouble responding right now.");
      },
      (error) => {
        reject(error);
      }
    );
  });
}

export async function analyzeValidationResponse(
  response: string,
  scenario: Scenario,
  conversationContext: ConversationMessage[]
): Promise<{
  feedback: string;
  score: number;
  positives: string[];
  mistakes: string[];
  suggestions: string[];
  modelResponse: string;
}> {
  try {
    const apiResponse = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response,
        scenario,
        conversationContext,
      }),
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${apiResponse.status}: Failed to analyze response`);
    }

    const result = await apiResponse.json();
    
    if (result.error) {
      throw new Error(result.message || result.error);
    }
    
    return {
      feedback: result.feedback || '',
      score: result.score || 0,
      positives: result.positives || [],
      mistakes: result.mistakes || [],
      suggestions: result.suggestions || [],
      modelResponse: result.modelResponse || scenario.idealResponse,
    };
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
}

