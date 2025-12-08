import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Plus, Search, Eye, Edit, AlertTriangle, Package } from "lucide-react";
import { Link } from "wouter";
import { InventoryOptimization } from "@/components/InventoryOptimization";
import { ExportButton } from "@/components/ExportButton";

export default function Inventory() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState<string>("all");
  
  const { data: products, isLoading } = trpc.inventory.list.useQuery();

  if (!user) {
    return null;
  }

  const filteredProducts = products?.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStock = true;
    const currentStock = product.currentStock ?? 0;
    const reorderLevel = product.reorderLevel ?? 0;
    
    if (stockFilter === "low") {
      matchesStock = currentStock <= reorderLevel && currentStock > 0;
    } else if (stockFilter === "out") {
      matchesStock = currentStock === 0;
    } else if (stockFilter === "in") {
      matchesStock = currentStock > reorderLevel;
    }
    
    return matchesSearch && matchesStock;
  });

  const getStockBadge = (currentStock: number, reorderLevel: number) => {
    if (currentStock === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (currentStock <= reorderLevel) {
      return <Badge className="bg-amber-500 hover:bg-amber-600">Low Stock</Badge>;
    } else {
      return <Badge variant="default">In Stock</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground mt-1">
            Manage products and track stock levels
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton module="inventory" />
          <Link href="/inventory/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* AI Inventory Optimization */}
      <InventoryOptimization />

      <Card>
        <CardHeader>
          <CardTitle>All Products</CardTitle>
          <CardDescription>
            {filteredProducts?.length || 0} product(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, SKU, or manufacturer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="in">In Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Reorder Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts && filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono text-sm">
                        {product.sku}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {(product.currentStock ?? 0) <= (product.reorderLevel ?? 0) && (product.currentStock ?? 0) > 0 && (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          )}
                          {product.name}
                        </div>
                      </TableCell>
                      <TableCell>{product.manufacturerId ? `Mfr #${product.manufacturerId}` : "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={(product.currentStock ?? 0) <= (product.reorderLevel ?? 0) ? "text-amber-600 font-semibold" : ""}>
                          {product.currentStock ?? 0} {product.unit || "unit"}
                        </span>
                      </TableCell>
                      <TableCell>{product.reorderLevel ?? 0} {product.unit || "unit"}</TableCell>
                      <TableCell>
                        {getStockBadge(product.currentStock ?? 0, product.reorderLevel ?? 0)}
                      </TableCell>
                      <TableCell>
                        ${((product.unitPrice ?? 0) / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/inventory/${product.id}`}>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/inventory/${product.id}/edit`}>
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No products found</p>
                      <p className="text-sm mt-1">Add your first product to get started</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
