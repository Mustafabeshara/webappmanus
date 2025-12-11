import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Package,
  DollarSign,
  Clipboard,
  Download,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface ExtractedField {
  value: any;
  confidence: number;
  source: string;
}

interface ExtractionResultViewerProps {
  extractedData: Record<string, ExtractedField>;
  documentType: string;
  documentText?: string;
  onImportProducts?: (products: any[]) => void;
  onCreateRecord?: (data: Record<string, any>) => void;
}

export function ExtractionResultViewer({
  extractedData,
  documentType,
  documentText,
  onImportProducts,
  onCreateRecord,
}: ExtractionResultViewerProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(["items", "products"]));
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-500";
    if (confidence >= 0.6) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    return "Low";
  };

  const toggleExpand = (key: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedItems(newExpanded);
  };

  const copyToClipboard = async (value: any, fieldName: string) => {
    const textValue = typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
    await navigator.clipboard.writeText(textValue);
    setCopiedField(fieldName);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatCurrency = (cents: number) => {
    if (!cents && cents !== 0) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const formatFieldName = (key: string) => {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  // Separate items/products from other fields
  const itemsField = extractedData.items || extractedData.products;
  const itemsKey = extractedData.items ? "items" : extractedData.products ? "products" : null;
  const otherFields = Object.entries(extractedData).filter(
    ([key]) => key !== "items" && key !== "products" && key !== "rawText"
  );

  const renderFieldValue = (key: string, field: ExtractedField) => {
    const { value, confidence } = field;

    if (value === null || value === undefined || value === "") {
      return <span className="text-muted-foreground italic">Not found</span>;
    }

    // Handle arrays (for categories, features, etc.)
    if (Array.isArray(value) && !["items", "products"].includes(key)) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((item, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {String(item)}
            </Badge>
          ))}
        </div>
      );
    }

    // Handle numbers (especially currency values in cents)
    if (typeof value === "number") {
      const currencyFields = [
        "subtotal", "taxAmount", "discountAmount", "totalAmount",
        "unitPrice", "bulkPrice", "totalPrice"
      ];
      if (currencyFields.includes(key)) {
        return <span className="font-mono">{formatCurrency(value)}</span>;
      }
      if (key === "taxRate") {
        return <span>{value}%</span>;
      }
      return <span className="font-mono">{value.toLocaleString()}</span>;
    }

    // Handle objects (like specifications)
    if (typeof value === "object" && value !== null) {
      return (
        <div className="text-sm">
          {Object.entries(value).map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <span className="text-muted-foreground">{k}:</span>
              <span>{String(v)}</span>
            </div>
          ))}
        </div>
      );
    }

    return <span>{String(value)}</span>;
  };

  const renderLineItems = () => {
    if (!itemsField || !Array.isArray(itemsField.value) || itemsField.value.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No line items extracted</p>
        </div>
      );
    }

    const items = itemsField.value;
    const isProductCatalog = documentType === "products";
    const isPriceList = documentType === "pricing";

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{items.length} items</Badge>
            <span className={`h-2 w-2 rounded-full ${getConfidenceColor(itemsField.confidence)}`} />
            <span className="text-xs text-muted-foreground">
              {getConfidenceLabel(itemsField.confidence)} confidence
            </span>
          </div>
          {onImportProducts && (isProductCatalog || isPriceList) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onImportProducts(items)}
            >
              <Download className="h-4 w-4 mr-2" />
              Import All to Inventory
            </Button>
          )}
        </div>

        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="min-w-[200px]">Description</TableHead>
                {!isProductCatalog && <TableHead className="text-right">Qty</TableHead>}
                <TableHead className="text-right">Unit Price</TableHead>
                {!isProductCatalog && !isPriceList && (
                  <TableHead className="text-right">Total</TableHead>
                )}
                {isProductCatalog && <TableHead>Category</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.sku || item.productCode || "-"}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.name || item.description}</p>
                      {item.shortDescription && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.shortDescription}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  {!isProductCatalog && (
                    <TableCell className="text-right font-mono">
                      {item.quantity || "-"} {item.unit || ""}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-mono">
                    {formatCurrency(item.unitPrice)}
                  </TableCell>
                  {!isProductCatalog && !isPriceList && (
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(item.totalPrice)}
                    </TableCell>
                  )}
                  {isProductCatalog && (
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {item.category || "Uncategorized"}
                      </Badge>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const getDocumentIcon = () => {
    switch (documentType) {
      case "invoices":
        return <FileText className="h-5 w-5" />;
      case "products":
      case "pricing":
        return <Package className="h-5 w-5" />;
      case "purchase_orders":
        return <Clipboard className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getDocumentTitle = () => {
    switch (documentType) {
      case "invoices":
        return "Invoice Details";
      case "products":
        return "Product Catalog";
      case "pricing":
        return "Price List";
      case "purchase_orders":
        return "Purchase Order";
      case "expenses":
        return "Expense Details";
      case "suppliers":
        return "Supplier Information";
      case "tenders":
        return "Tender Details";
      default:
        return "Extracted Data";
    }
  };

  // Calculate overall extraction quality
  const confidenceValues = Object.values(extractedData)
    .filter(f => f.value !== null && f.value !== undefined && f.value !== "")
    .map(f => f.confidence);
  const avgConfidence = confidenceValues.length > 0
    ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getDocumentIcon()}
            <div>
              <CardTitle>{getDocumentTitle()}</CardTitle>
              <CardDescription>
                Extracted {Object.keys(extractedData).length} fields
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${getConfidenceColor(avgConfidence)}`} />
            <span className="text-sm text-muted-foreground">
              {Math.round(avgConfidence * 100)}% overall confidence
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="fields" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="fields">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Fields
            </TabsTrigger>
            {itemsKey && (
              <TabsTrigger value="items">
                <Package className="h-4 w-4 mr-2" />
                Line Items ({(itemsField?.value || []).length})
              </TabsTrigger>
            )}
            {documentText && (
              <TabsTrigger value="raw">
                <FileText className="h-4 w-4 mr-2" />
                Raw Text
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="fields" className="space-y-3">
            {otherFields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No fields extracted</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {otherFields.map(([key, field]) => (
                  <div
                    key={key}
                    className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{formatFieldName(key)}</span>
                        <span
                          className={`h-2 w-2 rounded-full ${getConfidenceColor(field.confidence)}`}
                          title={`${Math.round(field.confidence * 100)}% confidence`}
                        />
                      </div>
                      <div className="text-sm">{renderFieldValue(key, field)}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 h-8 w-8 p-0"
                      onClick={() => copyToClipboard(field.value, key)}
                    >
                      {copiedField === key ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {itemsKey && (
            <TabsContent value="items">
              {renderLineItems()}
            </TabsContent>
          )}

          {documentText && (
            <TabsContent value="raw">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(documentText, "rawText")}
                >
                  {copiedField === "rawText" ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <pre className="p-4 rounded-lg bg-muted text-xs overflow-auto max-h-96 font-mono whitespace-pre-wrap">
                  {documentText}
                </pre>
              </div>
            </TabsContent>
          )}
        </Tabs>

        {onCreateRecord && (
          <div className="mt-6 pt-4 border-t flex justify-end">
            <Button onClick={() => {
              const recordData: Record<string, any> = {};
              Object.entries(extractedData).forEach(([key, field]) => {
                if (field.value !== null && field.value !== undefined && field.value !== "") {
                  recordData[key] = field.value;
                }
              });
              onCreateRecord(recordData);
            }}>
              Create Record from Extracted Data
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
