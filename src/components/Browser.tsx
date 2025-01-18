import { useState } from 'react';
import { Bookmark, Clock, ArrowLeft, ArrowRight, RotateCcw, Plus } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [newBookmark, setNewBookmark] = useState({ title: '', url: '' });

  const handleAddBookmark = () => {
    if (!newBookmark.title || !newBookmark.url) {
      toast({
        title: "Error",
        description: "Please fill in both title and URL",
        variant: "destructive",
      });
      return;
    }

    const bookmark: Bookmark = {
      id: Date.now().toString(),
      title: newBookmark.title,
      url: newBookmark.url,
    };

    setBookmarks([...bookmarks, bookmark]);
    setNewBookmark({ title: '', url: '' });
    
    toast({
      title: "Success",
      description: "Bookmark added successfully",
    });
  };

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
    
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
    setCurrentUrl(formattedUrl);

    try {
      const result = await FirecrawlService.crawlWebsite(formattedUrl);
      
      if (result.success && result.data) {
        const htmlContent = result.data.data?.[0]?.html;
        if (htmlContent) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlContent, 'text/html');
          
          // Remove potentially harmful elements
          doc.querySelectorAll('script, iframe, frame, object, embed').forEach(el => el.remove());
          
          // Convert all relative URLs to absolute
          doc.querySelectorAll('[src], [href]').forEach(el => {
            ['src', 'href'].forEach(attr => {
              const value = el.getAttribute(attr);
              if (value && !value.startsWith('http') && !value.startsWith('data:')) {
                try {
                  el.setAttribute(attr, new URL(value, formattedUrl).href);
                } catch (e) {
                  // Invalid URL, skip
                }
              }
            });
          });

          // Preserve original styles
          const baseTag = doc.createElement('base');
          baseTag.href = formattedUrl;
          doc.head.insertBefore(baseTag, doc.head.firstChild);

          // Ensure all stylesheets are loaded
          const styleSheets = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
          styleSheets.forEach(stylesheet => {
            const href = stylesheet.getAttribute('href');
            if (href && !href.startsWith('http')) {
              stylesheet.setAttribute('href', new URL(href, formattedUrl).href);
            }
          });

          // Add style to prevent iframe content from breaking layout
          const styleTag = doc.createElement('style');
          styleTag.textContent = `
            body { 
              width: 100% !important;
              min-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow-x: hidden !important;
            }
            img { max-width: 100% !important; height: auto !important; }
          `;
          doc.head.appendChild(styleTag);

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
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="py-4 border-b border-border">
          <div className="flex items-center space-x-2">
            <button className="p-2 rounded-lg hover:bg-accent transition-colors">
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <button className="p-2 rounded-lg hover:bg-accent transition-colors">
              <ArrowRight className="h-5 w-5 text-foreground" />
            </button>
            <button className="p-2 rounded-lg hover:bg-accent transition-colors">
              <RotateCcw className="h-5 w-5 text-foreground" />
            </button>
            <Dialog>
              <DialogTrigger asChild>
                <button className="p-2 rounded-lg hover:bg-accent transition-colors">
                  <Plus className="h-5 w-5 text-foreground" />
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Custom Bookmark</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="title" className="text-sm font-medium">
                      Title
                    </label>
                    <Input
                      id="title"
                      value={newBookmark.title}
                      onChange={(e) => setNewBookmark({ ...newBookmark, title: e.target.value })}
                      placeholder="Enter bookmark title"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="url" className="text-sm font-medium">
                      URL
                    </label>
                    <Input
                      id="url"
                      value={newBookmark.url}
                      onChange={(e) => setNewBookmark({ ...newBookmark, url: e.target.value })}
                      placeholder="Enter website URL"
                    />
                  </div>
                  <Button onClick={handleAddBookmark} className="w-full">
                    Add Bookmark
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <div className="flex-1" />
            {bookmarks.map((bookmark) => (
              <button
                key={bookmark.id}
                onClick={() => handleVisitSite(bookmark.url)}
                className="p-2 rounded-lg hover:bg-accent transition-colors flex items-center gap-2"
              >
                <Bookmark className="h-5 w-5 text-foreground" />
                <span className="text-sm">{bookmark.title}</span>
              </button>
            ))}
          </div>
        </header>

        <main className="py-8">
          {!FirecrawlService.getApiKey() && (
            <form onSubmit={handleApiKeySubmit} className="mb-8 space-y-4 max-w-md mx-auto">
              <div className="space-y-2">
                <label htmlFor="apiKey" className="text-sm font-medium text-foreground">
                  Enter your Firecrawl API Key
                </label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="w-full"
                />
              </div>
              <Button type="submit" className="w-full">Save API Key</Button>
            </form>
          )}

          {currentUrl ? (
            <div className="w-full h-[80vh] rounded-lg overflow-hidden border border-border bg-card">
              {emulatedContent ? (
                <iframe
                  srcDoc={emulatedContent}
                  className="w-full h-full"
                  sandbox="allow-same-origin allow-forms"
                  title="Crawled content"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
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
