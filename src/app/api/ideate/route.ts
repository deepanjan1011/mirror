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


    // Call Cohere Chat API using the robust client wrapper
    const responseText = await chatCompletion([
      { role: 'user', content: userPrompt }
    ], {
      model: 'command-r-08-2024',
      temperature: 0.3,
      maxTokens: 3000,
      timeoutInSeconds: 600,
    });

    // Robust JSON cleaning function
    const cleanJson = (str: string) => {
      let cleaned = str.trim();

      // 1. Remove markdown code blocks if present
      if (cleaned.startsWith('```')) {
        // Strip out ```json or ``` at the start
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
        // Strip out ``` at the end
        cleaned = cleaned.replace(/\s*```$/i, '');
      }

      // 2. Fallback: Extract everything between the first '{' and last '}'
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }

      // 3. Simple cleanup for common LLM JSON generation quirks
      // Escape unescaped newlines and tabs within the JSON string
      cleaned = cleaned
        .replace(/([{,]\s*")([^"]+)("\s*[:])/g, (match, p1, p2, p3) => {
          // Keep keys intact
          return p1 + p2 + p3;
        })
        .replace(/:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, p1) => {
          // Escape newlines and tabs inside string values
          const escapedValue = p1
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
          return `: "${escapedValue}"`;
        });

      // 4. Force trailing closed bracket if last char is missing or newline
      if (!cleaned.trim().endsWith('}')) {
        // Find last valid close element
        let lastValidIndex = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('"'), cleaned.lastIndexOf('}'));

        // If the last thing was a comma or an opening bracket, cut it off so it's a valid end state
        while (lastValidIndex > 0 && (cleaned[lastValidIndex] === ',' || cleaned[lastValidIndex] === '[' || cleaned[lastValidIndex] === '{')) {
          lastValidIndex--;
        }

        if (lastValidIndex > 0) {
          cleaned = cleaned.substring(0, lastValidIndex + 1);

          // Append missing closures based on nesting
          let openBraces = (cleaned.match(/\{/g) || []).length;
          let closeBraces = (cleaned.match(/\}/g) || []).length;
          let openBrackets = (cleaned.match(/\[/g) || []).length;
          let closeBrackets = (cleaned.match(/\]/g) || []).length;

          // If we end with a quote, make sure it's closed
          const quoteCount = (cleaned.match(/"/g) || []).length;
          if (quoteCount % 2 !== 0) {
            cleaned += '"';
          }

          while (openBrackets > closeBrackets) { cleaned += ']'; closeBrackets++; }
          while (openBraces > closeBraces) { cleaned += '}'; closeBraces++; }
        }
      }

      return cleaned;
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
