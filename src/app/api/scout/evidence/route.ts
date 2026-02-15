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
        supporting_evidence: string;
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

/** Turn node content (social_fit, improvements, followups, etc.) into a short text string for search context */
function nodeContentToSearchContext(nodeContent: unknown, maxChars: number = 500): string {
    if (nodeContent == null) return '';
    if (typeof nodeContent === 'string') return nodeContent.slice(0, maxChars);
    if (!Array.isArray(nodeContent)) return String(nodeContent).slice(0, maxChars);

    const parts: string[] = [];
    for (const item of nodeContent) {
        if (typeof item === 'string') {
            parts.push(item);
        } else if (item && typeof item === 'object') {
            const obj = item as Record<string, unknown>;
            if (obj.platform != null && obj.why != null) {
                parts.push(`${obj.platform}: ${obj.why}`);
            } else if (obj.segment != null && Array.isArray(obj.ideas)) {
                parts.push(`${obj.segment}: ${(obj.ideas as string[]).join('; ')}`);
            } else if (obj.name != null) {
                parts.push(String(obj.name) + (obj.why_it_fits ? ` ${obj.why_it_fits}` : ''));
            } else if (obj.risk != null) {
                parts.push(String(obj.risk) + (obj.mitigation ? ` → ${obj.mitigation}` : ''));
            } else {
                parts.push(JSON.stringify(obj));
            }
        }
    }
    const text = parts.join('. ').trim();
    return text.length > maxChars ? text.slice(0, maxChars) + '...' : text;
}

