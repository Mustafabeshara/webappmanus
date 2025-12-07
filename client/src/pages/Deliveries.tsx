import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Truck, Package, CheckCircle, XCircle, Clock, Upload } from "lucide-react";
import { toast } from "sonner";
import { FileUpload } from "@/components/FileUpload";

type DeliveryStatus = "planned" | "in_transit" | "delivered" | "cancelled";

const statusConfig: Record<DeliveryStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  planned: { label: "Planned", variant: "outline", icon: Clock },
  in_transit: { label: "In Transit", variant: "secondary", icon: Truck },
  delivered: { label: "Delivered", variant: "default", icon: CheckCircle },
  cancelled: { label: "Cancelled", variant: "destructive", icon: XCircle },
};

export default function Deliveries() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeliveredDialogOpen, setIsDeliveredDialogOpen] = useState(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<number | null>(null);
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<DeliveryStatus | "all">("all");
  
  const { data: deliveries, isLoading, refetch } = trpc.deliveries.list.useQuery();
  const { data: customers } = trpc.customers.list.useQuery();
  const { data: products } = trpc.inventory.list.useQuery();
  
  const createMutation = trpc.deliveries.create.useMutation({
    onSuccess: () => {
      toast.success("Delivery created successfully");
      setIsCreateDialogOpen(false);
      setFormData({
        customerId: "",
        scheduledDate: "",
        deliveryAddress: "",
        driverName: "",
        vehicleNumber: "",
        notes: "",
        items: [{ productId: "", quantity: "", batchNumber: "", notes: "" }],
      });
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create delivery: ${error.message}`);
    },
  });
  
  const updateMutation = trpc.deliveries.update.useMutation({
    onSuccess: () => {
      toast.success("Delivery status updated");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update delivery: ${error.message}`);
    },
  });
  
  const uploadToS3Mutation = trpc.files.uploadToS3.useMutation();

  const [formData, setFormData] = useState({
    customerId: "",
    scheduledDate: "",
    deliveryAddress: "",
    driverName: "",
    vehicleNumber: "",
    notes: "",
    items: [{ productId: "", quantity: "", batchNumber: "", notes: "" }],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerId || !formData.scheduledDate || !formData.deliveryAddress) {
      toast.error("Please fill in all required fields");
      return;
    }

    const validItems = formData.items.filter(item => item.productId && item.quantity);
    if (validItems.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    createMutation.mutate({
      customerId: parseInt(formData.customerId),
      scheduledDate: new Date(formData.scheduledDate),
      deliveryAddress: formData.deliveryAddress,
      driverName: formData.driverName || undefined,
      vehicleNumber: formData.vehicleNumber || undefined,
      notes: formData.notes || undefined,
      items: validItems.map(item => ({
        productId: parseInt(item.productId),
        quantity: parseInt(item.quantity),
        batchNumber: item.batchNumber || undefined,
        notes: item.notes || undefined,
      })),
    });
  };

  const handleStatusChange = (id: number, status: DeliveryStatus) => {
    if (status === "delivered") {
      // Open dialog to require proof-of-delivery upload
      setSelectedDeliveryId(id);
      setIsDeliveredDialogOpen(true);
    } else {
      updateMutation.mutate({ id, status });
    }
  };
  
  const handleMarkAsDelivered = async () => {
    if (!selectedDeliveryId) return;
    
    if (proofFiles.length === 0) {
      toast.error("Please upload at least one proof-of-delivery document");
      return;
    }
    
    try {
      // Upload proof-of-delivery files first
      for (const file of proofFiles) {
        const reader = new FileReader();
        const uploadPromise = new Promise((resolve, reject) => {
          reader.onloadend = async () => {
            try {
              const base64 = reader.result as string;
              await uploadToS3Mutation.mutateAsync({
                fileName: file.name,
                fileData: base64,
                mimeType: file.type,
                entityType: 'delivery',
                entityId: selectedDeliveryId,
                category: 'proof_of_delivery',
              });
              resolve(true);
            } catch (error) {
              reject(error);
            }
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        await uploadPromise;
      }
      
      // Update delivery status to delivered
      await updateMutation.mutateAsync({
        id: selectedDeliveryId,
        status: "delivered",
        deliveredDate: new Date(),
      });
      
      toast.success("Delivery marked as delivered");
      setIsDeliveredDialogOpen(false);
      setProofFiles([]);
      setSelectedDeliveryId(null);
      refetch();
    } catch (error: any) {
      toast.error(`Failed to mark as delivered: ${error.message}`);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: "", quantity: "", batchNumber: "", notes: "" }],
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const filteredDeliveries = deliveries?.filter(delivery => 
    selectedStatus === "all" || delivery.status === selectedStatus
  );

  const stats = {
    total: deliveries?.length || 0,
    planned: deliveries?.filter(d => d.status === "planned").length || 0,
    inTransit: deliveries?.filter(d => d.status === "in_transit").length || 0,
    delivered: deliveries?.filter(d => d.status === "delivered").length || 0,
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Deliveries</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track all deliveries
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Delivery
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planned</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.planned}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inTransit}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivered}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={(value: any) => setSelectedStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deliveries Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Deliveries</CardTitle>
          <CardDescription>
            {filteredDeliveries?.length || 0} delivery(ies) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Delivery #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeliveries?.map((delivery) => {
                const config = statusConfig[delivery.status];
                const Icon = config.icon;
                const customer = customers?.find(c => c.id === delivery.customerId);
                return (
                  <TableRow key={delivery.id}>
                    <TableCell className="font-medium">{delivery.deliveryNumber}</TableCell>
                    <TableCell>{customer?.name || `Customer #${delivery.customerId}`}</TableCell>
                    <TableCell>
                      {new Date(delivery.scheduledDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.variant}>
                        <Icon className="mr-1 h-3 w-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{delivery.driverName || "-"}</TableCell>
                    <TableCell>
                      {delivery.status === "planned" && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleStatusChange(delivery.id, "in_transit")}
                        >
                          Start Transit
                        </Button>
                      )}
                      {delivery.status === "in_transit" && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleStatusChange(delivery.id, "delivered")}
                        >
                          Mark Delivered
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!filteredDeliveries || filteredDeliveries.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No deliveries found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Delivery Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Delivery</DialogTitle>
            <DialogDescription>
              Schedule a new delivery with items
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="customerId">Customer *</Label>
                  <Select
                    value={formData.customerId}
                    onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="scheduledDate">Scheduled Date *</Label>
                  <Input
                    id="scheduledDate"
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="deliveryAddress">Delivery Address *</Label>
                <Textarea
                  id="deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                  placeholder="Enter delivery address"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="driverName">Driver Name</Label>
                  <Input
                    id="driverName"
                    value={formData.driverName}
                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                    placeholder="Enter driver name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                  <Input
                    id="vehicleNumber"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    placeholder="Enter vehicle number"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes"
                />
              </div>
              
              {/* Items Section */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <Label className="text-base">Delivery Items *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
                {formData.items.map((item, index) => (
                  <div key={index} className="grid gap-4 p-4 border rounded-lg mb-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label>Product *</Label>
                        <Select
                          value={item.productId}
                          onValueChange={(value) => updateItem(index, "productId", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products?.map((product) => (
                              <SelectItem key={product.id} value={product.id.toString()}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Batch Number</Label>
                        <Input
                          value={item.batchNumber}
                          onChange={(e) => updateItem(index, "batchNumber", e.target.value)}
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                    {formData.items.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        Remove Item
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Delivery"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Mark as Delivered Dialog */}
      <Dialog open={isDeliveredDialogOpen} onOpenChange={setIsDeliveredDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mark as Delivered</DialogTitle>
            <DialogDescription>
              Upload proof-of-delivery documents (photos, signed receipts, etc.) to complete this delivery.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Proof of Delivery *</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Upload at least one document showing proof of delivery (photos, signed receipts, delivery notes)
              </p>
              <FileUpload
                onFilesSelected={setProofFiles}
                maxFiles={10}
                maxSizeMB={5}
                accept="image/*,application/pdf"
              />
              {proofFiles.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-green-600">
                    {proofFiles.length} file(s) ready to upload
                  </p>
                  <ul className="text-sm text-muted-foreground mt-1">
                    {proofFiles.map((file, idx) => (
                      <li key={idx}>• {file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeliveredDialogOpen(false);
                setProofFiles([]);
                setSelectedDeliveryId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkAsDelivered}
              disabled={uploadToS3Mutation.isPending || updateMutation.isPending}
            >
              {uploadToS3Mutation.isPending || updateMutation.isPending ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Mark as Delivered"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
