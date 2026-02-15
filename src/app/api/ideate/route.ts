import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractUserFromHeaders } from '@/lib/auth-adapter';
import { IdeationResponse } from '@/lib/schema';
import { SYSTEM_PROMPT, buildUserPrompt } from '@/lib/prompts';
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
    // Authenticate user via Supabase
    const { email, id } = await extractUserFromHeaders(request);

    if (!email || !id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

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
      model: 'command-r-08-2024',
      temperature: 0.3,
    });

    // Robust JSON cleaning function
    const cleanJson = (str: string) => {
      let cleaned = str.trim();
      console.log('Raw Cohere Response:', cleaned);

      // 1. Remove markdown code blocks
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/```$/, '');
      }

      // 2. Remove any text before the first '{' and after the last '}'
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }

      // 3. Escape control characters (newlines, tabs, etc.) ONLY within string values
      // This is a simplified state machine to detect if we are inside a string
      let result = '';
      let insideString = false;
      let escape = false;

      for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];

        if (insideString) {
          if (escape) {
            // Was escaped, just add char and reset escape
            result += char;
            escape = false;
          } else {
            if (char === '\\') {
              escape = true;
              result += char;
            } else if (char === '"') {
              insideString = false;
              result += char;
            } else if (char === '\n') {
              // This is an unescaped newline INSIDE a string. Escape it.
              result += '\\n';
            } else if (char === '\r') {
              // This is an unescaped carriage return INSIDE a string. Escape it.
              result += '\\r';
            } else if (char === '\t') {
              // This is an unescaped tab INSIDE a string. Escape it.
              result += '\\t';
            } else {
              result += char;
            }
          }
        } else {
          // Not inside string
          if (char === '"') {
            insideString = true;
          }
          result += char;
        }
      }

      return result;
    };

    // Parse and validate JSON response
    let parsedResult;
    try {
      const jsonStr = cleanJson(responseText);
      parsedResult = JSON.parse(jsonStr);
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

    // Save to Supabase ideas table
    const supabase = await createClient();
    const { data: idea, error: insertError } = await supabase
      .from('ideas')
      .insert({
        user_id: id,
        idea_text: body.idea.trim(),
        artifacts: body.artifacts || null,
        result: result,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error saving idea to Supabase:', insertError);
      // Still return the result even if save fails
      return NextResponse.json({
        id: null,
        result,
        warning: 'Idea generated but failed to save'
      });
    }

    return NextResponse.json({
      id: idea.id,
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
