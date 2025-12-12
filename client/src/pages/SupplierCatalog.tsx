import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Package,
  Building2,
  DollarSign,
  Filter,
  Download,
  Star,
  Tag,
} from "lucide-react";
import { useLocation } from "wouter";

interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string | null;
  category?: string | null;
  manufacturerId?: number | null;
  unitPrice?: number | null;
  unit?: string | null;
  specifications?: string | null;
  isActive: boolean;
}

interface Supplier {
  id: number;
  code: string;
  name: string;
  complianceStatus: string;
  rating?: number | null;
  isActive: boolean;
}

export default function SupplierCatalog() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });

  // Fetch all suppliers
  const { data: suppliers = [], isLoading: suppliersLoading } = trpc.suppliers.list.useQuery();

  // Fetch all products
  const { data: products = [], isLoading: productsLoading } = trpc.products.list.useQuery();

  // Get unique categories from products
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p: Product) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product: Product) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          product.name?.toLowerCase().includes(search) ||
          product.sku?.toLowerCase().includes(search) ||
          product.description?.toLowerCase().includes(search) ||
          product.category?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Supplier filter
      if (selectedSupplier !== "all") {
        if (product.manufacturerId !== parseInt(selectedSupplier)) return false;
      }

      // Category filter
      if (selectedCategory !== "all") {
        if (product.category !== selectedCategory) return false;
      }

      // Price range filter
      if (priceRange.min || priceRange.max) {
        const price = product.unitPrice || 0;
        const minPrice = priceRange.min ? parseFloat(priceRange.min) * 100 : 0;
        const maxPrice = priceRange.max ? parseFloat(priceRange.max) * 100 : Infinity;
        if (price < minPrice || price > maxPrice) return false;
      }

      return product.isActive;
    });
  }, [products, searchTerm, selectedSupplier, selectedCategory, priceRange]);

  // Get supplier by ID
  const getSupplier = (manufacturerId: number | null | undefined): Supplier | undefined => {
    if (!manufacturerId) return undefined;
    return suppliers.find((s: Supplier) => s.id === manufacturerId);
  };

  // Format price (stored in cents)
  const formatPrice = (cents: number | null | undefined): string => {
    if (!cents) return "-";
    return `$${(cents / 100).toFixed(2)}`;
  };

  // Export to CSV
  const exportToCsv = () => {
    const headers = ["SKU", "Product Name", "Category", "Supplier", "Unit Price", "Unit"];
    const rows = filteredProducts.map((p: Product) => {
      const supplier = getSupplier(p.manufacturerId);
      return [
        p.sku,
        p.name,
        p.category || "",
        supplier?.name || "",
        p.unitPrice ? (p.unitPrice / 100).toFixed(2) : "",
        p.unit || "",
      ];
    });

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "supplier-catalog.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate summary stats
  const totalProducts = products.filter((p: Product) => p.isActive).length;
  const totalSuppliers = suppliers.filter((s: Supplier) => s.isActive).length;
  const avgPrice = useMemo(() => {
    const priced = products.filter((p: Product) => p.unitPrice && p.isActive);
    if (priced.length === 0) return 0;
    const sum = priced.reduce((acc: number, p: Product) => acc + (p.unitPrice || 0), 0);
    return sum / priced.length / 100;
  }, [products]);

  const isLoading = suppliersLoading || productsLoading;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Supplier Catalog</h1>
          <p className="text-muted-foreground">
            Browse and search products from all suppliers
          </p>
        </div>
        <Button onClick={exportToCsv} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Suppliers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSuppliers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgPrice.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, SKU, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>Supplier</Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers
                    .filter((s: Supplier) => s.isActive)
                    .map((supplier: Supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Price Range</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                  className="w-20"
                />
                <span className="self-center">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                  className="w-20"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Products ({filteredProducts.length} of {totalProducts})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No products found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product: Product) => {
                  const supplier = getSupplier(product.manufacturerId);
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell>
                        <div className="font-medium">{product.name}</div>
                        {product.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {product.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {product.category ? (
                          <Badge variant="outline">{product.category}</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {supplier ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="text-blue-600 hover:underline cursor-pointer"
                              onClick={() => setLocation(`/suppliers/${supplier.id}`)}
                            >
                              {supplier.name}
                            </span>
                            {supplier.rating && (
                              <div className="flex items-center text-yellow-500">
                                <Star className="h-3 w-3 fill-current" />
                                <span className="text-xs ml-0.5">{supplier.rating}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatPrice(product.unitPrice)}
                      </TableCell>
                      <TableCell>{product.unit || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocation(`/inventory/${product.id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
