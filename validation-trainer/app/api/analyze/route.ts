import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Scenario, ConversationMessage } from '@/types/validation';

// Support for Kimi K2 and other providers via baseURL
const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.KIMI_API_KEY || '';
const baseURL = process.env.OPENAI_BASE_URL || process.env.KIMI_BASE_URL || undefined;
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

export async function POST(request: NextRequest) {
  try {
    const { response, scenario, conversationContext } = await request.json();

    // Build conversation context for better analysis
    const conversationSummary = conversationContext.length > 0
      ? `\n\nConversation history:\n${conversationContext.slice(-4).map((msg: ConversationMessage, idx: number) => 
          `${msg.role === 'partner' ? 'Partner' : 'You'}: ${msg.content}`
        ).join('\n')}`
      : '';

    const systemPrompt = `You are an expert validation coach analyzing a response to their partner. 

The user is practicing the Four-Step Validation Method:
1. Listen Empathically (micro validations, questions, matching energy)
2. Validate the Emotion (identify specific emotion + offer justification)
3. Offer Advice/Help (only if appropriate, ask permission first)
4. Validate Again (re-validate at end)

SCENARIO CONTEXT:
- Title: ${scenario.title}
- Description: ${scenario.description}
- Partner's emotions: ${scenario.emotions.join(', ')}
- Ideal response example: ${scenario.idealResponse}
${conversationSummary}

VALIDATION PRINCIPLES:
- Excellent validation: Identifies specific emotion + offers justification + uses micro validations
- Good validation: Identifies emotion OR offers justification
- Poor validation: Generic responses without emotion identification or justification
- Invalidating: Uses dismissive phrases or jumps to fixing without validation

COMMON MISTAKES TO FLAG:
- Invalidating phrases: "don't worry", "you'll be fine", "it could be worse", "at least", "but"
- Premature fixing: jumping to advice before validating ("you should", "why don't you")
- Dismissing emotions: "it's not that bad", "you're overreacting"
- Using "you" statements instead of "I" when giving feedback
- Using absolutes: "always", "never"
- Not matching energy (excited vs sad)
- Not identifying specific emotions

The user's response to analyze: "${response}"

Provide constructive, specific feedback that helps the user improve. Consider:
- How well did they identify their partner's specific emotions?
- Did they offer justification for why those emotions make sense?
- Did they use validating phrases or micro validations?
- Did they avoid invalidating language?
- Did they match the emotional energy?
- Is this early in the conversation (should focus on validation) or later (may be appropriate to offer help)?

Respond in JSON format:
{
  "feedback": "overall assessment (2-3 sentences)",
  "score": number 0-100,
  "positives": ["what they did well - be specific"],
  "mistakes": ["what they did wrong - be specific"],
  "suggestions": ["actionable ways to improve"],
  "modelResponse": "example of strong validation for this specific moment in the conversation"
}`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: `Analyze this response: "${response}"` },
    ];

    const requestOptions: Parameters<typeof openai.chat.completions.create>[0] = {
      model: MODEL_NAME,
      messages,
      response_format: { type: 'json_object' },
    };

    if (!MODEL_NAME.toLowerCase().startsWith('gpt-5')) {
      requestOptions.temperature = 0.3;
    }

    const completion = await openai.chat.completions.create(requestOptions);

    if (!('choices' in completion) || !completion.choices.length) {
      throw new Error('No completion choices returned');
    }

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return NextResponse.json({
      feedback: result.feedback || '',
      score: result.score || 0,
      positives: result.positives || [],
      mistakes: result.mistakes || [],
      suggestions: result.suggestions || [],
      modelResponse: result.modelResponse || scenario.idealResponse,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze response',
        message: errorMessage,
        retry: true
      },
      { status: 500 }
    );
  }
}

