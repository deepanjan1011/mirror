import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/cohere';

export async function POST(request: NextRequest) {
  try {
    const { message, model, temperature, maxTokens } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Wrapped 'message' in an array of objects to match the expected signature
    const response = await chatCompletion([
      { role: 'user', content: message }
    ], {
      model,
      temperature,
      maxTokens,
    });

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error in Cohere chat API:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