export async function POST(request: NextRequest) {
    try {
        const { email, id } = await extractUserFromHeaders(request);
        if (!email || !id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { query, nodeLabel, nodeContent, productContext, evidence, searchOnly } = await request.json();

        if (!query || typeof query !== 'string') {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        const tavilyKey = process.env.TAVILY_API_KEY;
        if (!tavilyKey) {
            return NextResponse.json({ error: 'Tavily API key not configured' }, { status: 500 });
        }

        const nodeContentText = nodeContentToSearchContext(nodeContent);

        let searchResults: EvidenceResult[] = [];

        if (evidence && Array.isArray(evidence) && evidence.length > 0) {
            console.log('Using provided evidence for insights:', evidence.length);
            searchResults = evidence;
        } else {
            // 1. Search Tavily (Hybrid Strategy)

            // A. Specific AI Query (Node-Aware: uses node label + node content text for social_fit, improvements, followups, etc.)
            const specificQuery = await generateSearchQuery(query, productContext || '', nodeLabel || '', nodeContentText);
            console.log('Specific Query:', specificQuery);

            // B. Broad Context Query (Node-Aware: include node content so search matches the node's actual text)
            const isImprovements = (nodeLabel || '').toLowerCase().includes('improvement');
            let contextPart: string;
            if (nodeContentText) {
                contextPart = `${nodeLabel || query} ${nodeContentText.slice(0, 200)}`;
            } else {
                contextPart = nodeLabel ? `${nodeLabel} for ${productContext ? productContext.slice(0, 50) : query}` : '';
            }
            if (isImprovements) {
                contextPart = `product improvement ideas recommendations what to add ${contextPart}`;
            }
            const broadQuery = contextPart
                ? `${contextPart}${productContext ? ` ${productContext.slice(0, 80)}` : ''}`
                : (productContext ? `${query} ${productContext.slice(0, 50)}` : query);
            console.log('Broad Query:', broadQuery);

            // Run searches in parallel. For Improvements node, add a dedicated "improvement ideas" query for better relevance.
            const improvementQuery = isImprovements
                ? `product improvement ideas what features to add recommendations ${(productContext || query).slice(0, 100)}`
                : null;

            const searchPromises: Promise<EvidenceResult[]>[] = [
                tavilySearch(tavilyKey, specificQuery, 5),
                tavilySearch(tavilyKey, broadQuery, 5),
            ];
            if (improvementQuery) {
                console.log('Improvements node: extra query:', improvementQuery);
                searchPromises.push(tavilySearch(tavilyKey, improvementQuery, 5));
            }

            const searchResultsArrays = await Promise.all(searchPromises);
            const allResults = searchResultsArrays.flat();

            // Merge and Deduplicate by URL (keep first occurrence so improvement-focused results can rank earlier)
            const uniqueResults = Array.from(new Map(allResults.map(item => [item.url, item])).values());

            console.log(`Merged ${allResults.length} results into ${uniqueResults.length} unique items.`);

            // Curate the top 5 results using LLM (Node-Aware)
            searchResults = await curateResults(uniqueResults, query, productContext || '', nodeLabel || '', nodeContentText);
            console.log(`Curated down to ${searchResults.length} results`);
        }

        // When searchOnly is true, return only results (no insight generation) for a faster Search flow
        if (searchOnly === true) {
            return NextResponse.json({ results: searchResults });
        }

        // 2. Generate Insights with Cohere
        const context = searchResults.map(r => r.snippet).join('\n\n');

        const insightPrompt = `
You are a strategic business consultant. 
Product Context: "${productContext ? productContext.slice(0, 300) : 'New Product Idea'}"
User Question: "${query}"
Context from Web Search:
${context}

based on the search results and the context, generate three EXTREMELY CONCISE sections.
NO sentences. NO filler. Just raw data and direct actions.
Max 10 words per bullet.

1. Supporting Evidence: 2 key quotes/facts that most strongly support the user's idea/query.
2. Related Research: 2 key larger trends/context.
3. Action Items: 2 direct commands.

Return ONLY valid JSON in this format:
{
  "supporting_evidence": "Markdown string with bullets",
  "related_research": "Markdown string with bullets",
  "action_items": "Markdown string with bullets"
}`;

        let insights = {
            supporting_evidence: "No supporting evidence found.",
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
                supporting_evidence: "Error parsing AI insights. Please try again.",
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

function isImprovementsNode(nodeLabel: string): boolean {
    const label = (nodeLabel || '').toLowerCase();
    return label.includes('improvement');
}

async function generateSearchQuery(
    userQuery: string,
    productContext: string,
    nodeLabel: string,
    nodeContentText: string = ''
): Promise<string> {
    try {
        const contentBlock = nodeContentText
            ? `\nContent of this aspect (use this to target the search): "${nodeContentText.slice(0, 400)}"`
            : '';

        const improvementsGuidance = isImprovementsNode(nodeLabel)
            ? `
IMPORTANT: This aspect is "Improvements" – the user wants IMPROVEMENT IDEAS, RECOMMENDATIONS, and FEATURE GAPS for their product.
Craft the search query to find: product improvement suggestions, feature recommendations, "what to add", "how to improve", gaps in the market, user feedback for similar products, wish lists, and expert recommendations.
AVOID queries that only return descriptions of existing products; favor queries that surface improvement ideas, comparison "what's missing", and recommendation lists.`
            : '';

        const prompt = `
You are an expert at crafting search queries for market research.

Product Context: "${productContext ? productContext.slice(0, 300) : 'New Product Idea'}"
Specific Aspect: "${nodeLabel || 'General Analysis'}"
User Intent: "${userQuery}"${contentBlock}
${improvementsGuidance}

Your goal is to find specific evidence, statistics, market data, and competitors related to the SPECIFIC ASPECT ("${nodeLabel}").
${nodeContentText ? 'Use the aspect content above to make the search query concrete (e.g. platform names, segment names, improvement themes, or follow-up topics).' : ''}
Convert the user's intent into a single, highly targeted search query optimized for a search engine like Google.
Focus on finding "hard" data (numbers, dates, names) and authoritative sources.

Return ONLY the search query string. Do not use quotes.
`;

        const response = await chatCompletion(
            [{ role: 'user', content: prompt }],
            { model: 'command-r-08-2024', temperature: 0.1 }
        );

        const refinedQuery = response.trim().replace(/^"|"$/g, '');
        return refinedQuery || userQuery;
    } catch (error) {
        console.error('Error generating search query:', error);
        let base: string;
        if (isImprovementsNode(nodeLabel)) {
            base = nodeContentText
                ? `product improvement ideas recommendations ${nodeContentText.slice(0, 100)} ${userQuery}`
                : `product improvement ideas feature recommendations ${userQuery}`;
        } else {
            base = nodeContentText
                ? `${nodeLabel || userQuery} ${nodeContentText.slice(0, 150)} ${userQuery}`
                : (nodeLabel ? `${nodeLabel} ${userQuery}` : userQuery);
        }
        return productContext ? `${base} ${productContext.slice(0, 50)}` : base;
    }
}

async function curateResults(
    results: EvidenceResult[],
    userQuery: string,
    productContext: string,
    nodeLabel: string,
    nodeContentText: string = ''
): Promise<EvidenceResult[]> {
    if (results.length <= 5) return results;

    try {
        const resultsContext = results.map((r, i) => `[${i}] URL: ${r.url}\nSnippet: ${r.snippet}`).join('\n\n');
        const contentBlock = nodeContentText
            ? `\nAspect content (prioritize results that match these topics): "${nodeContentText.slice(0, 300)}"`
            : '';

        const improvementsCriteria = isImprovementsNode(nodeLabel)
            ? `
IMPORTANT: This aspect is "Improvements". STRONGLY PREFER results that discuss: improvement ideas, feature recommendations, "what to add", "how to improve", product gaps, user wish lists, expert suggestions, or "what's missing" in similar products. EXCLUDE or rank last: results that only describe a single existing product's features, product announcements, or content that does not discuss improvements or recommendations. If a result is off-topic (e.g. unrelated to the product category), do not select it.`
            : '';

        const prompt = `
You are an expert researcher. Your goal is to select the TOP 5 most relevant and high-quality search results for the user's query.

User Query: "${userQuery}"
Specific Aspect: "${nodeLabel || 'General Analysis'}"${contentBlock}
Product Context: "${productContext.slice(0, 200)}"
${improvementsCriteria}

Candidate Results:
${resultsContext}

Criteria for selection:
1. Direct relevance to the SPECIFIC ASPECT ("${nodeLabel}")${nodeContentText ? ' and to the aspect content above' : ''}.
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
