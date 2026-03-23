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
            searchResults = evidence;
        } else {
            // Detect search intent from node + question
            const intent = detectSearchIntent(nodeLabel || '', query);

            // 1. Search Tavily (Hybrid Strategy)

            // A. Intent-aware AI Query
            const specificQuery = await generateSearchQuery(query, productContext || '', nodeLabel || '', nodeContentText, intent);

            // B. Intent-aware broad query (no LLM, just smart keyword assembly)
            const broadQuery = buildBroadQuery(query, nodeLabel || '', productContext || '', intent);

            const searchPromises: Promise<EvidenceResult[]>[] = [
                tavilySearch(tavilyKey, specificQuery, 5),
                tavilySearch(tavilyKey, broadQuery, 5),
            ];

            const searchResultsArrays = await Promise.all(searchPromises);
            const allResults = searchResultsArrays.flat();

            // Merge and Deduplicate by URL
            const uniqueResults = Array.from(new Map(allResults.map(item => [item.url, item])).values());


            // Curate the top 5 results using LLM (Intent-Aware)
            searchResults = await curateResults(uniqueResults, query, productContext || '', nodeLabel || '', nodeContentText, intent);
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

type SearchIntent = 'audience' | 'risk' | 'feature' | 'social' | 'improvement' | 'competitor' | 'monetization' | 'general';

/** Detect the search intent from the node label and user query */
function detectSearchIntent(nodeLabel: string, query: string): SearchIntent {
    const label = nodeLabel.toLowerCase();
    const q = query.toLowerCase();

    // Node-based detection (strongest signal)
    if (label.includes('segment') || label.includes('audience') || label.includes('target')) return 'audience';
    if (label.includes('risk') || label.includes('threat') || label.includes('weakness')) return 'risk';
    if (label.includes('feature') || label.includes('core')) return 'feature';
    if (label.includes('social') || label.includes('platform')) return 'social';
    if (label.includes('improvement') || label.includes('enhance')) return 'improvement';
    if (label.includes('competitor') || label.includes('compet')) return 'competitor';
    if (label.includes('monetiz') || label.includes('revenue') || label.includes('pricing')) return 'monetization';

    // Query-based detection (fallback)
    if (/\b(who|audience|target|demographic|people|customer|user|buyer|persona)\b/i.test(q)) return 'audience';
    if (/\b(risk|danger|fail|threat|challenge|problem|issue|concern|pitfall)\b/i.test(q)) return 'risk';
    if (/\b(feature|function|capability|tool|build|include|offer|mvp)\b/i.test(q)) return 'feature';
    if (/\b(social|platform|instagram|twitter|tiktok|facebook|linkedin|market)\b/i.test(q)) return 'social';
    if (/\b(improve|better|enhance|upgrade|optimize|iterate)\b/i.test(q)) return 'improvement';
    if (/\b(competitor|alternative|compete|rival|versus|vs)\b/i.test(q)) return 'competitor';
    if (/\b(price|monetize|revenue|subscription|freemium|charge|cost|profit)\b/i.test(q)) return 'monetization';

    return 'general';
}

/** Intent-specific search angle descriptors */
const INTENT_SEARCH_ANGLES: Record<SearchIntent, string> = {
    audience: 'target audience demographics psychographics buyer persona consumer profile who buys',
    risk: 'risks challenges failures pitfalls lessons learned case study what went wrong',
    feature: 'must-have features comparison review user expectations competitor features',
    social: 'social media marketing strategy platform best practices engagement growth',
    improvement: 'product improvement user feedback iteration enhancement best practices',
    competitor: 'competitor analysis alternatives comparison market landscape',
    monetization: 'pricing strategy revenue model subscription freemium business model',
    general: 'market research analysis insights trends',
};

/** Build a broad query without LLM, using intent to add the right search angle */
function buildBroadQuery(query: string, nodeLabel: string, productContext: string, intent: SearchIntent): string {
    const productType = productContext.split('.')[0]?.replace(/^Product idea:\s*/i, '').slice(0, 80) || '';
    const searchAngle = INTENT_SEARCH_ANGLES[intent];
    return `${query} ${productType} ${searchAngle}`.trim().slice(0, 300);
}

async function generateSearchQuery(
    userQuery: string,
    productContext: string,
    nodeLabel: string,
    nodeContentText: string = '',
    intent: SearchIntent = 'general'
): Promise<string> {
    try {
        const contentBlock = nodeContentText
            ? `\nNode data: "${nodeContentText.slice(0, 300)}"`
            : '';

        const intentInstructions: Record<SearchIntent, string> = {
            audience: `The user wants to find WHO should use this product. Search for consumer demographics, psychographics, buyer personas, and audience research. Look for "who buys", "target customer", "ideal user profile" type content. Do NOT search for the product itself — search for the PEOPLE.`,
            risk: `The user wants to understand RISKS and potential failures. Search for case studies of similar products that failed, common pitfalls in this industry, regulatory risks, and technical challenges. Look for "what went wrong", "lessons learned", "failures in", "challenges of" type content.`,
            feature: `The user wants to know what FEATURES to build. Search for competitor feature comparisons, user reviews mentioning missing features, product requirement analyses, and MVP feature guides. Look for "must-have features", "feature comparison", "user expectations" type content.`,
            social: `The user wants SOCIAL MEDIA and marketing strategy advice. Search for platform-specific marketing strategies, content engagement data, and go-to-market campaign examples. Look for "marketing strategy for", "best platform for", "social media tips" type content.`,
            improvement: `The user wants to IMPROVE the product. Search for user feedback patterns, product iteration best practices, and enhancement ideas from similar products. Look for "how to improve", "user feedback on", "product iteration" type content.`,
            competitor: `The user wants to understand the COMPETITIVE LANDSCAPE. Search for competitor analyses, market comparisons, alternative products, and competitive advantages. Look for "vs", "alternatives to", "competitor analysis" type content.`,
            monetization: `The user wants PRICING and REVENUE model advice. Search for pricing strategies in this industry, subscription vs. one-time pricing, freemium models, and revenue benchmarks. Look for "pricing strategy", "revenue model", "how to charge for" type content.`,
            general: `Search for the most relevant market research and data that directly answers the user's question.`,
        };

        const prompt = `
You are an expert at crafting web search queries.

The user clicked on "${nodeLabel || 'General'}" in their idea map and asked:
"${userQuery}"

Product: "${productContext ? productContext.slice(0, 300) : 'New Product Idea'}"${contentBlock}

${intentInstructions[intent]}

Create ONE highly targeted search query (max 12 words) that will find web results DIRECTLY answering the user's question.
The query should search for the ANSWER, not the product.

Return ONLY the search query string, no quotes, no explanation.
`;

        const response = await chatCompletion(
            [{ role: 'user', content: prompt }],
            { model: 'command-r-08-2024', temperature: 0.1 }
        );

        const refinedQuery = response.trim().replace(/^"|"$/g, '');
        return refinedQuery || userQuery;
    } catch (error) {
        console.error('Error generating search query:', error);
        const angle = INTENT_SEARCH_ANGLES[intent].split(' ').slice(0, 3).join(' ');
        const base = nodeLabel ? `${userQuery} ${nodeLabel} ${angle}` : `${userQuery} ${angle}`;
        return productContext ? `${base} ${productContext.slice(0, 60)}` : base;
    }
}

async function curateResults(
    results: EvidenceResult[],
    userQuery: string,
    productContext: string,
    nodeLabel: string,
    nodeContentText: string = '',
    intent: SearchIntent = 'general'
): Promise<EvidenceResult[]> {
    if (results.length <= 5) return results;

    try {
        const resultsContext = results.map((r, i) => `[${i}] URL: ${r.url}\nSnippet: ${r.snippet}`).join('\n\n');
        const contentBlock = nodeContentText
            ? `\nNode content: "${nodeContentText.slice(0, 300)}"`
            : '';

        const intentCurationHints: Record<SearchIntent, string> = {
            audience: 'Prefer results about consumer demographics, buyer personas, audience profiles. Reject generic product/market reports that don\'t describe WHO the customers are.',
            risk: 'Prefer results about failures, risks, challenges, case studies. Reject results that are just product promotions or market size reports.',
            feature: 'Prefer results about feature comparisons, user reviews, product requirements. Reject results that don\'t discuss specific features.',
            social: 'Prefer results about marketing strategies, platform guides, campaign examples. Reject results that aren\'t about social media or marketing.',
            improvement: 'Prefer results about product feedback, iteration strategies, improvement ideas. Reject generic market reports.',
            competitor: 'Prefer results that directly compare or analyze competitors. Reject results about the general market without competitor specifics.',
            monetization: 'Prefer results about pricing strategies, revenue models, payment approaches. Reject results that don\'t discuss monetization.',
            general: 'Prefer results that most directly answer the user\'s question. Reject off-topic results.',
        };

        const prompt = `
You are an expert researcher. Select the TOP 5 results that best answer the user's question.

User's question: "${userQuery}"
Node context: "${nodeLabel || 'General'}"${contentBlock}
Product: "${productContext.slice(0, 200)}"

${intentCurationHints[intent]}

Candidate Results:
${resultsContext}

Return a JSON array of the indices of the TOP 5 most relevant results.
Example: [0, 2, 5, 8, 9]

Return ONLY the JSON array.
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
                .slice(0, 5);
        }

        return results.slice(0, 5);
    } catch (error) {
        console.error('Error curating results:', error);
        return results.slice(0, 5);
    }
}
