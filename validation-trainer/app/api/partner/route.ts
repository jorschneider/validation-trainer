import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Scenario, ConversationMessage } from '@/types/validation';

// Support for Kimi K2 and other providers via baseURL
const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.KIMI_API_KEY || '';
const baseURL = process.env.OPENAI_BASE_URL || process.env.KIMI_BASE_URL || undefined;

// OpenRouter requires additional headers
const isOpenRouter = baseURL?.includes('openrouter.ai');

const openai = new OpenAI({
  apiKey,
  ...(baseURL && { baseURL }),
  ...(isOpenRouter && {
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://validation-trainer.vercel.app',
      'X-Title': 'Validation Trainer',
    },
  }),
});

const MODEL_NAME = process.env.OPENAI_MODEL || process.env.KIMI_MODEL || 'gpt-5';

// Analyze user's response quality to inform partner's reaction
function analyzeValidationQuality(response: string, scenario: Scenario): {
  validationQuality: 'excellent' | 'good' | 'poor' | 'invalidating';
  detectedEmotions: boolean;
  hasJustification: boolean;
  hasMicroValidations: boolean;
  hasInvalidatingPhrases: boolean;
  prematureFix: boolean;
} {
  const lowerResponse = response.toLowerCase();
  
  // Check for emotion identification
  const detectedEmotions = scenario.emotions.some(emotion => 
    lowerResponse.includes(emotion.toLowerCase())
  ) || /\b(frustrated|worried|angry|sad|excited|proud|overwhelmed|exhausted|hurt|confused|anxious)\b/i.test(response);
  
  // Check for justification
  const justificationPatterns = [
    /because/i, /especially/i, /given that/i, /it makes sense/i,
    /i don't blame you/i, /i can see why/i, /that would be/i,
    /i'd feel/i, /anyone would/i, /makes sense/i
  ];
  const hasJustification = justificationPatterns.some(pattern => pattern.test(response));
  
  // Check for micro validations
  const microValidationPhrases = [
    'that makes sense', 'wow', 'i can see', 'that\'s', 'i hear',
    'tell me more', 'i understand', 'really', 'no way', 'seriously'
  ];
  const hasMicroValidations = microValidationPhrases.some(phrase =>
    lowerResponse.includes(phrase.toLowerCase())
  );
  
  // Check for invalidating phrases
  const invalidatingPhrases = [
    'don\'t worry', 'you\'ll be fine', 'it could be worse', 'at least',
    'you\'re being too sensitive', 'just let it go', 'it\'s not that big of a deal',
    'stop complaining', 'cheer up', 'you\'ll get over it', 'you\'re overreacting',
    'it\'s not that bad', 'that\'s not true'
  ];
  const hasInvalidatingPhrases = invalidatingPhrases.some(phrase =>
    lowerResponse.includes(phrase.toLowerCase())
  );
  
  // Check for premature fixing
  const advicePhrases = [/you should/i, /why don't you/i, /have you tried/i, /here's what/i, /you need to/i];
  const prematureFix = advicePhrases.some(pattern => pattern.test(response)) && !hasJustification;
  
  // Determine overall quality
  let validationQuality: 'excellent' | 'good' | 'poor' | 'invalidating' = 'poor';
  if (hasInvalidatingPhrases || prematureFix) {
    validationQuality = 'invalidating';
  } else if (detectedEmotions && hasJustification && hasMicroValidations) {
    validationQuality = 'excellent';
  } else if (detectedEmotions && (hasJustification || hasMicroValidations)) {
    validationQuality = 'good';
  }
  
  return {
    validationQuality,
    detectedEmotions,
    hasJustification,
    hasMicroValidations,
    hasInvalidatingPhrases,
    prematureFix
  };
}

