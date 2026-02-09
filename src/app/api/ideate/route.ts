import { NextRequest, NextResponse } from 'next/server';
import { getUserDb } from '@/lib/db';
import { IdeationResponse, type IdeaDoc } from '@/lib/schema';
import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/prompts';
import { requireAuth } from '@/lib/auth';
import { chatCompletion } from '@/lib/cohere';

interface IdeateRequest {
  idea: string;
  artifacts?: Array<{
    type: 'url' | 'pdf' | 'image';
    name: string;
    ref: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { user } = authResult;

    const body: IdeateRequest = await request.json();

    // Validate input
    if (!body.idea || typeof body.idea !== 'string' || body.idea.trim().length === 0) {
      return NextResponse.json(
        { error: 'Idea must be a non-empty string' },
        { status: 400 }
      );
    }

    // Get Cohere API key
    const cohereApiKey = process.env.COHERE_API_KEY;
    if (!cohereApiKey) {
      return NextResponse.json(
        { error: 'Cohere API key not configured' },
        { status: 500 }
      );
    }

    // Build prompts
    const userPrompt = buildUserPrompt(body.idea.trim());

    console.log('System prompt length:', SYSTEM_PROMPT.length);
    console.log('User prompt length:', userPrompt.length);
    console.log('User prompt preview:', userPrompt.substring(0, 200));

    // Call Cohere Chat API using the robust client wrapper
    const responseText = await chatCompletion([
      { role: 'user', content: userPrompt }
    ], {
      model: 'command-r-plus-08-2024',
      temperature: 0.4,
    });

    // Parse and validate JSON response
    let parsedResult;
    try {
      parsedResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse JSON from Cohere:', parseError);
      return NextResponse.json(
        { error: 'schema_invalid', details: 'Response was not valid JSON' },
        { status: 502 }
      );
    }

    // Validate with Zod schema
    const validationResult = IdeationResponse.safeParse(parsedResult);
    if (!validationResult.success) {
      console.error('Schema validation failed:', validationResult.error);
      return NextResponse.json(
        { error: 'schema_invalid', details: validationResult.error.message },
        { status: 502 }
      );
    }

    const result = validationResult.data;

    // Save to user-specific MongoDB database
    const db = await getUserDb(user.auth0Id);
    const collection = db.collection<IdeaDoc>('ideas');

    const document: IdeaDoc = {
      idea: body.idea.trim(),
      artifacts: body.artifacts,
      stage: 'advisor',
      result,
      createdAt: new Date()
    };

    const insertResult = await collection.insertOne(document);

    return NextResponse.json({
      id: insertResult.insertedId.toString(),
      result
    });

  } catch (error) {
    console.error('Error in /api/ideate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
