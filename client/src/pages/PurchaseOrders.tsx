import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FileUpload } from "@/components/FileUpload";

export default function PurchaseOrders() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [createdPOId, setCreatedPOId] = useState<number | null>(null);
  
  const { data: purchaseOrders = [], refetch } = trpc.purchaseOrders.getAll.useQuery();
  const { data: suppliers = [] } = trpc.suppliers.getAll.useQuery();
  const { data: departments = [] } = trpc.departments.getAll.useQuery();
  
  const createMutation = trpc.purchaseOrders.create.useMutation({
    onSuccess: (data) => {
      setCreatedPOId(data.id);
      toast.success("Purchase order created successfully");
      setTimeout(() => {
        setIsCreateOpen(false);
        setCreatedPOId(null);
        refetch();
      }, 1000);
    },
    onError: (error) => toast.error(error.message),
  });
  
  const updateMutation = trpc.purchaseOrders.update.useMutation({
    onSuccess: () => {
      toast.success("Purchase order updated");
      refetch();
    },
  });
  
  const deleteMutation = trpc.purchaseOrders.delete.useMutation({
    onSuccess: () => {
      toast.success("Purchase order deleted");
      refetch();
    },
  });
  
  const filteredPOs = selectedStatus === "all" 
    ? purchaseOrders 
    : purchaseOrders.filter((po: any) => po.status === selectedStatus);
  
  const stats = {
    total: purchaseOrders.length,
    draft: purchaseOrders.filter((po: any) => po.status === "draft").length,
    pending: purchaseOrders.filter((po: any) => po.status === "pending").length,
    approved: purchaseOrders.filter((po: any) => po.status === "approved").length,
    totalAmount: purchaseOrders.reduce((sum: number, po: any) => sum + (po.totalAmount || 0), 0),
  };
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Purchase Orders</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Purchase Order</DialogTitle>
            </DialogHeader>
            <CreatePOForm 
              suppliers={suppliers}
              departments={departments}
              onSubmit={(data: any) => createMutation.mutate(data)}
              isLoading={createMutation.isPending}
              createdPOId={createdPOId}
            />
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total POs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Draft</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.totalAmount / 100).toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Purchase Orders</CardTitle>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="received">Received</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPOs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No purchase orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPOs.map((po: any) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.poNumber}</TableCell>
                    <TableCell>
                      {suppliers.find((s: any) => s.id === po.supplierId)?.name || "Unknown"}
                    </TableCell>
                    <TableCell>{new Date(po.orderDate).toLocaleDateString()}</TableCell>
                    <TableCell>${(po.totalAmount / 100).toFixed(2)}</TableCell>
                    <TableCell>
                      <StatusBadge status={po.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Select
                          value={po.status}
                          onValueChange={(status) => updateMutation.mutate({ id: po.id, status: status as any })}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="ordered">Ordered</SelectItem>
                            <SelectItem value="partially_received">Partially Received</SelectItem>
                            <SelectItem value="received">Received</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm("Delete this purchase order?")) {
                              deleteMutation.mutate({ id: po.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-gray-500",
    pending: "bg-yellow-500",
    approved: "bg-green-500",
    ordered: "bg-blue-500",
    partially_received: "bg-orange-500",
    received: "bg-green-600",
    cancelled: "bg-red-500",
  };
  
  return (
    <Badge className={colors[status] || "bg-gray-500"}>
      {status.replace("_", " ").toUpperCase()}
    </Badge>
  );
}

function CreatePOForm({ suppliers, departments, onSubmit, isLoading, createdPOId }: any) {
  const uploadToS3Mutation = trpc.files.uploadToS3.useMutation();
  const [formData, setFormData] = useState({
    poNumber: `PO-${Date.now()}`,
    supplierId: "",
    departmentId: "",
    orderDate: new Date().toISOString().split("T")[0],
    expectedDeliveryDate: "",
    totalAmount: 0,
    taxAmount: 0,
    shippingCost: 0,
    notes: "",
  });
  
  const [items, setItems] = useState([
    { description: "", quantity: 1, unitPrice: 0, totalPrice: 0 },
  ]);
  
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  
  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0, totalPrice: 0 }]);
  };
  
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };
  
  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === "quantity" || field === "unitPrice") {
      newItems[index].totalPrice = newItems[index].quantity * newItems[index].unitPrice;
    }
    
    setItems(newItems);
    
    const subtotal = newItems.reduce((sum, item) => sum + item.totalPrice, 0);
    setFormData({ ...formData, totalAmount: subtotal });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const poData = {
      ...formData,
      supplierId: parseInt(formData.supplierId),
      departmentId: formData.departmentId ? parseInt(formData.departmentId) : undefined,
      totalAmount: Math.round(formData.totalAmount * 100),
      taxAmount: Math.round(formData.taxAmount * 100),
      shippingCost: Math.round(formData.shippingCost * 100),
      items: items.map(item => ({
        ...item,
        unitPrice: Math.round(item.unitPrice * 100),
        totalPrice: Math.round(item.totalPrice * 100),
      })),
    };
    
    // Call onSubmit to create PO
    onSubmit(poData);
  };
  
  // Upload files when createdPOId is available
  useEffect(() => {
    if (createdPOId && attachedFiles.length > 0) {
      (async () => {
      for (const file of attachedFiles) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        await new Promise((resolve, reject) => {
          reader.onloadend = async () => {
            try {
              const base64 = reader.result as string;
              await uploadToS3Mutation.mutateAsync({
                fileName: file.name,
                fileData: base64,
                mimeType: file.type,
                entityType: 'purchase_order',
                entityId: createdPOId,
                category: 'contract',
              });
              resolve(true);
            } catch (error) {
              reject(error);
            }
          };
        });
      }
      toast.success(`${attachedFiles.length} file(s) uploaded successfully`);
      })();
    }
  }, [createdPOId, attachedFiles]);
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>PO Number</Label>
          <Input
            value={formData.poNumber}
            onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>Supplier</Label>
          <Select value={formData.supplierId} onValueChange={(value) => setFormData({ ...formData, supplierId: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((s: any) => (
                <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Order Date</Label>
          <Input
            type="date"
            value={formData.orderDate}
            onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>Expected Delivery</Label>
          <Input
            type="date"
            value={formData.expectedDeliveryDate}
            onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
          />
        </div>
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-2">
          <Label>Line Items</Label>
          <Button type="button" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </div>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateItem(index, "description", e.target.value)}
                  required
                />
              </div>
              <div className="w-24">
                <Input
                  type="number"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 0)}
                  required
                />
              </div>
              <div className="w-32">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Unit Price"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
              <div className="w-32">
                <Input
                  value={`$${item.totalPrice.toFixed(2)}`}
                  disabled
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => removeItem(index)}
                disabled={items.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>
      
      <div>
        <Label>Contract Documents</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Upload contracts, invoices, or supporting documents
        </p>
        <FileUpload
          onFilesSelected={setAttachedFiles}
          maxFiles={10}
          maxSizeMB={10}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        />
      </div>
      
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-lg font-semibold">
          Total: ${formData.totalAmount.toFixed(2)}
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Creating..." : "Create Purchase Order"}
        </Button>
      </div>
    </form>
  );
}
