import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Building2, Mail, Phone, MapPin, FileText, Star, Pencil } from "lucide-react";
import { useLocation, useParams } from "wouter";

export default function SupplierDetails() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const supplierId = parseInt(params.id || "0");

  const { data: supplier, isLoading } = trpc.suppliers.get.useQuery({ id: supplierId });
  const { data: supplierProducts = [], isLoading: productsLoading } = trpc.suppliers.products.useQuery({ supplierId }, {
    enabled: supplierId > 0,
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading supplier details...</div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Supplier Not Found</h3>
        <p className="text-muted-foreground mb-4">
          The supplier you're looking for doesn't exist.
        </p>
        <Button onClick={() => setLocation("/suppliers")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Suppliers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/suppliers")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{supplier.name}</h1>
              <Badge variant={supplier.isActive ? "default" : "secondary"}>
                {supplier.isActive ? "Active" : "Inactive"}
              </Badge>
              <Badge
                variant={
                  supplier.complianceStatus === "compliant"
                    ? "default"
                    : supplier.complianceStatus === "pending"
                    ? "secondary"
                    : "destructive"
                }
              >
                {supplier.complianceStatus === "compliant"
                  ? "Compliant"
                  : supplier.complianceStatus === "pending"
                  ? "Pending"
                  : "Non-Compliant"}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Supplier Code: {supplier.code}
            </p>
          </div>
        </div>
        <Button onClick={() => setLocation(`/suppliers/${supplierId}/edit`)}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit Supplier
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {supplier.contactPerson && (
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium">Contact Person</div>
                  <div className="text-sm text-muted-foreground">
                    {supplier.contactPerson}
                  </div>
                </div>
              </div>
            )}

            {supplier.email && (
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium">Email</div>
                  <div className="text-sm text-muted-foreground">
                    {supplier.email}
                  </div>
                </div>
              </div>
            )}

            {supplier.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium">Phone</div>
                  <div className="text-sm text-muted-foreground">
                    {supplier.phone}
                  </div>
                </div>
              </div>
            )}

            {supplier.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium">Address</div>
                  <div className="text-sm text-muted-foreground whitespace-pre-line">
                    {supplier.address}
                  </div>
                </div>
              </div>
            )}

            {supplier.taxId && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium">Tax ID</div>
                  <div className="text-sm text-muted-foreground">
                    {supplier.taxId}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance & Compliance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {supplier.rating && (
              <div className="flex items-start gap-3">
                <Star className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium">Rating</div>
                  <div className="flex items-center gap-1 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < (supplier.rating || 0)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                    <span className="text-sm text-muted-foreground ml-2">
                      {supplier.rating}/5
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="font-medium mb-2">Compliance Status</div>
              <Badge
                variant={
                  supplier.complianceStatus === "compliant"
                    ? "default"
                    : supplier.complianceStatus === "pending"
                    ? "secondary"
                    : "destructive"
                }
                className="text-sm"
              >
                {supplier.complianceStatus === "compliant"
                  ? "Fully Compliant"
                  : supplier.complianceStatus === "pending"
                  ? "Pending Review"
                  : "Non-Compliant - Action Required"}
              </Badge>
            </div>

            <div>
              <div className="font-medium mb-2">Account Status</div>
              <Badge variant={supplier.isActive ? "default" : "secondary"}>
                {supplier.isActive ? "Active Account" : "Inactive Account"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle>Products from this Supplier</CardTitle>
            <CardDescription>Inventory items linked via manufacturer ID</CardDescription>
          </div>
          <Button variant="outline" onClick={() => setLocation(`/inventory/create?supplierId=${supplierId}`)}>
            Add product for {supplier.name}
          </Button>
        </CardHeader>
        <CardContent>
          {productsLoading ? (
            <div className="text-sm text-muted-foreground">Loading products…</div>
          ) : supplierProducts.length === 0 ? (
            <div className="text-sm text-muted-foreground">No products are linked to this supplier yet.</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierProducts.map((product: any) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>{product.category || "-"}</TableCell>
                      <TableCell>
                        {typeof product.unitPrice === "number"
                          ? `${(product.unitPrice / 100).toFixed(2)}`
                          : "-"}
                      </TableCell>
                      <TableCell>{product.unit || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {supplier.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {supplier.notes}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>Recent transactions and interactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No recent activity
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
