import FirecrawlApp from '@mendable/firecrawl-js';

interface ErrorResponse {
  success: false;
  error: string;
}

interface CrawlStatusResponse {
  success: true;
  status: string;
  completed: number;
  total: number;
  creditsUsed: number;
  expiresAt: string;
  data: any[];
}

type CrawlResponse = CrawlStatusResponse | ErrorResponse;

export class FirecrawlService {
  private static API_KEY_STORAGE_KEY = 'BLANK';
  private static firecrawlApp: FirecrawlApp | null = null;

  static saveApiKey(apiKey: string): void {
    localStorage.setItem(this.API_KEY_STORAGE_KEY, apiKey);
    this.firecrawlApp = new FirecrawlApp({ apiKey });
  }

  static getApiKey(): string | null {
    return localStorage.getItem(this.API_KEY_STORAGE_KEY);
  }

  static async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const testApp = new FirecrawlApp({ apiKey });
      const testResponse = await testApp.crawlUrl('https://example.com', {
        limit: 1,
        scrapeOptions: {
          formats: ['html'],
        }
      });
      return testResponse.success;
    } catch (error) {
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a minute before trying again.');
      }
      return false;
    }
  }

  static async crawlWebsite(url: string): Promise<{ success: boolean; error?: string; data?: any }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { success: false, error: 'API key not found' };
    }

    try {
      if (!this.firecrawlApp) {
        this.firecrawlApp = new FirecrawlApp({ apiKey });
      }

      const crawlResponse = await this.firecrawlApp.crawlUrl(url, {
        limit: 1,
        scrapeOptions: {
          formats: ['html'],
        }
      }) as CrawlResponse;

      if (!crawlResponse.success) {
        return { 
          success: false, 
          error: (crawlResponse as ErrorResponse).error || 'Failed to crawl website' 
        };
      }

      return { 
        success: true,
        data: crawlResponse 
      };
    } catch (error) {
      if (error.response?.status === 429) {
        const resetTime = error.response?.headers?.['x-ratelimit-reset'];
        const waitTime = resetTime ? new Date(resetTime).toLocaleTimeString() : 'about a minute';
        return { 
          success: false, 
          error: `Rate limit exceeded. Please try again after ${waitTime}.`
        };
      }
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to connect to Firecrawl API' 
      };
    }
  }
}