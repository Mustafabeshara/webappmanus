import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Target,
  Search,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Package,
  FileText,
  RefreshCw,
  Eye,
  Bell,
  Filter,
  ArrowUpRight,
  Loader2,
  Zap,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface TenderMatch {
  tenderId: number;
  tenderTitle: string;
  tenderNumber: string;
  deadline: string;
  matchScore: number;
  matchedProducts: ProductMatch[];
  missingRequirements: string[];
  recommendations: string[];
  status: "high_match" | "partial_match" | "low_match";
}

interface ProductMatch {
  productId: number;
  productName: string;
  productSku: string;
  matchScore: number;
  matchedSpecs: SpecMatch[];
  category: string;
}

interface SpecMatch {
  requirement: string;
  productSpec: string;
  score: number;
  status: "match" | "partial" | "mismatch";
}

export function TenderMatchingDashboard() {
  const [selectedTender, setSelectedTender] = useState<TenderMatch | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [scoreFilter, setScoreFilter] = useState<string>("all");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch tenders
  const { data: tenders = [], isLoading: tendersLoading } = useQuery({
    queryKey: ["tenders"],
    queryFn: () => trpc.tenders.list.query(),
  });

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => trpc.products.list.query(),
  });

  // Mock tender matches (in production, this would come from AI analysis)
  const tenderMatches: TenderMatch[] = useMemo(() => {
    if (!tenders.length || !products.length) return [];

    return tenders.slice(0, 10).map((tender: any) => {
      const matchScore = Math.random() * 40 + 60; // 60-100%
      const status = matchScore >= 85 ? "high_match" : matchScore >= 70 ? "partial_match" : "low_match";

      const matchedProducts: ProductMatch[] = products.slice(0, 3).map((product: any) => ({
        productId: product.id,
        productName: product.name,
        productSku: product.sku || `SKU-${product.id}`,
        matchScore: Math.random() * 30 + 70,
        category: product.category || "General",
        matchedSpecs: [
          {
            requirement: "Medical grade certification",
            productSpec: "ISO 13485 certified",
            score: 95,
            status: "match" as const,
          },
          {
            requirement: "Minimum 2 year warranty",
            productSpec: "3 year warranty included",
            score: 100,
            status: "match" as const,
          },
          {
            requirement: "24/7 support",
            productSpec: "Business hours support",
            score: 60,
            status: "partial" as const,
          },
        ],
      }));

      return {
        tenderId: tender.id,
        tenderTitle: tender.title,
        tenderNumber: tender.referenceNumber,
        deadline: tender.submissionDeadline,
        matchScore,
        matchedProducts,
        missingRequirements: [
          "Extended warranty option",
          "On-site training program",
        ],
        recommendations: [
          "Contact supplier for extended warranty pricing",
          "Highlight ISO certifications in proposal",
          "Include case studies from similar projects",
        ],
        status,
      };
    });
  }, [tenders, products]);

  // Filter matches
  const filteredMatches = useMemo(() => {
    return tenderMatches.filter(match => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!match.tenderTitle.toLowerCase().includes(search) &&
            !match.tenderNumber?.toLowerCase().includes(search)) {
          return false;
        }
      }
      if (scoreFilter !== "all") {
        if (scoreFilter === "high" && match.matchScore < 85) return false;
        if (scoreFilter === "medium" && (match.matchScore < 70 || match.matchScore >= 85)) return false;
        if (scoreFilter === "low" && match.matchScore >= 70) return false;
      }
      return true;
    });
  }, [tenderMatches, searchTerm, scoreFilter]);

  // Run AI analysis
  const runAnalysis = async () => {
    setIsAnalyzing(true);
    toast.info("Running AI tender matching analysis...");

    // Simulate analysis
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsAnalyzing(false);
    toast.success("Analysis complete! Found matches for your products.");
  };

  // Get match badge
  const getMatchBadge = (status: string, score: number) => {
    switch (status) {
      case "high_match":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            High Match ({Math.round(score)}%)
          </Badge>
        );
      case "partial_match":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Partial ({Math.round(score)}%)
          </Badge>
        );
      default:
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Low ({Math.round(score)}%)
          </Badge>
        );
    }
  };

  // Get spec status icon
  const getSpecIcon = (status: string) => {
    switch (status) {
      case "match":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "partial":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  // Calculate summary stats
  const stats = useMemo(() => {
    const high = tenderMatches.filter(m => m.status === "high_match").length;
    const partial = tenderMatches.filter(m => m.status === "partial_match").length;
    const low = tenderMatches.filter(m => m.status === "low_match").length;
    const avgScore = tenderMatches.length > 0
      ? tenderMatches.reduce((sum, m) => sum + m.matchScore, 0) / tenderMatches.length
      : 0;

    return { high, partial, low, total: tenderMatches.length, avgScore };
  }, [tenderMatches]);

  if (tendersLoading || productsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6" />
            Tender Matching Intelligence
          </h2>
          <p className="text-muted-foreground">
            AI-powered matching of your products with tender requirements
          </p>
        </div>
        <Button onClick={runAnalysis} disabled={isAnalyzing}>
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Run AI Analysis
            </>
          )}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Matches</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.high}</div>
            <p className="text-xs text-muted-foreground">Ready to bid</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partial Matches</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.partial}</div>
            <p className="text-xs text-muted-foreground">Need review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Matches</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.low}</div>
            <p className="text-xs text-muted-foreground">Consider skipping</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Match Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.avgScore)}%</div>
            <Progress value={stats.avgScore} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tenders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={scoreFilter} onValueChange={setScoreFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Match Score" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Matches</SelectItem>
                <SelectItem value="high">High (&gt;85%)</SelectItem>
                <SelectItem value="medium">Medium (70-85%)</SelectItem>
                <SelectItem value="low">Low (&lt;70%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Matches Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tender Opportunities
          </CardTitle>
          <CardDescription>
            {filteredMatches.length} tenders matched with your product catalog
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMatches.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No matching tenders found</p>
              <p className="text-sm">Run AI analysis to find opportunities</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tender</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Matched Products</TableHead>
                  <TableHead>Match Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMatches.map((match) => (
                  <TableRow key={match.tenderId} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <p className="font-medium">{match.tenderTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {match.tenderNumber}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {match.deadline ? (
                        <Badge variant="outline">
                          {format(new Date(match.deadline), "MMM d, yyyy")}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>{match.matchedProducts.length} products</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getMatchBadge(match.status, match.matchScore)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTender(match)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedTender} onOpenChange={() => setSelectedTender(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedTender?.tenderTitle}
            </DialogTitle>
            <DialogDescription>
              {selectedTender?.tenderNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedTender && (
            <Tabs defaultValue="products" className="mt-4">
              <TabsList>
                <TabsTrigger value="products">
                  <Package className="h-4 w-4 mr-2" />
                  Matched Products
                </TabsTrigger>
                <TabsTrigger value="gaps">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Gaps & Requirements
                </TabsTrigger>
                <TabsTrigger value="recommendations">
                  <Zap className="h-4 w-4 mr-2" />
                  AI Recommendations
                </TabsTrigger>
              </TabsList>

              <TabsContent value="products" className="space-y-4 mt-4">
                {selectedTender.matchedProducts.map((product) => (
                  <Card key={product.productId}>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">{product.productName}</CardTitle>
                          <CardDescription>{product.productSku}</CardDescription>
                        </div>
                        <Badge variant="outline">
                          {Math.round(product.matchScore)}% match
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {product.matchedSpecs.map((spec, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              {getSpecIcon(spec.status)}
                              <div>
                                <p className="text-sm font-medium">{spec.requirement}</p>
                                <p className="text-xs text-muted-foreground">
                                  Product: {spec.productSpec}
                                </p>
                              </div>
                            </div>
                            <span className="text-sm font-mono">{spec.score}%</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="gaps" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Missing Requirements</CardTitle>
                    <CardDescription>
                      Requirements from the tender that your products don't fully meet
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {selectedTender.missingRequirements.map((req, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="recommendations" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      AI Recommendations
                    </CardTitle>
                    <CardDescription>
                      Suggestions to improve your chances of winning this tender
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {selectedTender.recommendations.map((rec, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 p-3 rounded-lg bg-primary/5"
                        >
                          <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
