import { NextRequest, NextResponse } from 'next/server';
import { extractUserFromHeaders } from '@/lib/auth-adapter';

interface CrawlResult {
  id: string | null;
  url: string;
  title: string;
  status: 'scraped' | 'error';
  preview: string;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate with Supabase
    const { email, id } = await extractUserFromHeaders(request);
    if (!email || !id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: 'urls array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (urls.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 URLs allowed per request' },
        { status: 400 }
      );
    }

    // Validate URLs
    const validUrls = urls.filter((url: unknown) => {
      if (typeof url !== 'string') return false;
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    });

    if (validUrls.length === 0) {
      return NextResponse.json(
        { error: 'No valid URLs provided' },
        { status: 400 }
      );
    }

    const tavilyKey = process.env.TAVILY_API_KEY;
    const results: CrawlResult[] = [];

    for (const url of validUrls) {
      try {
        if (tavilyKey) {
          // Use Tavily extract API to get page content
          const tavilyResponse = await fetch('https://api.tavily.com/extract', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${tavilyKey}`,
            },
            body: JSON.stringify({ urls: [url] }),
          });

          if (tavilyResponse.ok) {
            const data = await tavilyResponse.json();
            const extracted = data.results?.[0];

            if (extracted) {
              results.push({
                id: `crawl-${Date.now()}`,
                url,
                title: extracted.title || new URL(url).hostname,
                status: 'scraped',
                preview: (extracted.raw_content || extracted.content || 'No content extracted').substring(0, 500),
              });
              continue;
            }
          }
        }

        // Fallback: simple fetch with metadata extraction
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ScoutBot/1.0)',
          },
          signal: AbortSignal.timeout(10000),
        });

        const html = await response.text();

        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch?.[1]?.trim() || new URL(url).hostname;

        // Extract meta description
        const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
          || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
        const description = metaMatch?.[1]?.trim() || '';

        // Extract visible text (rough)
        const textContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        results.push({
          id: `crawl-${Date.now()}`,
          url,
          title,
          status: 'scraped',
          preview: (description || textContent).substring(0, 500),
        });

      } catch (error) {
        console.error(`Error crawling ${url}:`, error);
        results.push({
          id: null,
          url,
          title: 'Error',
          status: 'error',
          preview: error instanceof Error ? error.message : 'Failed to scrape this URL',
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      total: results.length,
    });

  } catch (error) {
    console.error('Scout crawl error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
