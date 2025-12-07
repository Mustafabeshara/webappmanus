import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface POItem {
  productId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export default function CreatePurchaseOrder() {
  const [, setLocation] = useLocation();

  const [supplierId, setSupplierId] = useState<string>("");
  const [tenderId, setTenderId] = useState<string>("");
  const [budgetId, setBudgetId] = useState<string>("");
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [paymentTerms, setPaymentTerms] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [taxRate, setTaxRate] = useState<number>(10); // Default 10% tax
  const [items, setItems] = useState<POItem[]>([
    { description: "", quantity: 1, unitPrice: 0, totalPrice: 0 },
  ]);

  const { data: suppliers = [] } = trpc.suppliers.list.useQuery();
  const { data: tenders = [] } = trpc.tenders.list.useQuery();
  const { data: budgets = [] } = trpc.budgets.list.useQuery();
  const { data: products = [] } = trpc.products.list.useQuery();

  const createMutation = trpc.purchaseOrders.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Purchase Order ${data.poNumber} created successfully`);
      setLocation(`/purchase-orders/${data.poId}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAddItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0, totalPrice: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof POItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-calculate total price
    if (field === "quantity" || field === "unitPrice") {
      const qty = field === "quantity" ? value : newItems[index].quantity;
      const price = field === "unitPrice" ? value : newItems[index].unitPrice;
      newItems[index].totalPrice = qty * price;
    }

    // If product is selected, auto-fill description and unit price
    if (field === "productId" && value) {
      const product = products.find((p) => p.id === parseInt(value));
      if (product) {
        newItems[index].description = product.name;
        newItems[index].unitPrice = product.unitPrice || 0;
        newItems[index].totalPrice = newItems[index].quantity * (product.unitPrice || 0);
      }
    }

    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const calculateTax = () => {
    return Math.round((calculateSubtotal() * taxRate) / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const parseCurrency = (value: string): number => {
    return Math.round(parseFloat(value || "0") * 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId) {
      toast.error("Please select a supplier");
      return;
    }

    if (items.some((item) => !item.description || item.quantity <= 0 || item.unitPrice <= 0)) {
      toast.error("Please fill in all item details with valid values");
      return;
    }

    createMutation.mutate({
      supplierId: parseInt(supplierId),
      tenderId: tenderId ? parseInt(tenderId) : undefined,
      budgetId: budgetId ? parseInt(budgetId) : undefined,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : undefined,
      subtotal: calculateSubtotal(),
      taxAmount: calculateTax(),
      totalAmount: calculateTotal(),
      paymentTerms: paymentTerms || undefined,
      deliveryAddress: deliveryAddress || undefined,
      notes: notes || undefined,
      items: items.map((item) => ({
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        notes: item.notes,
      })),
    });
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/purchase-orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Purchase Order</h1>
          <p className="text-muted-foreground">Create a new purchase order for supplier procurement</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier *</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger id="supplier">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryDate">Expected Delivery Date</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tender">Link to Tender (Optional)</Label>
                <Select value={tenderId} onValueChange={setTenderId}>
                  <SelectTrigger id="tender">
                    <SelectValue placeholder="Select tender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {tenders.map((tender) => (
                      <SelectItem key={tender.id} value={tender.id.toString()}>
                        {tender.referenceNumber} - {tender.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Link to Budget (Optional)</Label>
                <Select value={budgetId} onValueChange={setBudgetId}>
                  <SelectTrigger id="budget">
                    <SelectValue placeholder="Select budget" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {budgets.map((budget) => (
                      <SelectItem key={budget.id} value={budget.id.toString()}>
                        {budget.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryAddress">Delivery Address</Label>
              <Textarea
                id="deliveryAddress"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Enter delivery address"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Textarea
                id="paymentTerms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g., Net 30 days, 50% advance payment"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Line Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Product (Optional)</Label>
                      <Select
                        value={item.productId?.toString() || ""}
                        onValueChange={(value) =>
                          handleItemChange(index, "productId", value ? parseInt(value) : undefined)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product or enter manually" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None (Manual Entry)</SelectItem>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name} - {product.sku}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Description *</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => handleItemChange(index, "description", e.target.value)}
                        placeholder="Item description"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Unit Price ($) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={(item.unitPrice / 100).toFixed(2)}
                        onChange={(e) => handleItemChange(index, "unitPrice", parseCurrency(e.target.value))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Total Price</Label>
                      <Input value={formatCurrency(item.totalPrice)} disabled />
                    </div>

                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Input
                        value={item.notes || ""}
                        onChange={(e) => handleItemChange(index, "notes", e.target.value)}
                        placeholder="Optional notes"
                      />
                    </div>
                  </div>

                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove Item
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2 text-right">
              <div className="flex justify-between text-lg">
                <span>Subtotal:</span>
                <span className="font-semibold">{formatCurrency(calculateSubtotal())}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span>Tax ({taxRate}%):</span>
                <span className="font-semibold">{formatCurrency(calculateTax())}</span>
              </div>
              <div className="flex justify-between text-xl font-bold border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes or special instructions"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href="/purchase-orders">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating..." : "Create Purchase Order"}
          </Button>
        </div>
      </form>
    </div>
  );
}
