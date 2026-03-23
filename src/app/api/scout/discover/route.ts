import { NextRequest, NextResponse } from 'next/server';
import { extractUserFromHeaders } from '@/lib/auth-adapter';
import { chatCompletion } from '@/lib/cohere';

interface TavilyResult {
    title: string;
    url: string;
    content: string;
    score: number;
}

interface TavilyResponse {
    answer?: string;
    results: TavilyResult[];
}

interface CompetitorInfo {
    name: string;
    product: string;
    website: string;
    description: string;
}

async function tavilySearch(apiKey: string, query: string, maxResults: number = 3): Promise<TavilyResponse> {
    const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            query,
            search_depth: 'basic',
            max_results: maxResults,
            include_answer: false,
            include_raw_content: false,
        }),
    });

    if (!response.ok) {
        throw new Error(`Tavily search failed: ${response.status}`);
    }

    return response.json();
}

export async function POST(request: NextRequest) {
    try {
        const { email, id } = await extractUserFromHeaders(request);
        if (!email || !id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { idea } = await request.json();
        if (!idea || typeof idea !== 'string' || idea.trim().length === 0) {
            return NextResponse.json({ error: 'Idea text is required' }, { status: 400 });
        }

        const tavilyKey = process.env.TAVILY_API_KEY;
        if (!tavilyKey) {
            return NextResponse.json({ error: 'Tavily API key not configured' }, { status: 500 });
        }

        const ideaTrimmed = idea.trim().substring(0, 200);

        // ── STEP 1: Use Cohere to identify REAL competitors ──

        const coherePrompt = `You are a market research analyst. For the following product idea, identify the top 5 REAL existing competitor products/companies that are closest in functionality.

IDEA: "${ideaTrimmed}"

Return ONLY a JSON array of objects. Each object must have:
- "name": the company or product name (e.g. "Ember Mug")
- "website": their official website domain (e.g. "ember.com") — must be a real domain
- "description": one sentence describing what they do and why they compete

CRITICAL RULES:
- Only include REAL, well-known products that actually exist today
- Do NOT make up companies or websites
- If you're unsure about a website, use your best knowledge
- Do NOT include Amazon, eBay, or other marketplaces
- Return the raw JSON array, no markdown, no explanation

Example output:
[{"name":"Ember Mug","website":"ember.com","description":"Temperature-controlled smart mug with app connectivity"},{"name":"Cauldryn","website":"cauldryn.com","description":"Battery-powered heated travel mug with brewing capability"}]`;

        let competitors: CompetitorInfo[] = [];
        let summary = '';

        try {
            const cohereResponse = await chatCompletion(
                [{ role: 'user', content: coherePrompt }],
                { model: 'command-r-plus-08-2024', temperature: 0.3, maxTokens: 800 }
            );


            // Parse JSON from response (handle possible markdown wrapping)
            let jsonStr = cohereResponse.trim();
            if (jsonStr.startsWith('```')) {
                jsonStr = jsonStr.replace(/```(?:json)?\n?/g, '').trim();
            }

            const parsed = JSON.parse(jsonStr);
            if (Array.isArray(parsed)) {
                competitors = parsed.filter(
                    (c: any) => c.name && c.website && c.description
                );
            }
        } catch (err) {
            console.error('🔍 [SCOUT] Cohere competitor identification failed:', err);
        }

        if (competitors.length === 0) {
            return NextResponse.json({
                success: true,
                competitors: [],
                summary: 'No well-known direct competitors were identified for this idea.',
                totalFound: 0,
            });
        }

        // ── STEP 2: Verify each competitor with Tavily ──

        const verifiedCompetitors = await Promise.all(
            competitors.map(async (comp) => {
                try {
                    // Search Tavily for this specific competitor to get a real description
                    const result = await tavilySearch(
                        tavilyKey,
                        `${comp.name} ${comp.website}`,
                        3
                    );

                    // Use Cohere's domain as the URL (it's the official site)
                    // Only use Tavily to find a matching result for a better description
                    const officialUrl = `https://${comp.website}`;

                    // Try to find a Tavily result from the same domain for a richer description
                    const matchingResult = result.results?.find(r => {
                        try {
                            const hostname = new URL(r.url).hostname.replace('www.', '');
                            return hostname === comp.website || hostname.endsWith('.' + comp.website);
                        } catch { return false; }
                    });

                    const description = matchingResult?.content?.substring(0, 300)
                        || result.results?.[0]?.content?.substring(0, 300)
                        || comp.description;

                    return {
                        name: comp.name,
                        url: matchingResult?.url || officialUrl,
                        domain: comp.website,
                        description,
                        relevanceScore: 100,
                    };
                } catch (err) {
                    // Fallback to Cohere's data
                    return {
                        name: comp.name,
                        url: `https://${comp.website}`,
                        domain: comp.website,
                        description: comp.description,
                        relevanceScore: 80,
                    };
                }
            })
        );

        // Build summary from competitor names
        summary = `Found ${verifiedCompetitors.length} competitors: ${verifiedCompetitors.map(c => c.name).join(', ')}.`;


        return NextResponse.json({
            success: true,
            competitors: verifiedCompetitors,
            summary,
            totalFound: verifiedCompetitors.length,
        });

    } catch (error) {
        console.error('Error in /api/scout/discover:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
