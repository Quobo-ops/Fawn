/**
 * Deep Research Engine for Fawn
 * Uses Claude with web search to perform comprehensive research
 */

import Anthropic from '@anthropic-ai/sdk';
import { searchWeb, fetchPage, type SearchResult, type WebSearchResponse } from './web-search';

const anthropic = new Anthropic();

export interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  relevance: 'high' | 'medium' | 'low';
}

export interface ResearchFinding {
  topic: string;
  summary: string;
  details: string;
  sources: ResearchSource[];
  confidence: 'high' | 'medium' | 'low';
}

export interface ResearchResult {
  id: string;
  query: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  summary: string;
  findings: ResearchFinding[];
  sources: ResearchSource[];
  totalSearches: number;
  totalSourcesReviewed: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface ResearchProgress {
  stage: 'planning' | 'searching' | 'analyzing' | 'synthesizing' | 'complete';
  message: string;
  progress: number; // 0-100
  searchesCompleted: number;
  sourcesReviewed: number;
}

type ProgressCallback = (progress: ResearchProgress) => void;

/**
 * Deep Research Engine that conducts multi-step research
 */
export class DeepResearchEngine {
  private model: string = 'claude-sonnet-4-20250514';
  private maxSearches: number = 5;
  private maxSourcesPerSearch: number = 5;

  constructor(options?: { model?: string; maxSearches?: number; maxSourcesPerSearch?: number }) {
    if (options?.model) this.model = options.model;
    if (options?.maxSearches) this.maxSearches = options.maxSearches;
    if (options?.maxSourcesPerSearch) this.maxSourcesPerSearch = options.maxSourcesPerSearch;
  }

