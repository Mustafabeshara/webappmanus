import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Sparkles,
  Loader2,
  ArrowRight,
  X,
  Lightbulb,
  MessageSquare,
  Filter,
  Calendar,
  DollarSign,
  Tag,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";

interface ParsedQuery {
  intent: string;
  entities: Array<{ type: string; value: string; confidence: number }>;
  filters: Array<{ field: string; operator: string; value: any }>;
  sort?: { field: string; direction: string };
  limit?: number;
  confidence: number;
  originalQuery: string;
}

interface NLPSearchBarProps {
  onSearch?: (query: string, parsed: ParsedQuery) => void;
  placeholder?: string;
  showSuggestions?: boolean;
}

export function NLPSearchBar({
  onSearch,
  placeholder = "Ask anything... e.g., 'Show me medical equipment under $5000'",
  showSuggestions = true,
}: NLPSearchBarProps) {
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Load recent queries
  useEffect(() => {
    const saved = localStorage.getItem("nlp-search-history");
    if (saved) {
      setRecentQueries(JSON.parse(saved).slice(0, 5));
    }
  }, []);

  // Save query to history
  const saveQuery = (q: string) => {
    const updated = [q, ...recentQueries.filter(r => r !== q)].slice(0, 5);
    setRecentQueries(updated);
    localStorage.setItem("nlp-search-history", JSON.stringify(updated));
  };

  // Parse query locally (simulated - in production would call API)
  const parseQuery = useCallback(async (q: string): Promise<ParsedQuery> => {
    const query = q.toLowerCase();
    const parsed: ParsedQuery = {
      intent: "unknown",
      entities: [],
      filters: [],
      confidence: 0.5,
      originalQuery: q,
    };

    // Detect intent
    if (/product|equipment|item|device/.test(query)) {
      parsed.intent = "search_products";
      parsed.confidence = 0.8;
    } else if (/tender|bid|rfp|rfq/.test(query)) {
      parsed.intent = "search_tenders";
      parsed.confidence = 0.8;
    } else if (/supplier|vendor/.test(query)) {
      parsed.intent = "search_suppliers";
      parsed.confidence = 0.8;
    } else if (/document|file|catalog/.test(query)) {
      parsed.intent = "search_documents";
      parsed.confidence = 0.7;
    } else if (/how many|count|total/.test(query)) {
      parsed.intent = "get_statistics";
      parsed.confidence = 0.7;
    }

    // Extract price
    const priceMatch = query.match(/\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
    if (priceMatch) {
      const price = parseFloat(priceMatch[1].replace(/,/g, ""));
      parsed.entities.push({ type: "price", value: String(price), confidence: 0.9 });

      if (/under|below|less than|cheaper|up to|maximum/.test(query)) {
        parsed.filters.push({ field: "price", operator: "lte", value: price * 100 });
      } else if (/over|above|more than|expensive|minimum|at least/.test(query)) {
        parsed.filters.push({ field: "price", operator: "gte", value: price * 100 });
      }
    }

    // Extract date filters
    const datePatterns: Record<string, string> = {
      "today": new Date().toISOString(),
      "this week": new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      "next week": new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      "this month": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    for (const [phrase, date] of Object.entries(datePatterns)) {
      if (query.includes(phrase)) {
        parsed.entities.push({ type: "date", value: date, confidence: 0.85 });
        if (/due|deadline/.test(query)) {
          parsed.filters.push({ field: "deadline", operator: "lte", value: date });
        }
        break;
      }
    }

    // Extract categories
    const categories = ["medical", "surgical", "diagnostic", "laboratory", "imaging", "cardiac"];
    for (const cat of categories) {
      if (query.includes(cat)) {
        parsed.entities.push({ type: "category", value: cat, confidence: 0.9 });
        parsed.filters.push({ field: "category", operator: "contains", value: cat });
      }
    }

    // Extract limit
    const limitMatch = query.match(/(?:top|first|show|limit)\s*(\d+)/i);
    if (limitMatch) {
      parsed.limit = parseInt(limitMatch[1], 10);
    }

    // Extract sort
    if (/cheapest|lowest price/.test(query)) {
      parsed.sort = { field: "price", direction: "asc" };
    } else if (/expensive|highest price/.test(query)) {
      parsed.sort = { field: "price", direction: "desc" };
    } else if (/newest|latest|recent/.test(query)) {
      parsed.sort = { field: "createdAt", direction: "desc" };
    }

    return parsed;
  }, []);

  // Generate suggestions
  const generateSuggestions = useCallback((q: string): string[] => {
    if (!q) return [];

    const templates = [
      "Show me all medical equipment",
      "Find tenders due this week",
      "List products under $5000",
      "What are the top 10 surgical products?",
      "Show diagnostic equipment from approved suppliers",
      "Find suppliers who provide cardiac equipment",
      "What products need restocking?",
      "Compare prices from different suppliers",
    ];

    return templates
      .filter(t => t.toLowerCase().includes(q.toLowerCase()) ||
        q.toLowerCase().split(" ").some(word => t.toLowerCase().includes(word)))
      .slice(0, 4);
  }, []);

  // Update suggestions on query change
  useEffect(() => {
    if (debouncedQuery && showSuggestions) {
      setSuggestions(generateSuggestions(debouncedQuery));
    } else {
      setSuggestions([]);
    }
  }, [debouncedQuery, showSuggestions, generateSuggestions]);

  // Parse query on debounced change
  useEffect(() => {
    if (debouncedQuery) {
      parseQuery(debouncedQuery).then(setParsedQuery);
    } else {
      setParsedQuery(null);
    }
  }, [debouncedQuery, parseQuery]);

  // Handle search
  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsProcessing(true);
    try {
      const parsed = await parseQuery(query);
      saveQuery(query);

      if (parsed.confidence < 0.5) {
        toast.warning("Query understanding is low. Try rephrasing your question.");
      }

      onSearch?.(query, parsed);
      setShowDropdown(false);
    } catch {
      toast.error("Failed to process query");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  // Get icon for entity type
  const getEntityIcon = (type: string) => {
    switch (type) {
      case "price":
        return <DollarSign className="h-3 w-3" />;
      case "date":
        return <Calendar className="h-3 w-3" />;
      case "category":
        return <Tag className="h-3 w-3" />;
      default:
        return <Filter className="h-3 w-3" />;
    }
  };

  // Get intent description
  const getIntentDescription = (intent: string): string => {
    const descriptions: Record<string, string> = {
      search_products: "Searching products",
      search_tenders: "Searching tenders",
      search_suppliers: "Searching suppliers",
      search_documents: "Searching documents",
      get_statistics: "Getting statistics",
      compare_items: "Comparing items",
      get_recommendations: "Getting recommendations",
      unknown: "Processing query",
    };
    return descriptions[intent] || intent;
  };

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <Sparkles className="h-4 w-4 text-primary" />
          <MessageSquare className="h-3 w-3 text-muted-foreground" />
        </div>
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-12 pr-24"
          onFocus={() => setShowDropdown(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
            if (e.key === "Escape") setShowDropdown(false);
          }}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setQuery("");
                setParsedQuery(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSearch}
            disabled={isProcessing || !query}
            className="h-7"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Search className="h-4 w-4 mr-1" />
                Search
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Query Understanding Preview */}
      {parsedQuery && parsedQuery.confidence > 0 && query && (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {getIntentDescription(parsedQuery.intent)}
          </Badge>
          {parsedQuery.entities.map((entity, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs flex items-center gap-1">
              {getEntityIcon(entity.type)}
              {entity.type}: {entity.value}
            </Badge>
          ))}
          {parsedQuery.sort && (
            <Badge variant="secondary" className="text-xs">
              Sort: {parsedQuery.sort.field} ({parsedQuery.sort.direction})
            </Badge>
          )}
          {parsedQuery.limit && (
            <Badge variant="secondary" className="text-xs">
              Limit: {parsedQuery.limit}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {Math.round(parsedQuery.confidence * 100)}% confidence
          </span>
        </div>
      )}

      {/* Dropdown */}
      {showDropdown && (query || recentQueries.length > 0) && (
        <Card className="absolute z-50 w-full mt-2 shadow-lg">
          <CardContent className="p-0">
            {/* Recent Queries */}
            {!query && recentQueries.length > 0 && (
              <div className="p-3 border-b">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <History className="h-3 w-3" />
                  Recent Searches
                </div>
                <div className="space-y-1">
                  {recentQueries.map((recent, idx) => (
                    <button
                      key={idx}
                      className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2"
                      onClick={() => handleSuggestionClick(recent)}
                    >
                      <Search className="h-3 w-3 text-muted-foreground" />
                      {recent}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="p-3 border-b">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Lightbulb className="h-3 w-3" />
                  Suggestions
                </div>
                <div className="space-y-1">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted flex items-center justify-between group"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <span>{suggestion}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Examples */}
            {!query && (
              <div className="p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Sparkles className="h-3 w-3" />
                  Try asking
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Products under $1000",
                    "Tenders due this week",
                    "Top suppliers",
                    "Medical equipment",
                  ].map((example, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => handleSuggestionClick(example)}
                    >
                      {example}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
