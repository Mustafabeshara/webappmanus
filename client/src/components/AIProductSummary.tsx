import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  Tag,
  Target,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ProductSpec {
  [key: string]: string | number | boolean;
}

interface AIProductSummaryProps {
  productId: number;
  productName: string;
  productDescription?: string;
  productSpecs?: ProductSpec;
  productCategory?: string;
  onSummaryGenerated?: (summary: ProductSummary) => void;
}

interface ProductSummary {
  shortDescription: string;
  marketingDescription: string;
  technicalSummary: string;
  keyFeatures: string[];
  targetApplications: string[];
  competitiveAdvantages: string[];
  suggestedKeywords: string[];
}

export function AIProductSummary({
  productId: _productId,
  productName,
  productDescription: _productDescription,
  productSpecs,
  productCategory,
  onSummaryGenerated,
}: AIProductSummaryProps) {
  const [summary, setSummary] = useState<ProductSummary | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["short", "features"])
  );

  // Generate AI summary
  const generateSummary = async () => {
    setIsGenerating(true);

    try {
      // In production, this would call the AI service
      // For now, simulate AI response
      await new Promise(resolve => setTimeout(resolve, 1500));

      const generatedSummary: ProductSummary = {
        shortDescription: `${productName} is a high-quality ${productCategory || "product"} designed for professional healthcare applications. It combines reliability with advanced features to meet demanding clinical requirements.`,
        marketingDescription: `Introducing ${productName} - the next generation solution for healthcare professionals. Built with precision engineering and designed for reliability, this ${productCategory || "product"} delivers exceptional performance in critical healthcare environments. With its intuitive design and robust construction, it helps healthcare facilities maintain the highest standards of patient care while optimizing operational efficiency.`,
        technicalSummary: `${productName} features state-of-the-art technology with comprehensive specifications designed for healthcare compliance. ${
          productSpecs
            ? `Key specifications include: ${Object.entries(productSpecs)
                .slice(0, 3)
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ")}.`
            : ""
        } The product meets international quality standards and is backed by comprehensive technical support.`,
        keyFeatures: [
          "Medical-grade materials and construction",
          "Compliant with international healthcare standards",
          "Easy maintenance and long service life",
          "Ergonomic design for user comfort",
          "Comprehensive warranty coverage",
        ],
        targetApplications: [
          "Hospitals and medical centers",
          "Diagnostic laboratories",
          "Outpatient clinics",
          "Research facilities",
          "Emergency care units",
        ],
        competitiveAdvantages: [
          "Superior build quality vs competitors",
          "Comprehensive local support network",
          "Competitive total cost of ownership",
          "Proven track record in regional healthcare",
        ],
        suggestedKeywords: [
          productCategory || "medical equipment",
          "healthcare",
          "clinical",
          "hospital supplies",
          productName.toLowerCase(),
        ],
      };

      setSummary(generatedSummary);
      onSummaryGenerated?.(generatedSummary);
      toast.success("AI summary generated successfully!");
    } catch (_error) {
      toast.error("Failed to generate summary. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Toggle section
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">AI Product Summary</CardTitle>
              <CardDescription>
                Generate AI-powered descriptions and marketing content
              </CardDescription>
            </div>
          </div>
          <Button onClick={generateSummary} disabled={isGenerating} size="sm">
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : summary ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!summary && !isGenerating && (
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Click "Generate" to create AI-powered product content</p>
            <p className="text-sm mt-2">
              The AI will analyze the product and create descriptions,
              <br />
              features, and marketing content.
            </p>
          </div>
        )}

        {isGenerating && (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-muted-foreground">
              Analyzing product and generating content...
            </p>
          </div>
        )}

        {summary && (
          <div className="space-y-4">
            {/* Short Description */}
            <Collapsible
              open={expandedSections.has("short")}
              onOpenChange={() => toggleSection("short")}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-2">
                  {expandedSections.has("short") ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Short Description</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation();
                    copyToClipboard(summary.shortDescription, "short");
                  }}
                >
                  {copiedField === "short" ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 px-3">
                <p className="text-sm leading-relaxed">
                  {summary.shortDescription}
                </p>
              </CollapsibleContent>
            </Collapsible>

            {/* Marketing Description */}
            <Collapsible
              open={expandedSections.has("marketing")}
              onOpenChange={() => toggleSection("marketing")}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-2">
                  {expandedSections.has("marketing") ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Marketing Description</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation();
                    copyToClipboard(summary.marketingDescription, "marketing");
                  }}
                >
                  {copiedField === "marketing" ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 px-3">
                <p className="text-sm leading-relaxed">
                  {summary.marketingDescription}
                </p>
              </CollapsibleContent>
            </Collapsible>

            {/* Key Features */}
            <Collapsible
              open={expandedSections.has("features")}
              onOpenChange={() => toggleSection("features")}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-2">
                  {expandedSections.has("features") ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <Lightbulb className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Key Features</span>
                  <Badge variant="secondary" className="ml-2">
                    {summary.keyFeatures.length}
                  </Badge>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 px-3">
                <ul className="space-y-2">
                  {summary.keyFeatures.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>

            {/* Target Applications */}
            <Collapsible
              open={expandedSections.has("applications")}
              onOpenChange={() => toggleSection("applications")}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-2">
                  {expandedSections.has("applications") ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Target Applications</span>
                  <Badge variant="secondary" className="ml-2">
                    {summary.targetApplications.length}
                  </Badge>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 px-3">
                <div className="flex flex-wrap gap-2">
                  {summary.targetApplications.map((app, idx) => (
                    <Badge key={idx} variant="outline">
                      {app}
                    </Badge>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Competitive Advantages */}
            <Collapsible
              open={expandedSections.has("advantages")}
              onOpenChange={() => toggleSection("advantages")}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-2">
                  {expandedSections.has("advantages") ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Competitive Advantages</span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 px-3">
                <ul className="space-y-2">
                  {summary.competitiveAdvantages.map((adv, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      {adv}
                    </li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>

            {/* Keywords */}
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Suggested Keywords</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {summary.suggestedKeywords.map((keyword, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary/20"
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
