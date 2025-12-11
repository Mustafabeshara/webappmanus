import { useState, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  Sparkles,
  Package,
  FileText,
  Building2,
  Loader2,
  Clock,
  TrendingUp,
  ArrowRight,
  X,
  Filter,
  History,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchResult {
  id: number;
  type: "product" | "tender" | "supplier" | "document";
  title: string;
  subtitle?: string;
  relevanceScore: number;
  matchedFields: string[];
  highlights: string[];
}

interface SemanticSearchProps {
  onSelect?: (result: SearchResult) => void;
  placeholder?: string;
  searchTypes?: ("product" | "tender" | "supplier" | "document")[];
  showRecent?: boolean;
  showSuggestions?: boolean;
}

export function SemanticSearch({
  onSelect,
  placeholder = "Search with natural language...",
  searchTypes = ["product", "tender", "supplier", "document"],
  showRecent = true,
  showSuggestions = true,
}: SemanticSearchProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  // Fetch products for search
  const { data: products = [] } = trpc.products.list.useQuery();

  // Fetch tenders for search
  const { data: tenders = [] } = trpc.tenders.list.useQuery();

  // Fetch suppliers for search
  const { data: suppliers = [] } = trpc.suppliers.list.useQuery();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("semantic-search-history");
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }
  }, []);

  // Save recent search
  const saveRecentSearch = (searchQuery: string) => {
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("semantic-search-history", JSON.stringify(updated));
  };

  // Semantic search simulation
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    // Simulate semantic search delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const searchLower = searchQuery.toLowerCase();
    const searchTerms = searchLower.split(/\s+/);

    const searchResults: SearchResult[] = [];

    // Search products
    if (searchTypes.includes("product") && (selectedType === "all" || selectedType === "product")) {
      products.forEach((product: any) => {
        const nameMatch = product.name?.toLowerCase().includes(searchLower);
        const descMatch = product.description?.toLowerCase().includes(searchLower);
        const catMatch = product.category?.toLowerCase().includes(searchLower);
        const skuMatch = product.sku?.toLowerCase().includes(searchLower);

        // Calculate relevance score
        let score = 0;
        const matchedFields: string[] = [];
        const highlights: string[] = [];

        if (nameMatch) {
          score += 40;
          matchedFields.push("name");
          highlights.push(product.name);
        }
        if (descMatch) {
          score += 30;
          matchedFields.push("description");
        }
        if (catMatch) {
          score += 20;
          matchedFields.push("category");
        }
        if (skuMatch) {
          score += 35;
          matchedFields.push("sku");
        }

        // Semantic matching - check for related terms
        const semanticMatches = checkSemanticMatch(searchLower, product);
        score += semanticMatches.score;
        matchedFields.push(...semanticMatches.fields);

        if (score > 0) {
          searchResults.push({
            id: product.id,
            type: "product",
            title: product.name,
            subtitle: `${product.category || "Uncategorized"} • ${product.sku || "No SKU"}`,
            relevanceScore: Math.min(score, 100),
            matchedFields,
            highlights,
          });
        }
      });
    }

    // Search tenders
    if (searchTypes.includes("tender") && (selectedType === "all" || selectedType === "tender")) {
      tenders.forEach((tender: any) => {
        const titleMatch = tender.title?.toLowerCase().includes(searchLower);
        const refMatch = tender.referenceNumber?.toLowerCase().includes(searchLower);
        const deptMatch = tender.department?.toLowerCase().includes(searchLower);

        let score = 0;
        const matchedFields: string[] = [];

        if (titleMatch) {
          score += 45;
          matchedFields.push("title");
        }
        if (refMatch) {
          score += 40;
          matchedFields.push("reference");
        }
        if (deptMatch) {
          score += 25;
          matchedFields.push("department");
        }

        if (score > 0) {
          searchResults.push({
            id: tender.id,
            type: "tender",
            title: tender.title,
            subtitle: tender.referenceNumber,
            relevanceScore: Math.min(score, 100),
            matchedFields,
            highlights: [],
          });
        }
      });
    }

    // Search suppliers
    if (searchTypes.includes("supplier") && (selectedType === "all" || selectedType === "supplier")) {
      suppliers.forEach((supplier: any) => {
        const nameMatch = supplier.name?.toLowerCase().includes(searchLower);
        const contactMatch = supplier.contactPerson?.toLowerCase().includes(searchLower);

        let score = 0;
        const matchedFields: string[] = [];

        if (nameMatch) {
          score += 50;
          matchedFields.push("name");
        }
        if (contactMatch) {
          score += 30;
          matchedFields.push("contact");
        }

        if (score > 0) {
          searchResults.push({
            id: supplier.id,
            type: "supplier",
            title: supplier.name,
            subtitle: supplier.contactPerson,
            relevanceScore: Math.min(score, 100),
            matchedFields,
            highlights: [],
          });
        }
      });
    }

    // Sort by relevance
    searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    setResults(searchResults.slice(0, 20));
    setIsSearching(false);
    setShowResults(true);
  }, [products, tenders, suppliers, selectedType, searchTypes]);

  // Semantic matching helper
  const checkSemanticMatch = (query: string, product: any): { score: number; fields: string[] } => {
    const semanticGroups: Record<string, string[]> = {
      medical: ["healthcare", "clinical", "hospital", "patient", "diagnostic"],
      equipment: ["device", "machine", "apparatus", "instrument", "tool"],
      monitor: ["display", "screen", "tracking", "surveillance", "vital"],
      surgical: ["operation", "procedure", "sterile", "instrument"],
      diagnostic: ["testing", "analysis", "examination", "imaging"],
    };

    let score = 0;
    const fields: string[] = [];

    for (const [key, synonyms] of Object.entries(semanticGroups)) {
      if (query.includes(key) || synonyms.some(s => query.includes(s))) {
        const productText = `${product.name} ${product.description} ${product.category}`.toLowerCase();
        if (productText.includes(key) || synonyms.some(s => productText.includes(s))) {
          score += 15;
          fields.push("semantic");
          break;
        }
      }
    }

    return { score, fields };
  };

  // Effect for debounced search
  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
      setShowResults(false);
    }
  }, [debouncedQuery, performSearch]);

  // Handle select
  const handleSelect = (result: SearchResult) => {
    saveRecentSearch(query);
    onSelect?.(result);
    setShowResults(false);
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "product":
        return <Package className="h-4 w-4" />;
      case "tender":
        return <FileText className="h-4 w-4" />;
      case "supplier":
        return <Building2 className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Get type color
  const getTypeColor = (type: string) => {
    switch (type) {
      case "product":
        return "bg-blue-100 text-blue-800";
      case "tender":
        return "bg-purple-100 text-purple-800";
      case "supplier":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Suggested queries
  const suggestedQueries = [
    "medical diagnostic equipment",
    "hospital monitors",
    "surgical instruments",
    "patient care devices",
    "laboratory equipment",
  ];

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="pl-10 pr-10"
            onFocus={() => setShowResults(true)}
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {query && !isSearching && (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {searchTypes.includes("product") && (
              <SelectItem value="product">Products</SelectItem>
            )}
            {searchTypes.includes("tender") && (
              <SelectItem value="tender">Tenders</SelectItem>
            )}
            {searchTypes.includes("supplier") && (
              <SelectItem value="supplier">Suppliers</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Results Dropdown */}
      {showResults && (
        <Card className="absolute z-50 w-full mt-2 shadow-lg max-h-96 overflow-auto">
          <CardContent className="p-0">
            {/* Recent Searches */}
            {showRecent && !query && recentSearches.length > 0 && (
              <div className="p-3 border-b">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <History className="h-3 w-3" />
                  Recent Searches
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary/20"
                      onClick={() => setQuery(search)}
                    >
                      {search}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {showSuggestions && !query && (
              <div className="p-3 border-b">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Lightbulb className="h-3 w-3" />
                  Try searching for
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedQueries.map((suggestion, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => setQuery(suggestion)}
                    >
                      {suggestion}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            {query && (
              <>
                {results.length === 0 && !isSearching && (
                  <div className="p-6 text-center text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No results found for "{query}"</p>
                    <p className="text-xs mt-1">Try different keywords or check spelling</p>
                  </div>
                )}

                {results.length > 0 && (
                  <div className="divide-y">
                    {results.map((result) => (
                      <div
                        key={`${result.type}-${result.id}`}
                        className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleSelect(result)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`p-1.5 rounded ${getTypeColor(result.type)}`}>
                              {getTypeIcon(result.type)}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{result.title}</p>
                              {result.subtitle && (
                                <p className="text-xs text-muted-foreground">
                                  {result.subtitle}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {result.type}
                                </Badge>
                                {result.matchedFields.length > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    Matched: {result.matchedFields.join(", ")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <div className="text-xs font-medium text-primary">
                                {result.relevanceScore}%
                              </div>
                              <div className="text-xs text-muted-foreground">match</div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
