import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  DollarSign,
  Users,
  Target,
  Stethoscope,
  TrendingUp,
  Award,
  FileText,
  Building2,
  AlertTriangle,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  Star,
  Globe,
  Shield,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ProductCatalogInfo {
  productCode?: string;
  barcode?: string;
  targetCustomers?: string[];
  indication?: string;
  prevalence?: string;
  marketDemand?: "low" | "medium" | "high" | "very_high";
  demandNotes?: string;
  competitors?: string[];
  competitorPricing?: Record<string, number>;
  marketPosition?: string;
  uniqueSellingPoints?: string[];
  certifications?: string[];
  countryOfOrigin?: string;
  warranty?: string;
  shelfLife?: string;
  storageRequirements?: string;
  hsCode?: string;
  regulatoryStatus?: string;
  sfdaRegistration?: string;
  pricingTiers?: { minQty: number; price: number }[];
}

interface Competitor {
  id?: number;
  competitorName: string;
  competitorProduct?: string;
  competitorPrice?: number;
  competitorStrengths?: string;
  competitorWeaknesses?: string;
  marketShare?: string;
  notes?: string;
}

interface Specification {
  specKey: string;
  specValue: string;
  unit?: string;
}

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
  name: string;
  rating?: number | null;
}

interface ProductDetailModalProps {
  product: Product | null;
  supplier?: Supplier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function ProductDetailModal({
  product,
  supplier,
  open,
  onOpenChange,
  onUpdate,
}: ProductDetailModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [editedProduct, setEditedProduct] = useState<Partial<Product>>({});
  const [catalogInfo, setCatalogInfo] = useState<ProductCatalogInfo>({});
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [specifications, setSpecifications] = useState<Specification[]>([]);

  // Parse existing specifications when product changes
  useState(() => {
    if (product?.specifications) {
      try {
        const parsed = JSON.parse(product.specifications);
        if (typeof parsed === "object") {
          setSpecifications(
            Object.entries(parsed).map(([key, value]) => ({
              specKey: key,
              specValue: String(value),
            }))
          );
        }
      } catch {
        // If not JSON, split by semicolon
        const specs = product.specifications.split(";").map((s) => {
          const [key, val] = s.split(":").map((p) => p.trim());
          return { specKey: key || "", specValue: val || "" };
        });
        setSpecifications(specs.filter((s) => s.specKey));
      }
    }
  });

  const updateProduct = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Product updated successfully");
      setIsEditing(false);
      onUpdate?.();
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const formatCurrency = (cents: number | null | undefined) => {
    if (!cents && cents !== 0) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const handleSave = () => {
    if (!product) return;

    const specsJson = specifications.reduce(
      (acc, s) => {
        if (s.specKey) acc[s.specKey] = s.specValue;
        return acc;
      },
      {} as Record<string, string>
    );

    updateProduct.mutate({
      id: product.id,
      name: editedProduct.name || undefined,
      description: editedProduct.description || undefined,
      category: editedProduct.category || undefined,
      unitPrice: editedProduct.unitPrice ?? undefined,
      unit: editedProduct.unit || undefined,
      specifications: JSON.stringify(specsJson),
    });
  };

  const handleStartEdit = () => {
    setEditedProduct({
      name: product?.name,
      description: product?.description,
      category: product?.category,
      unitPrice: product?.unitPrice,
      unit: product?.unit,
    });
    setIsEditing(true);
  };

  const addSpecification = () => {
    setSpecifications([...specifications, { specKey: "", specValue: "" }]);
  };

  const removeSpecification = (index: number) => {
    setSpecifications(specifications.filter((_, i) => i !== index));
  };

  const addCompetitor = () => {
    setCompetitors([
      ...competitors,
      { competitorName: "", competitorProduct: "" },
    ]);
  };

  const removeCompetitor = (index: number) => {
    setCompetitors(competitors.filter((_, i) => i !== index));
  };

  if (!product) return null;

  const demandColors = {
    low: "bg-gray-100 text-gray-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-green-100 text-green-800",
    very_high: "bg-blue-100 text-blue-800",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Package className="h-5 w-5" />
                {isEditing ? (
                  <Input
                    value={editedProduct.name || ""}
                    onChange={(e) =>
                      setEditedProduct({ ...editedProduct, name: e.target.value })
                    }
                    className="text-xl font-bold h-8"
                  />
                ) : (
                  product.name
                )}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <span className="font-mono">SKU: {product.sku}</span>
                {catalogInfo.productCode && (
                  <>
                    <span>•</span>
                    <span>Code: {catalogInfo.productCode}</span>
                  </>
                )}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={handleStartEdit}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 overflow-hidden flex flex-col"
        >
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="overview">
              <Package className="h-4 w-4 mr-1" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="specs">
              <FileText className="h-4 w-4 mr-1" />
              Specs
            </TabsTrigger>
            <TabsTrigger value="market">
              <TrendingUp className="h-4 w-4 mr-1" />
              Market
            </TabsTrigger>
            <TabsTrigger value="competitors">
              <Building2 className="h-4 w-4 mr-1" />
              Competitors
            </TabsTrigger>
            <TabsTrigger value="customers">
              <Users className="h-4 w-4 mr-1" />
              Customers
            </TabsTrigger>
            <TabsTrigger value="compliance">
              <Shield className="h-4 w-4 mr-1" />
              Compliance
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Pricing
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <div className="space-y-2">
                        <Label>Unit Price ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={
                            editedProduct.unitPrice
                              ? editedProduct.unitPrice / 100
                              : ""
                          }
                          onChange={(e) =>
                            setEditedProduct({
                              ...editedProduct,
                              unitPrice: Math.round(
                                parseFloat(e.target.value) * 100
                              ),
                            })
                          }
                        />
                      </div>
                    ) : (
                      <div className="text-2xl font-bold">
                        {formatCurrency(product.unitPrice)}
                        <span className="text-sm font-normal text-muted-foreground ml-1">
                          / {product.unit || "unit"}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Supplier
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {supplier ? (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{supplier.name}</span>
                        {supplier.rating && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            {supplier.rating}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Not assigned</span>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={editedProduct.description || ""}
                      onChange={(e) =>
                        setEditedProduct({
                          ...editedProduct,
                          description: e.target.value,
                        })
                      }
                      rows={4}
                    />
                  ) : (
                    <p className="text-sm">
                      {product.description || "No description available"}
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <Label className="text-muted-foreground text-xs">Category</Label>
                    {isEditing ? (
                      <Input
                        value={editedProduct.category || ""}
                        onChange={(e) =>
                          setEditedProduct({
                            ...editedProduct,
                            category: e.target.value,
                          })
                        }
                        className="mt-1"
                      />
                    ) : (
                      <p className="font-medium">{product.category || "N/A"}</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <Label className="text-muted-foreground text-xs">Unit</Label>
                    {isEditing ? (
                      <Input
                        value={editedProduct.unit || ""}
                        onChange={(e) =>
                          setEditedProduct({
                            ...editedProduct,
                            unit: e.target.value,
                          })
                        }
                        className="mt-1"
                      />
                    ) : (
                      <p className="font-medium">{product.unit || "piece"}</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <Label className="text-muted-foreground text-xs">Status</Label>
                    <div className="mt-1">
                      <Badge variant={product.isActive ? "default" : "secondary"}>
                        {product.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Specifications Tab */}
            <TabsContent value="specs" className="space-y-4 mt-0">
              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Technical Specifications</CardTitle>
                  {isEditing && (
                    <Button variant="outline" size="sm" onClick={addSpecification}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Spec
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {specifications.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Specification</TableHead>
                          <TableHead>Value</TableHead>
                          {isEditing && <TableHead className="w-12"></TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {specifications.map((spec, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              {isEditing ? (
                                <Input
                                  value={spec.specKey}
                                  onChange={(e) => {
                                    const newSpecs = [...specifications];
                                    newSpecs[idx].specKey = e.target.value;
                                    setSpecifications(newSpecs);
                                  }}
                                  placeholder="Specification name"
                                />
                              ) : (
                                <span className="font-medium">{spec.specKey}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input
                                  value={spec.specValue}
                                  onChange={(e) => {
                                    const newSpecs = [...specifications];
                                    newSpecs[idx].specValue = e.target.value;
                                    setSpecifications(newSpecs);
                                  }}
                                  placeholder="Value"
                                />
                              ) : (
                                spec.specValue
                              )}
                            </TableCell>
                            {isEditing && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeSpecification(idx)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No specifications added yet
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Market Tab */}
            <TabsContent value="market" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Market Demand
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge
                      className={
                        demandColors[catalogInfo.marketDemand || "medium"]
                      }
                    >
                      {(catalogInfo.marketDemand || "medium").replace("_", " ").toUpperCase()}
                    </Badge>
                    {catalogInfo.demandNotes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {catalogInfo.demandNotes}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Stethoscope className="h-4 w-4" />
                      Indication
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      {catalogInfo.indication || "Not specified"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Prevalence & Market Position
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Prevalence</Label>
                    <p className="text-sm">{catalogInfo.prevalence || "N/A"}</p>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-muted-foreground text-xs">
                      Market Position
                    </Label>
                    <p className="text-sm">{catalogInfo.marketPosition || "N/A"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Unique Selling Points
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {catalogInfo.uniqueSellingPoints &&
                  catalogInfo.uniqueSellingPoints.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1">
                      {catalogInfo.uniqueSellingPoints.map((usp, idx) => (
                        <li key={idx} className="text-sm">
                          {usp}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No selling points defined
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Competitors Tab */}
            <TabsContent value="competitors" className="space-y-4 mt-0">
              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Competitor Analysis</CardTitle>
                  {isEditing && (
                    <Button variant="outline" size="sm" onClick={addCompetitor}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Competitor
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {competitors.length > 0 ||
                  (catalogInfo.competitors && catalogInfo.competitors.length > 0) ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Competitor</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Market Share</TableHead>
                          {isEditing && <TableHead className="w-12"></TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {competitors.map((comp, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              {isEditing ? (
                                <Input
                                  value={comp.competitorName}
                                  onChange={(e) => {
                                    const newComps = [...competitors];
                                    newComps[idx].competitorName = e.target.value;
                                    setCompetitors(newComps);
                                  }}
                                />
                              ) : (
                                comp.competitorName
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input
                                  value={comp.competitorProduct || ""}
                                  onChange={(e) => {
                                    const newComps = [...competitors];
                                    newComps[idx].competitorProduct = e.target.value;
                                    setCompetitors(newComps);
                                  }}
                                />
                              ) : (
                                comp.competitorProduct || "-"
                              )}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(comp.competitorPrice)}
                            </TableCell>
                            <TableCell>{comp.marketShare || "-"}</TableCell>
                            {isEditing && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeCompetitor(idx)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                        {catalogInfo.competitors?.map((name, idx) => (
                          <TableRow key={`cat-${idx}`}>
                            <TableCell>{name}</TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>
                              {catalogInfo.competitorPricing?.[name]
                                ? formatCurrency(catalogInfo.competitorPricing[name])
                                : "-"}
                            </TableCell>
                            <TableCell>-</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No competitor data available
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Customers Tab */}
            <TabsContent value="customers" className="space-y-4 mt-0">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Target Customers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {catalogInfo.targetCustomers &&
                  catalogInfo.targetCustomers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {catalogInfo.targetCustomers.map((customer, idx) => (
                        <Badge key={idx} variant="secondary">
                          {customer}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Target customers not defined
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Customer Segments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">Hospitals</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Primary target for medical equipment
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Stethoscope className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Clinics</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Secondary market segment
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Compliance Tab */}
            <TabsContent value="compliance" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Certifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {catalogInfo.certifications &&
                    catalogInfo.certifications.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {catalogInfo.certifications.map((cert, idx) => (
                          <Badge key={idx} variant="outline">
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No certifications listed
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Origin & Trade
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-muted-foreground text-xs">
                        Country of Origin
                      </Label>
                      <p className="text-sm">
                        {catalogInfo.countryOfOrigin || "Not specified"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">HS Code</Label>
                      <p className="text-sm font-mono">
                        {catalogInfo.hsCode || "N/A"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Regulatory Status</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">
                      Regulatory Status
                    </Label>
                    <p className="text-sm">
                      {catalogInfo.regulatoryStatus || "Pending review"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">
                      SFDA Registration
                    </Label>
                    <p className="text-sm">
                      {catalogInfo.sfdaRegistration || "Not registered"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Storage & Handling</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Warranty</Label>
                    <p className="text-sm">{catalogInfo.warranty || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Shelf Life</Label>
                    <p className="text-sm">{catalogInfo.shelfLife || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">
                      Storage Requirements
                    </Label>
                    <p className="text-sm">
                      {catalogInfo.storageRequirements || "Standard conditions"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