  /**
   * Conduct deep research on a topic
   */
  async research(
    query: string,
    onProgress?: ProgressCallback
  ): Promise<ResearchResult> {
    const id = crypto.randomUUID();
    const startedAt = new Date();
    let totalSearches = 0;
    let totalSourcesReviewed = 0;
    const allSources: ResearchSource[] = [];
    const allSearchResults: SearchResult[] = [];

    try {
      // Stage 1: Plan the research
      onProgress?.({
        stage: 'planning',
        message: 'Planning research approach...',
        progress: 5,
        searchesCompleted: 0,
        sourcesReviewed: 0,
      });

      const researchPlan = await this.planResearch(query);

      // Stage 2: Execute searches
      onProgress?.({
        stage: 'searching',
        message: `Searching for information (0/${researchPlan.queries.length})...`,
        progress: 15,
        searchesCompleted: 0,
        sourcesReviewed: 0,
      });

      for (let i = 0; i < researchPlan.queries.length; i++) {
        const searchQuery = researchPlan.queries[i];
        try {
          const searchResult = await searchWeb(searchQuery, {
            maxResults: this.maxSourcesPerSearch,
            searchDepth: 'advanced',
            includeAnswer: true,
          });

          totalSearches++;
          allSearchResults.push(...searchResult.results);

          // Convert to sources
          for (const result of searchResult.results) {
            allSources.push({
              title: result.title,
              url: result.url,
              snippet: result.content.slice(0, 300),
              relevance: result.score > 0.7 ? 'high' : result.score > 0.4 ? 'medium' : 'low',
            });
            totalSourcesReviewed++;
          }

          onProgress?.({
            stage: 'searching',
            message: `Searching for information (${i + 1}/${researchPlan.queries.length})...`,
            progress: 15 + Math.round((i + 1) / researchPlan.queries.length * 35),
            searchesCompleted: totalSearches,
            sourcesReviewed: totalSourcesReviewed,
          });
        } catch (error) {
          console.error(`Search failed for query "${searchQuery}":`, error);
        }
      }

      // Stage 3: Analyze sources
      onProgress?.({
        stage: 'analyzing',
        message: 'Analyzing sources...',
        progress: 55,
        searchesCompleted: totalSearches,
        sourcesReviewed: totalSourcesReviewed,
      });

      // Deduplicate sources by URL
      const uniqueSources = this.deduplicateSources(allSources);

      // Fetch top sources for deeper analysis
      const topSources = uniqueSources.filter(s => s.relevance === 'high').slice(0, 3);
      const fetchedContents: { url: string; content: string }[] = [];

      for (const source of topSources) {
        try {
          const page = await fetchPage(source.url);
          if (!page.error && page.content) {
            fetchedContents.push({
              url: source.url,
              content: page.content.slice(0, 5000), // Limit content length
            });
          }
        } catch (error) {
          console.error(`Failed to fetch ${source.url}:`, error);
        }
      }

      // Stage 4: Synthesize findings
      onProgress?.({
        stage: 'synthesizing',
        message: 'Synthesizing findings...',
        progress: 75,
        searchesCompleted: totalSearches,
        sourcesReviewed: totalSourcesReviewed,
      });

      const synthesis = await this.synthesizeFindings(
        query,
        allSearchResults,
        fetchedContents,
        uniqueSources
      );

      onProgress?.({
        stage: 'complete',
        message: 'Research complete!',
        progress: 100,
        searchesCompleted: totalSearches,
        sourcesReviewed: totalSourcesReviewed,
      });

      return {
        id,
        query,
        status: 'completed',
        summary: synthesis.summary,
        findings: synthesis.findings,
        sources: uniqueSources.slice(0, 10), // Top 10 sources
        totalSearches,
        totalSourcesReviewed,
        startedAt,
        completedAt: new Date(),
      };
    } catch (error) {
      console.error('Deep research failed:', error);
      return {
        id,
        query,
        status: 'failed',
        summary: '',
        findings: [],
        sources: allSources,
        totalSearches,
        totalSourcesReviewed,
        startedAt,
        completedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Plan the research by generating search queries
   */
  private async planResearch(query: string): Promise<{ queries: string[] }> {
    const response = await anthropic.messages.create({
      model: this.model,
      max_tokens: 500,
      system: `You are a research planning assistant. Given a research query, generate 3-5 specific search queries that will help gather comprehensive information on the topic. Consider different angles: definitions, current state, history, opinions, statistics, etc.

Respond with JSON only:
{
  "queries": ["query 1", "query 2", ...]
}`,
      messages: [
        {
          role: 'user',
          content: `Generate search queries for: "${query}"`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return { queries: [query] };
    }

    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { queries: parsed.queries.slice(0, this.maxSearches) };
      }
    } catch (e) {
      console.error('Failed to parse research plan:', e);
    }

    return { queries: [query] };
  }

  /**
   * Synthesize all findings into a coherent result
   */
  private async synthesizeFindings(
    query: string,
    searchResults: SearchResult[],
    fetchedContents: { url: string; content: string }[],
    sources: ResearchSource[]
  ): Promise<{ summary: string; findings: ResearchFinding[] }> {
    // Build context from search results
    const searchContext = searchResults
      .slice(0, 15)
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.content}\nURL: ${r.url}`)
      .join('\n\n');

    // Add fetched page content
    const fetchedContext = fetchedContents
      .map((f) => `[DETAILED SOURCE: ${f.url}]\n${f.content}`)
      .join('\n\n---\n\n');

    const response = await anthropic.messages.create({
      model: this.model,
      max_tokens: 2000,
      system: `You are a research synthesis assistant. Analyze the provided sources and create a comprehensive research summary. Be thorough but concise. Always cite your sources using [n] notation matching the source numbers.

Respond with JSON only:
{
  "summary": "A 2-3 paragraph executive summary with key takeaways",
  "findings": [
    {
      "topic": "Key topic or aspect",
      "summary": "Brief summary of this finding",
      "details": "Detailed information with citations [n]",
      "sourceIndices": [1, 3, 5],
      "confidence": "high|medium|low"
    }
  ]
}`,
      messages: [
        {
          role: 'user',
          content: `Research query: "${query}"

SEARCH RESULTS:
${searchContext}

${fetchedContext ? `DETAILED SOURCE CONTENT:\n${fetchedContext}` : ''}

Synthesize these sources into a comprehensive research summary.`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return { summary: 'Research synthesis failed.', findings: [] };
    }

    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Convert source indices to actual sources
        const findings: ResearchFinding[] = (parsed.findings || []).map((f: any) => ({
          topic: f.topic,
          summary: f.summary,
          details: f.details,
          sources: (f.sourceIndices || [])
            .filter((i: number) => i > 0 && i <= sources.length)
            .map((i: number) => sources[i - 1]),
          confidence: f.confidence || 'medium',
        }));

        return {
          summary: parsed.summary || 'Research complete.',
          findings,
        };
      }
    } catch (e) {
      console.error('Failed to parse synthesis:', e);
    }

    return { summary: 'Research synthesis completed with partial results.', findings: [] };
  }

  /**
   * Deduplicate sources by URL
   */
  private deduplicateSources(sources: ResearchSource[]): ResearchSource[] {
    const seen = new Set<string>();
    return sources.filter((source) => {
      const normalized = source.url.replace(/\/$/, '').toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  }

  /**
   * Generate a short summary suitable for SMS
   */
  static formatForSMS(result: ResearchResult, maxLength: number = 1500): string {
    if (result.status === 'failed') {
      return `Research on "${result.query}" encountered an error. Please try again later.`;
    }

    let message = `Research Complete: "${result.query}"\n\n`;
    message += result.summary;

    // Add key sources
    const topSources = result.sources.filter((s) => s.relevance === 'high').slice(0, 3);
    if (topSources.length > 0) {
      message += '\n\nKey Sources:\n';
      for (const source of topSources) {
        message += `• ${source.title}: ${source.url}\n`;
      }
    }

    // Truncate if too long
    if (message.length > maxLength) {
      message = message.slice(0, maxLength - 3) + '...';
    }

    return message;
  }
}

/**
 * Quick research function for simple queries
 */
export async function quickResearch(query: string): Promise<{
  summary: string;
  sources: ResearchSource[];
}> {
  const engine = new DeepResearchEngine({ maxSearches: 2, maxSourcesPerSearch: 3 });
  const result = await engine.research(query);

  return {
    summary: result.summary,
    sources: result.sources,
  };
}
