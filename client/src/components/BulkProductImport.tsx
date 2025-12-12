import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { trpc, trpcClient } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Package,
  Upload,
  Check,
  X,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Search,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

interface ExtractedProduct {
  sku: string;
  name: string;
  description?: string;
  shortDescription?: string;
  category?: string;
  subcategory?: string;
  unitPrice?: number;
  unit?: string;
  specifications?: Record<string, any>;
  features?: string[];
  manufacturer?: string;
  brand?: string;
  minimumOrder?: number;
  leadTime?: string;
}

interface BulkProductImportProps {
  products: ExtractedProduct[];
  supplierId?: number;
  onComplete?: (results: ImportResults) => void;
  onCancel?: () => void;
}

interface ImportResults {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export function BulkProductImport({
  products,
  supplierId: initialSupplierId,
  onComplete,
  onCancel,
}: BulkProductImportProps) {
  const queryClient = useQueryClient();
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(
    new Set(products.map((_, idx) => idx))
  );
  const [supplierId, setSupplierId] = useState<number | null>(initialSupplierId || null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Fetch suppliers
  const { data: suppliers = [] } = trpc.suppliers.list.useQuery();

  // Get unique categories from products
  const categories = Array.from(
    new Set(products.map(p => p.category || "Uncategorized"))
  );

  // Filter products
  const filteredProducts = products.filter((product, idx) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (
        !product.name.toLowerCase().includes(search) &&
        !product.sku?.toLowerCase().includes(search) &&
        !product.description?.toLowerCase().includes(search)
      ) {
        return false;
      }
    }
    if (categoryFilter !== "all" && product.category !== categoryFilter) {
      return false;
    }
    return true;
  });

  // Toggle product selection
  const toggleProduct = (idx: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(idx)) {
      newSelected.delete(idx);
    } else {
      newSelected.add(idx);
    }
    setSelectedProducts(newSelected);
  };

  // Select all filtered products
  const selectAllFiltered = () => {
    const newSelected = new Set(selectedProducts);
    filteredProducts.forEach((_, idx) => {
      const originalIdx = products.indexOf(filteredProducts[idx]);
      newSelected.add(originalIdx);
    });
    setSelectedProducts(newSelected);
  };

  // Deselect all filtered products
  const deselectAllFiltered = () => {
    const newSelected = new Set(selectedProducts);
    filteredProducts.forEach((_, idx) => {
      const originalIdx = products.indexOf(filteredProducts[idx]);
      newSelected.delete(originalIdx);
    });
    setSelectedProducts(newSelected);
  };

  // Format currency
  const formatCurrency = (cents?: number) => {
    if (!cents && cents !== 0) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  // Import selected products
  const handleImport = async () => {
    if (!supplierId) {
      toast.error("Please select a supplier");
      return;
    }

    if (selectedProducts.size === 0) {
      toast.error("Please select at least one product to import");
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    const results: ImportResults = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    const selectedArray = Array.from(selectedProducts);
    const total = selectedArray.length;

    for (let i = 0; i < selectedArray.length; i++) {
      const product = products[selectedArray[i]];
      setImportProgress(Math.round(((i + 1) / total) * 100));

      try {
        // Check if product with SKU already exists
        const existingProducts = await trpcClient.products.list.query();
        const existing = existingProducts.find(
          (p: any) => p.sku === product.sku
        );

        if (existing) {
          // Update existing product
          await trpcClient.products.update.mutate({
            id: existing.id,
            name: product.name,
            description: product.description || product.shortDescription || "",
            category: product.category || "Uncategorized",
            unitPrice: product.unitPrice || 0,
            unit: product.unit || "each",
          });
          results.updated++;
        } else {
          // Create new product (SKU is auto-generated by the server)
          await trpcClient.products.create.mutate({
            name: product.name,
            description: product.description || product.shortDescription || "",
            category: product.category || "Uncategorized",
            unitPrice: product.unitPrice || 0,
            unit: product.unit || "each",
            initialQuantity: 0,
            minStockLevel: product.minimumOrder || 1,
          });
          results.imported++;
        }
      } catch (error) {
        results.errors.push(
          `${product.sku || product.name}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    setIsImporting(false);
    setImportResults(results);

    // Invalidate products query
    queryClient.invalidateQueries({ queryKey: ["products"] });

    if (results.errors.length === 0) {
      toast.success(
        `Successfully imported ${results.imported} and updated ${results.updated} products`
      );
    } else {
      toast.warning(
        `Imported ${results.imported}, updated ${results.updated}, ${results.errors.length} errors`
      );
    }

    onComplete?.(results);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6" />
            <div>
              <CardTitle>Bulk Product Import</CardTitle>
              <CardDescription>
                {products.length} products extracted from catalog
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-sm">
            {selectedProducts.size} selected
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Supplier Selection */}
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Label>Assign to Supplier</Label>
            <Select
              value={supplierId?.toString() || ""}
              onValueChange={(v) => setSupplierId(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select supplier..." />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s: any) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAllFiltered}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAllFiltered}>
              Deselect All
            </Button>
          </div>
        </div>

        {/* Products Table */}
        <div className="rounded-md border max-h-96 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="min-w-[200px]">Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product, idx) => {
                const originalIdx = products.indexOf(product);
                const isSelected = selectedProducts.has(originalIdx);
                return (
                  <TableRow
                    key={idx}
                    className={isSelected ? "bg-muted/50" : ""}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleProduct(originalIdx)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {product.sku || "-"}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.shortDescription && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {product.shortDescription}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {product.category || "Uncategorized"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(product.unitPrice)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.unit || "each"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Import Progress */}
        {isImporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing products...
              </span>
              <span>{importProgress}%</span>
            </div>
            <Progress value={importProgress} />
          </div>
        )}

        {/* Import Results */}
        {importResults && (
          <div className="p-4 rounded-lg bg-muted space-y-2">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Import Complete
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>{importResults.imported} imported</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-500" />
                <span>{importResults.updated} updated</span>
              </div>
              {importResults.errors.length > 0 && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{importResults.errors.length} errors</span>
                </div>
              )}
            </div>
            {importResults.errors.length > 0 && (
              <div className="text-xs text-red-600 mt-2">
                {importResults.errors.slice(0, 3).map((err, idx) => (
                  <p key={idx}>{err}</p>
                ))}
                {importResults.errors.length > 3 && (
                  <p>...and {importResults.errors.length - 3} more errors</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || selectedProducts.size === 0 || !supplierId}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import {selectedProducts.size} Products
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
