import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Scenario } from '@/types/validation';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
});

const MODEL_NAME = process.env.OPENAI_MODEL || 'gpt-5';

export async function POST(request: NextRequest) {
  try {
    const { partnerDescription } = await request.json();

    if (!partnerDescription || partnerDescription.trim().length < 10) {
      return NextResponse.json(
        { error: 'Partner description is required and must be at least 10 characters' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert at creating realistic, emotionally-charged scenarios for practicing validation skills. 

Your task is to create a scenario where someone needs emotional validation from their partner. The scenario should:
- Be realistic and relatable
- Involve genuine emotions that need validation
- Not be overly dramatic, but feel authentic
- Match the partner description provided
- Be appropriate for practicing the Four-Step Validation Method

Create a scenario in JSON format with the following structure:
{
  "title": "A brief, descriptive title (3-8 words)",
  "description": "A 1-2 sentence description of the situation (what happened, the context)",
  "partnerOpening": "What the partner would naturally say to start this conversation (1-3 sentences, authentic and emotional)",
  "emotions": ["emotion1", "emotion2", "emotion3"],
  "difficulty": "easy" | "medium" | "hard",
  "idealResponse": "An example of a good validation response (1-2 sentences)"
}

The emotions should be from this list: worried, angry, frustrated, sad, embarrassed, hurt, confused, anxious, overwhelmed, exhausted, excited, proud, happy, grateful, hopeful

The difficulty should reflect how challenging it would be to validate this person:
- easy: straightforward emotions, clear situation
- medium: some complexity, mixed emotions, or subtle needs
- hard: complex emotions, sensitive topic, or requires careful handling

Make the scenario feel authentic to the partner description provided.`;

    const userPrompt = `Create a validation practice scenario based on this partner description:

${partnerDescription}

Generate a realistic scenario where this person would need emotional validation. Make it feel natural and authentic to who they are.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    const requestOptions: Parameters<typeof openai.chat.completions.create>[0] = {
      model: MODEL_NAME,
      messages,
      response_format: { type: 'json_object' },
    };

    if (!MODEL_NAME.toLowerCase().startsWith('gpt-5')) {
      requestOptions.temperature = 0.7;
    }

    const completion = await openai.chat.completions.create(requestOptions);

    if (!('choices' in completion) || !completion.choices.length) {
      throw new Error('No completion choices returned');
    }

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    
    // Validate and structure the response
    const generatedScenario: Scenario = {
      id: `generated-${Date.now()}`,
      category: 'stressful-day', // Default category for generated scenarios
      title: result.title || 'Generated Scenario',
      description: result.description || '',
      partnerOpening: result.partnerOpening || '',
      emotions: Array.isArray(result.emotions) ? result.emotions : ['worried'],
      difficulty: ['easy', 'medium', 'hard'].includes(result.difficulty) ? result.difficulty : 'medium',
      idealResponse: result.idealResponse || '',
    };

    return NextResponse.json({ scenario: generatedScenario });
  } catch (error) {
    console.error('Error generating scenario:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to generate scenario',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

