import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/cohere'; export async function POST(request: NextRequest) {

  try {
    const body = await request.json();

    const { idea } = body;

    if (!idea || typeof idea !== 'string') {
      console.error(' [EXTRACT-NICHE] Invalid idea provided:', { idea, type: typeof idea });
      return NextResponse.json({ error: 'Idea is required' }, { status: 400 });
    }


    // Extract niche/industry from the idea dynamically using Cohere
    const niche = await extractNicheFromIdea(idea);


    return NextResponse.json({
      success: true,
      niche,
      message: `Identified niche: ${niche}`
    });

  } catch (error) {
    console.error(' [EXTRACT-NICHE] Error occurred:', error);
    console.error(' [EXTRACT-NICHE] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({
      error: 'Failed to extract niche from idea',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function extractNicheFromIdea(idea: string): Promise<string> {

  try {
    const prompt = `You are an expert business analyst and market researcher. 
Given the following product or business idea, identify the main industry or niche it belongs to.
Your response must be ONLY the category name, ideally 2-4 words, capitalized (e.g., "Home Services Tech", "Space Technology", "B2B SaaS", "Pet Care", "Gaming & Entertainment"). 
Do not include any other text or explanation.

Idea: "${idea}"
Niche/Industry:`;

    const responseText = await generateText(prompt, {
      temperature: 0.1, // Low temperature for consistent classification
      maxTokens: 10,
    });

    const niche = responseText.trim();

    // Fallback if the AI gives a strangely long response
    if (niche.length > 50) {
      console.warn(' [EXTRACT-NICHE] AI response was too long, using generic fallback');
      return "Technology & Innovation";
    }

    return niche;
  } catch (error) {
    console.error(' [EXTRACT-NICHE] AI extraction failed, using generic fallback:', error);
    return "Technology & Innovation";
  }
}
