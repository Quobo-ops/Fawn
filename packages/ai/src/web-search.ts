/**
 * Web Search and Browser utilities for Fawn
 * Uses Tavily API for AI-optimized web search
 */

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate?: string;
}

export interface WebSearchResponse {
  query: string;
  results: SearchResult[];
  answer?: string;
  responseTime: number;
}

export interface FetchedPage {
  url: string;
  title: string;
  content: string;
  extractedAt: Date;
  error?: string;
}

/**
 * Search the web using Tavily API
 */
export async function searchWeb(
  query: string,
  options: {
    maxResults?: number;
    searchDepth?: 'basic' | 'advanced';
    includeAnswer?: boolean;
    includeRawContent?: boolean;
    includeDomains?: string[];
    excludeDomains?: string[];
  } = {}
): Promise<WebSearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY environment variable is required');
  }

  const startTime = Date.now();

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: options.maxResults || 10,
      search_depth: options.searchDepth || 'advanced',
      include_answer: options.includeAnswer ?? true,
      include_raw_content: options.includeRawContent || false,
      include_domains: options.includeDomains || [],
      exclude_domains: options.excludeDomains || [],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tavily search failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json() as {
    results: Array<{
      title: string;
      url: string;
      content: string;
      score: number;
      published_date?: string;
    }>;
    answer?: string;
  };

  return {
    query,
    results: data.results.map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score,
      publishedDate: r.published_date,
    })),
    answer: data.answer,
    responseTime: Date.now() - startTime,
  };
}

/**
 * Fetch and extract content from a specific URL
 */
export async function fetchPage(url: string): Promise<FetchedPage> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY environment variable is required');
  }

  try {
    const response = await fetch('https://api.tavily.com/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        urls: [url],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Fetch failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as {
      results?: Array<{
        title?: string;
        content?: string;
        raw_content?: string;
      }>;
    };
    const result = data.results?.[0];

    if (!result) {
      throw new Error('No content extracted');
    }

    return {
      url,
      title: result.title || url,
      content: result.raw_content || result.content || '',
      extractedAt: new Date(),
    };
  } catch (error) {
    return {
      url,
      title: url,
      content: '',
      extractedAt: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Perform multiple searches in parallel
 */
export async function multiSearch(
  queries: string[],
  options: {
    maxResultsPerQuery?: number;
    searchDepth?: 'basic' | 'advanced';
  } = {}
): Promise<WebSearchResponse[]> {
  const results = await Promise.all(
    queries.map((query) =>
      searchWeb(query, {
        maxResults: options.maxResultsPerQuery || 5,
        searchDepth: options.searchDepth || 'advanced',
        includeAnswer: true,
      })
    )
  );

  return results;
}

/**
 * Smart search that generates related queries and aggregates results
 */
export async function expandedSearch(
  query: string,
  options: {
    maxQueries?: number;
    maxResultsPerQuery?: number;
  } = {}
): Promise<{
  originalQuery: string;
  expandedQueries: string[];
  allResults: SearchResult[];
  deduplicatedResults: SearchResult[];
}> {
  // For now, just do a single deep search
  // The deep research engine will handle query expansion via Claude
  const searchResult = await searchWeb(query, {
    maxResults: options.maxResultsPerQuery || 10,
    searchDepth: 'advanced',
    includeAnswer: true,
  });

  return {
    originalQuery: query,
    expandedQueries: [query],
    allResults: searchResult.results,
    deduplicatedResults: searchResult.results,
  };
}
