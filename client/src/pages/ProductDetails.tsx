import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Package, AlertTriangle, CheckCircle, Pencil } from "lucide-react";
import { useLocation, useParams } from "wouter";

export default function ProductDetails() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const productId = parseInt(params.id || "0");

  const { data: product, isLoading } = trpc.products.get.useQuery({ id: productId });

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading product details...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Product Not Found</h3>
        <p className="text-muted-foreground mb-4">
          The product you're looking for doesn't exist.
        </p>
        <Button onClick={() => setLocation("/inventory")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Inventory
        </Button>
      </div>
    );
  }

  const stockLevel = product.currentStock || 0;
  const minStock = product.minStockLevel || 0;
  const isLowStock = stockLevel <= minStock;
  const stockPercentage = minStock > 0 ? (stockLevel / (minStock * 2)) * 100 : 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/inventory")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{product.name}</h1>
              {isLowStock && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Low Stock
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              SKU: {product.sku}
            </p>
          </div>
        </div>
        <Button onClick={() => setLocation(`/inventory/${productId}/edit`)}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit Product
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-2">
              {stockLevel}
              <span className="text-lg text-muted-foreground ml-2">
                {product.unit || "units"}
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  isLowStock ? "bg-destructive" : "bg-primary"
                }`}
                style={{ width: `${Math.min(stockPercentage, 100)}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Minimum: {minStock} {product.unit || "units"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Unit Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              ${product.unitPrice?.toFixed(2) || "0.00"}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              per {product.unit || "unit"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              ${((product.unitPrice || 0) * stockLevel).toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Current inventory value
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Name</div>
              <div>{product.name}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">SKU</div>
              <div className="font-mono">{product.sku}</div>
            </div>
            {product.category && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Category</div>
                <Badge variant="outline">{product.category}</Badge>
              </div>
            )}
            {product.description && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Description</div>
                <div className="text-sm">{product.description}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Current Stock</div>
              <div>{stockLevel} {product.unit || "units"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Minimum Stock Level</div>
              <div>{minStock} {product.unit || "units"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Stock Status</div>
              <div className="flex items-center gap-2">
                {isLowStock ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-destructive">Low Stock - Reorder Needed</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">Stock Level Healthy</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stock Movements</CardTitle>
          <CardDescription>Recent inventory transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No stock movements recorded
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
