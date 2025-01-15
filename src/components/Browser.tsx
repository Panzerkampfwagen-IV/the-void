import { useState } from 'react';
import { Bookmark, Clock, ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';
import { cn } from '@/lib/utils';
import { FirecrawlService } from '@/utils/FirecrawlService';

interface Bookmark {
  id: string;
  title: string;
  url: string;
}

const Browser = () => {
  const { toast } = useToast();
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [currentUrl, setCurrentUrl] = useState('');
  const [emulatedContent, setEmulatedContent] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [bookmarks] = useState<Bookmark[]>([
    { id: '1', title: 'Example Bookmark', url: 'https://example.com' },
  ]);

  const handleApiKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isValid = await FirecrawlService.testApiKey(apiKey);
      if (isValid) {
        FirecrawlService.saveApiKey(apiKey);
        toast({
          title: "Success",
          description: "API key saved successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Invalid API key",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to validate API key",
        variant: "destructive",
      });
    }
  };

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    // Simulated search results
    const results = [
      {
        title: 'Google',
        url: 'https://google.com',
        description: 'Search the world\'s information, including webpages, images, videos and more.',
      },
      {
        title: 'GitHub',
        url: 'https://github.com',
        description: 'GitHub is where over 100 million developers shape the future of software.',
      },
      {
        title: 'Stack Overflow',
        url: 'https://stackoverflow.com',
        description: 'Stack Overflow is the largest, most trusted online community for developers.',
      },
    ];
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleVisitSite = async (url: string) => {
    if (!FirecrawlService.getApiKey()) {
      toast({
        title: "Error",
        description: "Please set your API key first",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setEmulatedContent(null);
    
    // Ensure URL has protocol
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
    setCurrentUrl(formattedUrl);

    try {
      const result = await FirecrawlService.crawlWebsite(formattedUrl);
      
      if (result.success && result.data) {
        const htmlContent = result.data.data?.[0]?.html;
        if (htmlContent) {
          // Create a sanitized version of the HTML content
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlContent, 'text/html');
          
          // Remove scripts for security
          doc.querySelectorAll('script').forEach(script => script.remove());
          
          // Update relative URLs to absolute
          doc.querySelectorAll('[src], [href]').forEach(el => {
            ['src', 'href'].forEach(attr => {
              const value = el.getAttribute(attr);
              if (value && !value.startsWith('http') && !value.startsWith('data:')) {
                el.setAttribute(attr, new URL(value, formattedUrl).href);
              }
            });
          });
          
          setEmulatedContent(doc.documentElement.outerHTML);
        } else {
          toast({
            title: "Error",
            description: "No content found from the website",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load website",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load website",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white px-4">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-4">
            <button className="rounded-full p-2 transition-colors hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <button className="rounded-full p-2 transition-colors hover:bg-gray-100">
              <ArrowRight className="h-5 w-5 text-gray-600" />
            </button>
            <button className="rounded-full p-2 transition-colors hover:bg-gray-100">
              <RotateCcw className="h-5 w-5 text-gray-600" />
            </button>
            <button className="rounded-full p-2 transition-colors hover:bg-gray-100">
              <Bookmark className="h-5 w-5 text-gray-600" />
            </button>
            <button className="rounded-full p-2 transition-colors hover:bg-gray-100">
              <Clock className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </header>

        <main className="py-12">
          {!FirecrawlService.getApiKey() && (
            <form onSubmit={handleApiKeySubmit} className="mb-8 space-y-4">
              <div className="space-y-2">
                <label htmlFor="apiKey" className="text-sm font-medium text-gray-700">
                  Enter your Firecrawl API Key
                </label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="max-w-md"
                />
              </div>
              <Button type="submit">Save API Key</Button>
            </form>
          )}

          {currentUrl ? (
            <div className="w-full h-[80vh] rounded-lg overflow-hidden border border-gray-200 bg-white">
              {emulatedContent ? (
                <iframe
                  srcDoc={emulatedContent}
                  className="w-full h-full"
                  sandbox="allow-same-origin"
                  title="Crawled content"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
                </div>
              )}
            </div>
          ) : (
            <div className={cn(
              'flex flex-col items-center transition-all duration-500',
              isSearching ? 'translate-y-0' : 'translate-y-32'
            )}>
              <SearchBar onSearch={handleSearch} expanded={isSearching} />
              <SearchResults 
                results={searchResults} 
                isLoading={isSearching} 
                onVisitSite={handleVisitSite}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Browser;