export async function POST(request: NextRequest) {
  try {
    const { scenario, conversationHistory, userResponse, partnerDescription } = await request.json();

    // Build context about conversation state
    const conversationLength = conversationHistory.length;
    const isFirstExchange = conversationLength === 0;
    const isEarlyConversation = conversationLength <= 2;
    const hasReceivedGoodValidation = conversationHistory.some((msg: ConversationMessage, idx: number) => 
      idx > 0 && msg.role === 'partner' && 
      (msg.content.toLowerCase().includes('yes') || 
       msg.content.toLowerCase().includes('exactly') ||
       msg.content.toLowerCase().includes('that\'s') ||
       msg.content.toLowerCase().includes('thank'))
    );

    // For first exchange, partner should respond naturally with scenario context
    // For subsequent exchanges, analyze validation quality
    let validationReactionGuidance = '';
    let qualityAnalysis: ReturnType<typeof analyzeValidationQuality> | null = null;
    
    if (isFirstExchange && !userResponse) {
      // First exchange: partner starts the conversation
      validationReactionGuidance = `This is the very first message - you are starting the conversation.
      - Begin naturally as the character in this scenario
      - Share your opening concern/problem based on: ${scenario.description}
      - Express the emotions you're feeling: ${scenario.emotions.join(', ')}
      - Use the scenario opening as inspiration: "${scenario.partnerOpening}"
      - Be authentic and human - this is a real moment where you need support
      - Keep it to 1-2 sentences - just start the conversation naturally`;
    } else if (isFirstExchange && userResponse) {
      // First exchange: user responded, partner continues
      validationReactionGuidance = `This is the first exchange. Your partner responded with: "${userResponse}"
      - Respond naturally as the character in this scenario
      - Continue sharing your concern/problem naturally based on what they said
      - Use the scenario context: ${scenario.description}
      - Express the emotions you're feeling: ${scenario.emotions.join(', ')}
      - Be authentic and human - this is a real moment where you need support`;
    } else {
      // Subsequent exchanges: analyze validation quality
      qualityAnalysis = analyzeValidationQuality(userResponse, scenario);
      switch (qualityAnalysis.validationQuality) {
        case 'excellent':
          validationReactionGuidance = `Your partner just validated you EXCELLENTLY. They identified your emotions, offered justification, and used validating phrases. 
          - Feel genuinely heard and understood
          - Open up more, share deeper feelings or details
          - Show relief, appreciation, or connection
          - Express gratitude (subtly, not overly): "Yes, exactly" or "That's how I feel"
          - Continue the conversation naturally with more vulnerability`;
          break;
        case 'good':
          validationReactionGuidance = `Your partner validated you reasonably well. They tried to understand but may have missed some nuances.
          - Feel somewhat heard but not fully understood
          - Continue sharing but maybe less vulnerable
          - Give them a chance to do better
          - Respond neutrally but keep the conversation going`;
          break;
        case 'poor':
          validationReactionGuidance = `Your partner's response was generic or didn't really validate you. They didn't identify your specific emotions or justify them.
          - Feel slightly frustrated or unheard
          - Don't shut down completely, but be less open
          - Maybe say "I guess" or "I don't know" or repeat your concern
          - Give subtle cues that you need better validation`;
          break;
        case 'invalidating':
          validationReactionGuidance = `Your partner just INVALIDATED you or jumped to fixing. They used phrases like "don't worry" or gave unsolicited advice.
          - Feel frustrated, shut down, or defensive
          - You may feel dismissed or misunderstood
          - Respond with frustration: "That's not helpful" or "You're not listening" or "I don't need you to fix it"
          - Escalate emotionally: show hurt, anger, or withdrawal
          - Make it clear their response made things worse`;
          break;
      }
    }

    // Build partner context from description or use defaults
    const partnerContext = partnerDescription 
      ? `PARTNER DESCRIPTION (use this to inform your character):
${partnerDescription}

Based on this description, embody this person authentically. Match their age, life situation, personality, and communication style.`
      : `You are someone's partner. You're smart, capable, and usually pretty grounded, but right now you're dealing with real emotions and need to feel heard.`;

    const systemPrompt = `${partnerContext}

PERSONALITY & COMMUNICATION STYLE:
- You're authentic, emotional, and human - not a robot
- You show your emotions through your words without explaining them
- You're not overly dramatic, but you're genuinely feeling these emotions
- Sometimes you're tired, sometimes you're excited, sometimes you're overwhelmed
- You care deeply about feeling heard and understood by your partner
- You're not trying to test your partner - you genuinely need support/connection

SCENARIO CONTEXT:
Title: ${scenario.title}
Description: ${scenario.description}
Your current emotions: ${scenario.emotions.join(', ')}
Example of what you might naturally say about this situation: "${scenario.partnerOpening}"

${validationReactionGuidance}

CONVERSATION STATE:
- This is ${isFirstExchange ? 'the first exchange' : isEarlyConversation ? 'early in' : 'later in'} the conversation (${conversationLength} messages so far)
- ${hasReceivedGoodValidation ? 'You\'ve received some good validation earlier' : 'You haven\'t felt fully validated yet'}

RESPONSE GUIDELINES:
- Keep responses natural and conversational (1-3 sentences typically, max 4)
- Match the emotional intensity of your current state
${isFirstExchange ? '- Respond naturally to what your partner just said, while sharing your concern from the scenario' : '- React authentically to how your partner validated you'}
- If they validated well: open up more, share deeper feelings, show appreciation
- If they invalidated you: show frustration, close off, or escalate
- Continue the conversation naturally based on the scenario and your emotional state
- Don't break character or mention "validation" or "practice"
- Show emotions through your words, tone, and what you choose to share or withhold

Remember: Your responses should feel like a real person reacting to how well their partner understands them.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.map((msg: ConversationMessage) => ({
        role: msg.role === 'partner' ? 'assistant' as const : 'user' as const,
        content: msg.content
      })),
      ...(userResponse ? [{ role: 'user' as const, content: userResponse }] : [])
    ];

    const requestOptions: Parameters<typeof openai.chat.completions.create>[0] = {
      model: MODEL_NAME,
      messages,
      stream: true, // Enable streaming
    };

    // Apply temperature/presence_penalty for non-GPT-5 models (including Kimi)
    if (!MODEL_NAME.toLowerCase().startsWith('gpt-5')) {
      requestOptions.temperature = 0.7; // Reduced from 0.85 for faster, more consistent responses
      requestOptions.presence_penalty = 0.2; // Reduced from 0.3 for faster generation
    }

    // Create a streaming response
    const stream = await openai.chat.completions.create(requestOptions);

    // Create a ReadableStream to send chunks to the client
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        let fullResponse = '';
        
        try {
          // Type assertion for streaming response
          const streamIterator = stream as AsyncIterable<any>;
          for await (const chunk of streamIterator) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullResponse += content;
              // Send each chunk to the client
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ chunk: content, done: false })}\n\n`)
              );
            }
          }
          
          // Send final message with full response and validation quality
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              chunk: '', 
              done: true, 
              fullResponse: fullResponse.trim(),
              validationQuality: qualityAnalysis?.validationQuality || 'poor'
            })}\n\n`)
          );
          
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              error: 'Streaming failed',
              message: error instanceof Error ? error.message : 'Unknown error'
            })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Return a more helpful error response
    return NextResponse.json(
      { 
        error: 'Failed to generate response',
        message: errorMessage,
        retry: true
      },
      { status: 500 }
    );
  }
}

