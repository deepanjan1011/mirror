import { NextRequest, NextResponse } from 'next/server';
import { extractUserFromHeaders } from '@/lib/auth-adapter';
import { chatCompletion } from '@/lib/cohere';

interface EvidenceResult {
    snippet: string;
    url: string;
    score: number;
}

interface EvidenceResponse {
    results: EvidenceResult[];
    insights: {
        related_research: string;
        action_items: string;
    };
}

async function tavilySearch(apiKey: string, query: string, maxResults: number = 5): Promise<EvidenceResult[]> {
    const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            query,
            search_depth: 'advanced', // Use advanced for better research results
            max_results: maxResults,
            include_answer: false,
            include_raw_content: false,
        }),
    });

    if (!response.ok) {
        throw new Error(`Tavily search failed: ${response.status}`);
    }

    const data = await response.json();
    return (data.results || []).map((r: any) => ({
        snippet: truncateSnippet(cleanSnippet(r.content)),
        url: r.url,
        score: r.score
    }));
}

function cleanSnippet(text: string): string {
    if (!text) return "";

    let cleaned = text;

    // Remove "Posted on ... by ..."
    // distinct patterns:
    // "Posted on 18 Oct 2018 by Maddy White"
    cleaned = cleaned.replace(/Posted on\s+[A-Za-z0-9\s,]+\s+by\s+[A-Za-z\s]+/gi, '');
    // "By Author Name | Date"
    cleaned = cleaned.replace(/By\s+[A-Za-z\s]+\s*\|\s*[A-Za-z0-9\s,]+/gi, '');

    // Remove Social Share links
    // "Share this article:", "Share on Linkedin", "Share on Twitter", "Share on facebook", "Copy Link"
    cleaned = cleaned.replace(/Share\s+(this\s+article|on\s+(Linkedin|Twitter|Facebook|Reddit|WhatsApp|Email))/gi, '');
    cleaned = cleaned.replace(/Copy\s+Link/gi, '');

    // Remove Navigation / Breadcrumbs (simple heuristic: "Home > Category > Title")
    cleaned = cleaned.replace(/Home\s*>\s*[^>]+(?:\s*>\s*[^>]+)*/gi, '');

    // Remove common boilerplate
    cleaned = cleaned.replace(/Read\s+time:?\s*\d+\s*min(utes)?/gi, '');
    cleaned = cleaned.replace(/Subscribe\s+to\s+.*$/i, ''); // often at end
    cleaned = cleaned.replace(/Log\s+in/gi, '');
    cleaned = cleaned.replace(/Sign\s+up/gi, '');

    // Collapse multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Remove leading punctuation/orphans left behind (except maybe quote marks)
    cleaned = cleaned.replace(/^[^a-zA-Z0-9"']+/g, '');

    return cleaned;
}

function truncateSnippet(text: string, maxSentences = 5, maxChars = 500): string {
    if (!text) return "";

    // Simple heuristic: split by punctuation followed by space
    // matched delimiter is consumed, so we need to capture it or lookahead
    const segments = text.split(/([.!?]+(?:\s+|$))/);

    let sentences: string[] = [];
    let current = "";

    for (let i = 0; i < segments.length; i += 2) {
        const content = segments[i];
        const delimiter = segments[i + 1] || "";

        current += content + delimiter;

        // Crude check for abbreviations (e.g. "U.S.", "Mr.")
        // If the last word is short and capitalized, or known abbrev, don't split yet? 
        // For now, let's just push. Refining this is complex without NLP.
        if (delimiter.trim().length > 0) {
            sentences.push(current);
            current = "";
        }
    }
    if (current) sentences.push(current);

    // Take top N
    let result = sentences.slice(0, maxSentences).join("").trim();

    // Check char limit
    if (result.length > maxChars) {
        result = result.slice(0, maxChars);
        // Try to cut at last space
        const lastSpace = result.lastIndexOf(' ');
        if (lastSpace > 0) result = result.slice(0, lastSpace);
        result += "...";
    }

    return result;
}

export async function POST(request: NextRequest) {
    try {
        const { email, id } = await extractUserFromHeaders(request);
        if (!email || !id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { query, nodeLabel, nodeContent, productContext } = await request.json();

        if (!query || typeof query !== 'string') {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        const tavilyKey = process.env.TAVILY_API_KEY;
        if (!tavilyKey) {
            return NextResponse.json({ error: 'Tavily API key not configured' }, { status: 500 });
        }

        // 1. Search Tavily (Hybrid Strategy)

        // A. Specific AI Query (Node-Aware)
        const specificQuery = await generateSearchQuery(query, productContext || '', nodeLabel || '');
        console.log('Specific Query:', specificQuery);

        // B. Broad Context Query (Node-Aware)
        const broadQuery = nodeLabel
            ? `${nodeLabel} for ${productContext ? productContext.slice(0, 50) : query}`
            : (productContext ? `${query} ${productContext.slice(0, 50)}` : query);
        console.log('Broad Query:', broadQuery);

        // Run searches in parallel (Fetch 5 from each to get ~10 diverse candidates)
        // Note: tavilySearch expects maxResults as 3rd arg
        const [specificResults, broadResults] = await Promise.all([
            tavilySearch(tavilyKey, specificQuery, 5),
            tavilySearch(tavilyKey, broadQuery, 5)
        ]);

        // Merge and Deduplicate by URL
        const allResults = [...specificResults, ...broadResults];
        const uniqueResults = Array.from(new Map(allResults.map(item => [item.url, item])).values());

        console.log(`Merged ${allResults.length} results into ${uniqueResults.length} unique items.`);

        // Curate the top 5 results using LLM (Node-Aware)
        const searchResults = await curateResults(uniqueResults, query, productContext || '', nodeLabel || '');
        console.log(`Curated down to ${searchResults.length} results`);

        // 2. Generate Insights with Cohere
        const context = searchResults.map(r => r.snippet).join('\n\n');

        const insightPrompt = `
You are a strategic business consultant. 
Product Context: "${productContext ? productContext.slice(0, 300) : 'New Product Idea'}"
User Question: "${query}"
Context from Web Search:
${context}

Based on the search results and the context, generate two EXTREMELY CONCISE sections.
NO sentences. NO filler. Just raw data and direct actions.
Max 10 words per bullet.

1. Related Research: 2 key facts/stats only.
2. Action Items: 2 direct commands only.

Return ONLY valid JSON in this format:
{
  "related_research": "Markdown string with bullets",
  "action_items": "Markdown string with bullets"
}`;

        let insights = {
            related_research: "Analysis pending...",
            action_items: "No actionable steps identified."
        };

        try {
            const cohereResponse = await chatCompletion(
                [{ role: 'user', content: insightPrompt }],
                { model: 'command-r-08-2024', temperature: 0.3 }
            );

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

            const jsonStr = cleanJson(cohereResponse);
            insights = JSON.parse(jsonStr);
        } catch (e) {
            console.error('Cohere insight generation failed:', e);
            // Fallback: Try a simpler parsing approach or just return error state
            insights = {
                related_research: "Error parsing AI insights. Please try again.",
                action_items: "Error parsing AI insights. Please try again."
            };
        }

        return NextResponse.json({
            results: searchResults,
            insights
        });

    } catch (error) {
        console.error('Error in /api/scout/evidence:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

async function generateSearchQuery(userQuery: string, productContext: string, nodeLabel: string): Promise<string> {
    try {
        const prompt = `
You are an expert at crafting search queries for market research.

Product Context: "${productContext ? productContext.slice(0, 300) : 'New Product Idea'}"
Specific Aspect: "${nodeLabel || 'General Analysis'}"
User Intent: "${userQuery}"

Your goal is to find specific evidence, statistics, market data, and competitors related to the SPECIFIC ASPECT ("${nodeLabel}").
Convert the user's intent into a single, highly targeted search query optimized for a search engine like Google.
Focus on finding "hard" data (numbers, dates, names) and authoritative sources.

Return ONLY the search query string. Do not use quotes.
`;

        const response = await chatCompletion(
            [{ role: 'user', content: prompt }],
            { model: 'command-r-08-2024', temperature: 0.1 }
        );

        const refinedQuery = response.trim().replace(/^"|"$/g, '');
        // Ensure we don't return empty string
        return refinedQuery || userQuery;
    } catch (error) {
        console.error('Error generating search query:', error);
        // Fallback to naive concatenation
        const base = nodeLabel ? `${nodeLabel} ${userQuery}` : userQuery;
        return productContext
            ? `${base} ${productContext.slice(0, 50)}`
            : base;
    }
}

async function curateResults(results: EvidenceResult[], userQuery: string, productContext: string, nodeLabel: string): Promise<EvidenceResult[]> {
    if (results.length <= 5) return results;

    try {
        const resultsContext = results.map((r, i) => `[${i}] URL: ${r.url}\nSnippet: ${r.snippet}`).join('\n\n');

        const prompt = `
You are an expert researcher. Your goal is to select the TOP 5 most relevant and high-quality search results for the user's query.

User Query: "${userQuery}"
Specific Aspect: "${nodeLabel || 'General Analysis'}"
Product Context: "${productContext.slice(0, 200)}"

Candidate Results:
${resultsContext}

Criteria for selection:
1. Direct relevance to the SPECIFIC ASPECT ("${nodeLabel}").
2. Presence of "hard evidence" (statistics, data, specific facts).
3. Authoritative sources.
4. Diversity of information.

Return a JSON array containing ONLY the indices of the top 5 results.
Example: [0, 2, 5, 8, 9]

Do not explain. Return ONLY the JSON array.
`;

        const response = await chatCompletion(
            [{ role: 'user', content: prompt }],
            { model: 'command-r-08-2024', temperature: 0.1 }
        );

        const indices = JSON.parse(response.replace(/```(?:json)?|```/g, '').trim());

        if (Array.isArray(indices)) {
            return indices
                .filter(i => typeof i === 'number' && i >= 0 && i < results.length)
                .map(i => results[i])
                .slice(0, 5); // Ensure max 5
        }

        return results.slice(0, 5); // Fallback
    } catch (error) {
        console.error('Error curating results:', error);
        return results.slice(0, 5); // Fallback
    }
}
