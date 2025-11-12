import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | Blob;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Convert Blob to File if needed (OpenAI SDK expects File)
    let file: File;
    if (audioFile instanceof File) {
      file = audioFile;
    } else {
      // Create a File from Blob with appropriate name and type
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      file = new File([buffer], 'recording.webm', { 
        type: audioFile.type || 'audio/webm' 
      });
    }

    // Use OpenAI Whisper API for transcription
    // The SDK accepts File objects directly in Node.js 18+
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en',
    });

    return NextResponse.json({
      transcript: transcription.text,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      {
        error: 'Failed to transcribe audio',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

