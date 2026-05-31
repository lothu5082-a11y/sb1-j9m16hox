// ---------------------------------------------------------------------------
// webScraper.ts
// Vexsora — lightweight web scraper for knowledge expansion
// All requests run without API keys; requires device internet access when used.
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 5000;

// ---------------------------------------------------------------------------
// API response shapes (minimal — only fields we consume)
// ---------------------------------------------------------------------------

interface WikipediaSummaryResponse {
  extract?: string;
  title?: string;
  type?: string;
}

interface DuckDuckGoResponse {
  Abstract?: string;
  Answer?: string;
  AbstractText?: string;
  RelatedTopics?: { Text?: string }[];
}

// ---------------------------------------------------------------------------
// WebScraperService
// ---------------------------------------------------------------------------

class WebScraperService {
  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Fetch the summary paragraph for a Wikipedia article.
   *
   * Uses the Wikipedia REST API (no auth required).
   * Returns the cleaned extract text, or null on failure.
   *
   * @param query - Search term to look up (spaces are URL-encoded).
   */
  async fetchWikipediaSummary(query: string): Promise<string | null> {
    const title = encodeURIComponent(query.trim().replace(/\s+/g, '_'));
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`;

    try {
      const response = await this._fetchWithTimeout(url);
      if (!response.ok) return null;

      const data: WikipediaSummaryResponse = await response.json();
      if (data.type === 'disambiguation' || !data.extract) return null;

      return this.cleanText(data.extract);
    } catch {
      return null;
    }
  }

  /**
   * Fetch an instant answer snippet from the DuckDuckGo Instant Answer API.
   *
   * No API key required. Returns the Abstract or direct Answer text,
   * or null when neither is available.
   *
   * @param query - Natural-language search query.
   */
  async fetchDuckDuckGoSnippet(query: string): Promise<string | null> {
    const encoded = encodeURIComponent(query.trim());
    const url = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`;

    try {
      const response = await this._fetchWithTimeout(url);
      if (!response.ok) return null;

      const data: DuckDuckGoResponse = await response.json();

      // Prefer a direct answer, fall back to abstract text
      const candidate =
        (data.Answer && data.Answer.trim()) ||
        (data.Abstract && data.Abstract.trim()) ||
        (data.AbstractText && data.AbstractText.trim());

      if (candidate && candidate.length > 10) {
        return this.cleanText(candidate);
      }

      // Last resort: first related topic text
      const firstTopic = data.RelatedTopics?.[0]?.Text?.trim();
      if (firstTopic && firstTopic.length > 10) {
        return this.cleanText(firstTopic);
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Attempt to fetch a useful text snippet for the query.
   *
   * Strategy: DuckDuckGo first (faster, broader), then Wikipedia.
   * Returns the first successful non-null result, or null if both fail.
   *
   * @param query - Free-text question or topic.
   */
  async scrapeAndLearn(query: string): Promise<string | null> {
    const ddg = await this.fetchDuckDuckGoSnippet(query);
    if (ddg && ddg.length > 20) return ddg;

    const wiki = await this.fetchWikipediaSummary(query);
    if (wiki && wiki.length > 20) return wiki;

    return null;
  }

  /**
   * Strip HTML tags, collapse whitespace, and truncate to 300 characters.
   *
   * @param raw - Raw string that may contain HTML markup.
   */
  cleanText(raw: string): string {
    // Remove HTML tags
    const stripped = raw.replace(/<[^>]*>/g, ' ');
    // Decode common HTML entities
    const decoded = stripped
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
    // Normalise whitespace
    const normalised = decoded.replace(/\s+/g, ' ').trim();
    // Truncate to 300 chars at a word boundary if possible
    if (normalised.length <= 300) return normalised;
    const truncated = normalised.slice(0, 300);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 250 ? truncated.slice(0, lastSpace) : truncated) + '…';
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Wrapper around `fetch` that aborts the request after FETCH_TIMEOUT_MS.
   */
  private _fetchWithTimeout(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    return fetch(url, { ...options, signal: controller.signal }).finally(() =>
      clearTimeout(timer)
    );
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const webScraper = new WebScraperService();
