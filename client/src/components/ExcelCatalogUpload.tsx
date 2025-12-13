import { useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Upload,
  FileSpreadsheet,
  Check,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Search,
  Filter,
  Download,
  X,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { trpc, trpcClient } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";

// Column mapping types
interface ColumnMapping {
  productName: string;
  productCode: string;
  price: string;
  description: string;
  competitors: string;
  specifications: string;
  category: string;
  unit: string;
  targetCustomers: string;
  indication: string;
  prevalence: string;
  demand: string;
}

// Parsed product from Excel
export interface ParsedCatalogProduct {
  productName: string;
  productCode: string;
  price: number | null;
  description: string;
  competitors: string[];
  specifications: Record<string, string>;
  category: string;
  unit: string;
  targetCustomers: string[];
  indication: string;
  prevalence: string;
  demand: string;
  rawData: Record<string, any>;
}

interface ImportResults {
  imported: number;
  updated: number;
  errors: string[];
}

interface ExcelCatalogUploadProps {
  supplierId?: number;
  onComplete?: (products: ParsedCatalogProduct[]) => void;
  onImportComplete?: (results: ImportResults) => void;
}

const DEFAULT_MAPPING: ColumnMapping = {
  productName: "name",
  productCode: "code",
  price: "price",
  description: "description",
  competitors: "competitors",
  specifications: "specs",
  category: "category",
  unit: "unit",
  targetCustomers: "target_customers",
  indication: "indication",
  prevalence: "prevalence",
  demand: "demand",
};

export function ExcelCatalogUpload({
  supplierId: initialSupplierId,
  onComplete,
  onImportComplete,
}: ExcelCatalogUploadProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [parsedProducts, setParsedProducts] = useState<ParsedCatalogProduct[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>(DEFAULT_MAPPING);
  const [showMapping, setShowMapping] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [supplierId, setSupplierId] = useState<number | null>(initialSupplierId || null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [previewProduct, setPreviewProduct] = useState<ParsedCatalogProduct | null>(null);

  const { data: suppliers = [] } = trpc.suppliers.list.useQuery();

  // Parse Excel file
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) {
          toast.error("Excel file must have at least a header row and one data row");
          return;
        }

        // Extract headers (first row)
        const headerRow = jsonData[0].map((h: any) => String(h || "").trim());
        setHeaders(headerRow);

        // Convert rows to objects
        const dataRows = jsonData.slice(1).map((row) => {
          const obj: Record<string, any> = {};
          headerRow.forEach((header, idx) => {
            obj[header] = row[idx];
          });
          return obj;
        }).filter(row => Object.values(row).some(v => v !== undefined && v !== ""));

        setRawData(dataRows);

        // Auto-detect column mapping
        autoDetectMapping(headerRow);

        setShowMapping(true);
        toast.success(`Loaded ${dataRows.length} rows from Excel`);
      } catch (error) {
        toast.error("Failed to parse Excel file");
        console.error(error);
      }
    };

    reader.readAsArrayBuffer(uploadedFile);
  }, []);

  // Auto-detect column mapping based on header names
  const autoDetectMapping = (headerRow: string[]) => {
    const lowerHeaders = headerRow.map(h => h.toLowerCase());
    const newMapping = { ...DEFAULT_MAPPING };

    const mappings: [keyof ColumnMapping, string[]][] = [
      ["productName", ["name", "product name", "product", "item name", "item", "title"]],
      ["productCode", ["code", "product code", "sku", "item code", "part number", "part no", "ref"]],
      ["price", ["price", "unit price", "cost", "amount", "rate"]],
      ["description", ["description", "desc", "details", "product description"]],
      ["competitors", ["competitors", "competition", "competing products", "rival products"]],
      ["specifications", ["specs", "specifications", "spec", "technical specs", "features"]],
      ["category", ["category", "cat", "type", "product type", "group"]],
      ["unit", ["unit", "uom", "unit of measure", "packaging"]],
      ["targetCustomers", ["target", "target customers", "customers", "market segment", "audience"]],
      ["indication", ["indication", "use", "usage", "application", "medical indication"]],
      ["prevalence", ["prevalence", "market prevalence", "market size"]],
      ["demand", ["demand", "market demand", "popularity"]],
    ];

    mappings.forEach(([key, variants]) => {
      const matchIndex = lowerHeaders.findIndex(h =>
        variants.some(v => h.includes(v))
      );
      if (matchIndex >= 0) {
        newMapping[key] = headerRow[matchIndex];
      }
    });

    setColumnMapping(newMapping);
  };

  // Apply mapping and parse products
  const applyMapping = () => {
    const products: ParsedCatalogProduct[] = rawData.map((row) => {
      // Parse price
      let price: number | null = null;
      const priceValue = row[columnMapping.price];
      if (priceValue !== undefined && priceValue !== "") {
        const parsed = parseFloat(String(priceValue).replace(/[^0-9.-]/g, ""));
        if (!isNaN(parsed)) {
          price = Math.round(parsed * 100); // Convert to cents
        }
      }

      // Parse competitors (comma-separated or JSON)
      let competitors: string[] = [];
      const compValue = row[columnMapping.competitors];
      if (compValue) {
        try {
          competitors = JSON.parse(compValue);
        } catch {
          competitors = String(compValue).split(/[,;]/).map(s => s.trim()).filter(Boolean);
        }
      }

      // Parse specifications
      let specifications: Record<string, string> = {};
      const specValue = row[columnMapping.specifications];
      if (specValue) {
        try {
          specifications = JSON.parse(specValue);
        } catch {
          // Parse "key: value; key2: value2" format
          String(specValue).split(/[;|]/).forEach(pair => {
            const [key, val] = pair.split(":").map(s => s.trim());
            if (key && val) {
              specifications[key] = val;
            }
          });
        }
      }

      // Parse target customers
      let targetCustomers: string[] = [];
      const targetValue = row[columnMapping.targetCustomers];
      if (targetValue) {
        try {
          targetCustomers = JSON.parse(targetValue);
        } catch {
          targetCustomers = String(targetValue).split(/[,;]/).map(s => s.trim()).filter(Boolean);
        }
      }

      return {
        productName: String(row[columnMapping.productName] || "").trim(),
        productCode: String(row[columnMapping.productCode] || "").trim(),
        price,
        description: String(row[columnMapping.description] || "").trim(),
        competitors,
        specifications,
        category: String(row[columnMapping.category] || "").trim(),
        unit: String(row[columnMapping.unit] || "piece").trim(),
        targetCustomers,
        indication: String(row[columnMapping.indication] || "").trim(),
        prevalence: String(row[columnMapping.prevalence] || "").trim(),
        demand: String(row[columnMapping.demand] || "medium").trim(),
        rawData: row,
      };
    }).filter(p => p.productName); // Filter out empty rows

    setParsedProducts(products);
    setSelectedProducts(new Set(products.map((_, idx) => idx)));
    setShowMapping(false);

    if (onComplete) {
      onComplete(products);
    }

    toast.success(`Parsed ${products.length} products`);
  };

  // Get unique categories
  const categories = Array.from(
    new Set(parsedProducts.map(p => p.category || "Uncategorized"))
  ).filter(Boolean);

  // Filter products
  const filteredProducts = parsedProducts.filter((product) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (
        !product.productName.toLowerCase().includes(search) &&
        !product.productCode.toLowerCase().includes(search) &&
        !product.description.toLowerCase().includes(search)
      ) {
        return false;
      }
    }
    if (categoryFilter !== "all" && product.category !== categoryFilter) {
      return false;
    }
    return true;
  });

  // Toggle selection
  const toggleProduct = (idx: number) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(idx)) {
      newSelected.delete(idx);
    } else {
      newSelected.add(idx);
    }
    setSelectedProducts(newSelected);
  };

  const selectAll = () => {
    setSelectedProducts(new Set(filteredProducts.map((_, idx) => {
      const originalIdx = parsedProducts.indexOf(filteredProducts[idx]);
      return originalIdx;
    })));
  };

  const deselectAll = () => {
    setSelectedProducts(new Set());
  };

  // Format currency
  const formatCurrency = (cents: number | null) => {
    if (cents === null) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  // Import products to database
  const handleImport = async () => {
    if (!supplierId) {
      toast.error("Please select a supplier");
      return;
    }

    if (selectedProducts.size === 0) {
      toast.error("Please select at least one product");
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    const results: ImportResults = {
      imported: 0,
      updated: 0,
      errors: [],
    };

    const selectedArray = Array.from(selectedProducts);
    const total = selectedArray.length;

    for (let i = 0; i < selectedArray.length; i++) {
      const product = parsedProducts[selectedArray[i]];
      setImportProgress(Math.round(((i + 1) / total) * 100));

      try {
        // Check if product exists
        const existingProducts = await trpcClient.products.list.query();
        const existing = existingProducts.find(
          (p: any) => p.sku === product.productCode || p.name === product.productName
        );

        if (existing) {
          // Update existing product
          await trpcClient.products.update.mutate({
            id: existing.id,
            name: product.productName,
            description: product.description,
            category: product.category || "Uncategorized",
            unitPrice: product.price || 0,
            unit: product.unit,
            manufacturerId: supplierId,
          });
          results.updated++;
        } else {
          // Create new product
          await trpcClient.products.create.mutate({
            name: product.productName,
            description: product.description,
            category: product.category || "Uncategorized",
            unitPrice: product.price || 0,
            unit: product.unit,
            manufacturerId: supplierId,
            specifications: JSON.stringify(product.specifications),
            initialQuantity: 0,
            minStockLevel: 1,
          });
          results.imported++;
        }
      } catch (error) {
        results.errors.push(
          `${product.productCode || product.productName}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    setIsImporting(false);
    setImportResults(results);

    queryClient.invalidateQueries({ queryKey: ["products"] });

    if (results.errors.length === 0) {
      toast.success(
        `Imported ${results.imported} and updated ${results.updated} products`
      );
    } else {
      toast.warning(
        `Imported ${results.imported}, updated ${results.updated}, ${results.errors.length} errors`
      );
    }

    if (onImportComplete) {
      onImportComplete(results);
    }
  };

  // Download template
  const downloadTemplate = () => {
    const template = [
      {
        name: "Product Name Example",
        code: "PROD-001",
        price: "99.99",
        description: "Product description here",
        competitors: "Competitor A, Competitor B",
        specs: "Weight: 1kg; Dimensions: 10x10x10cm",
        category: "Medical Equipment",
        unit: "piece",
        target_customers: "Hospitals, Clinics",
        indication: "Diagnostic imaging",
        prevalence: "High",
        demand: "high",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Catalog Template");
    XLSX.writeFile(wb, "catalog_template.xlsx");
  };

  // Reset state
  const reset = () => {
    setFile(null);
    setHeaders([]);
    setRawData([]);
    setParsedProducts([]);
    setSelectedProducts(new Set());
    setImportResults(null);
    setShowMapping(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-6 w-6" />
            <div>
              <CardTitle>Excel Catalog Upload</CardTitle>
              <CardDescription>
                Upload an Excel file to import products into the catalog
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!file && (
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Click to upload Excel file</p>
            <p className="text-sm text-muted-foreground mt-1">
              Supports .xlsx and .xls files
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}

        {/* Column Mapping Dialog */}
        <Dialog open={showMapping} onOpenChange={setShowMapping}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Map Excel Columns</DialogTitle>
              <DialogDescription>
                Match your Excel columns to the product fields
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              {(Object.keys(columnMapping) as (keyof ColumnMapping)[]).map((key) => (
                <div key={key} className="space-y-1">
                  <Label className="text-sm capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </Label>
                  <Select
                    value={columnMapping[key]}
                    onValueChange={(value) =>
                      setColumnMapping({ ...columnMapping, [key]: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-- Not mapped --</SelectItem>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowMapping(false)}>
                Cancel
              </Button>
              <Button onClick={applyMapping}>Apply Mapping</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Product Preview Dialog */}
        <Dialog open={!!previewProduct} onOpenChange={() => setPreviewProduct(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{previewProduct?.productName}</DialogTitle>
              <DialogDescription>
                Code: {previewProduct?.productCode || "N/A"}
              </DialogDescription>
            </DialogHeader>
            {previewProduct && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Price</Label>
                    <p className="font-medium">{formatCurrency(previewProduct.price)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Category</Label>
                    <p className="font-medium">{previewProduct.category || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Unit</Label>
                    <p className="font-medium">{previewProduct.unit}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Demand</Label>
                    <Badge variant="outline">{previewProduct.demand}</Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1">{previewProduct.description || "No description"}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Indication</Label>
                  <p className="text-sm mt-1">{previewProduct.indication || "N/A"}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Target Customers</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {previewProduct.targetCustomers.length > 0 ? (
                      previewProduct.targetCustomers.map((c, i) => (
                        <Badge key={i} variant="secondary">{c}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">N/A</span>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Competitors</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {previewProduct.competitors.length > 0 ? (
                      previewProduct.competitors.map((c, i) => (
                        <Badge key={i} variant="outline">{c}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">N/A</span>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Specifications</Label>
                  {Object.keys(previewProduct.specifications).length > 0 ? (
                    <div className="mt-1 space-y-1">
                      {Object.entries(previewProduct.specifications).map(([key, val]) => (
                        <div key={key} className="text-sm">
                          <span className="font-medium">{key}:</span> {val}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">No specifications</p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Parsed Products */}
        {parsedProducts.length > 0 && (
          <>
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
              <Badge variant="outline" className="h-10 px-4 flex items-center">
                {selectedProducts.size} of {parsedProducts.length} selected
              </Badge>
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
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
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
                    <TableHead>Code</TableHead>
                    <TableHead className="min-w-[200px]">Product Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Competitors</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product, idx) => {
                    const originalIdx = parsedProducts.indexOf(product);
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
                          {product.productCode || "-"}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.productName}</p>
                            {product.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {product.description}
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
                          {formatCurrency(product.price)}
                        </TableCell>
                        <TableCell>
                          {product.competitors.length > 0 ? (
                            <span className="text-xs text-muted-foreground">
                              {product.competitors.length} competitor(s)
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPreviewProduct(product)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={reset}>
                <X className="h-4 w-4 mr-2" />
                Reset
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
