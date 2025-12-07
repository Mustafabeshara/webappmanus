import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Truck, Calendar, CheckCircle2, XCircle, Package } from "lucide-react";

export default function DeliveryDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [deliveredDate, setDeliveredDate] = useState(new Date().toISOString().split("T")[0]);

  const { data, isLoading, refetch } = trpc.deliveries.get.useQuery({
    id: parseInt(id!),
  });

  const updateMutation = trpc.deliveries.update.useMutation({
    onSuccess: () => {
      toast.success("Delivery status updated successfully");
      setShowStatusDialog(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Failed to update delivery: " + error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center py-8 text-muted-foreground">Loading delivery details...</div>
      </div>
    );
  }

  if (!data || !data.delivery) {
    return (
      <div className="p-8">
        <div className="text-center py-8 text-muted-foreground">Delivery not found</div>
      </div>
    );
  }

  const { delivery, items } = data;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive"; icon: any }> = {
      planned: { variant: "secondary", icon: Calendar },
      in_transit: { variant: "default", icon: Truck },
      delivered: { variant: "default", icon: CheckCircle2 },
      cancelled: { variant: "destructive", icon: XCircle },
    };

    const config = variants[status] || { variant: "secondary" as const, icon: Package };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "Not set";
    return new Date(date).toLocaleDateString();
  };

  const handleStatusUpdate = () => {
    if (!newStatus) {
      toast.error("Please select a status");
      return;
    }

    updateMutation.mutate({
      id: delivery.id,
      status: newStatus as "planned" | "in_transit" | "delivered" | "cancelled",
      deliveredDate: newStatus === "delivered" ? new Date(deliveredDate) : undefined,
    });
  };

  const canUpdateStatus = delivery.status !== "delivered" && delivery.status !== "cancelled";

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/deliveries">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{delivery.deliveryNumber}</h1>
            <p className="text-muted-foreground">Delivery details and tracking</p>
          </div>
        </div>
        {canUpdateStatus && (
          <Button onClick={() => setShowStatusDialog(true)}>
            Update Status
          </Button>
        )}
      </div>

      {/* Status and Basic Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span>{getStatusBadge(delivery.status)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Scheduled Date:</span>
              <span className="font-medium">{formatDate(delivery.scheduledDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivered Date:</span>
              <span className="font-medium">{formatDate(delivery.deliveredDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span className="font-medium">{formatDate(delivery.createdAt)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shipping Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Driver:</span>
              <span className="font-medium">{delivery.driverName || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vehicle:</span>
              <span className="font-medium">{delivery.vehicleNumber || "-"}</span>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Delivery Address:</div>
              <div className="font-medium whitespace-pre-wrap">
                {delivery.deliveryAddress || "-"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {delivery.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{delivery.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Delivery Items */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Items</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No items in this delivery</div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">Item {index + 1}</div>
                      <div className="text-sm text-muted-foreground">Product ID: {item.productId}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">Quantity: {item.quantity}</div>
                      {item.batchNumber && (
                        <div className="text-sm text-muted-foreground">Batch: {item.batchNumber}</div>
                      )}
                    </div>
                  </div>
                  {item.notes && (
                    <div className="mt-2 text-sm text-muted-foreground">{item.notes}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Delivery Status</DialogTitle>
            <DialogDescription>
              Change the status of this delivery. Marking as delivered will automatically update inventory.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newStatus === "delivered" && (
              <div className="space-y-2">
                <Label>Delivered Date</Label>
                <Input
                  type="date"
                  value={deliveredDate}
                  onChange={(e) => setDeliveredDate(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
