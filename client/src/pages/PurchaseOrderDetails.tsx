import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, XCircle, Package, FileText } from "lucide-react";

export default function PurchaseOrderDetails() {
  const [, params] = useRoute("/purchase-orders/:id");
  const [, setLocation] = useLocation();
  const poId = params?.id ? parseInt(params.id) : 0;

  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalDecision, setApprovalDecision] = useState<boolean>(true);
  const [rejectionReason, setRejectionReason] = useState("");

  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [receiptNotes, setReceiptNotes] = useState("");
  const [receiptItems, setReceiptItems] = useState<
    Array<{
      poItemId: number;
      quantityReceived: number;
      batchNumber?: string;
      expiryDate?: string;
      condition: "good" | "damaged" | "defective";
      notes?: string;
    }>
  >([]);

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.purchaseOrders.get.useQuery({ id: poId });
  const { data: suppliers = [] } = trpc.suppliers.list.useQuery();
  const { data: tenders = [] } = trpc.tenders.list.useQuery();
  const { data: budgets = [] } = trpc.budgets.list.useQuery();

  const approveMutation = trpc.purchaseOrders.approve.useMutation({
    onSuccess: () => {
      toast.success(approvalDecision ? "Purchase order approved" : "Purchase order rejected");
      utils.purchaseOrders.get.invalidate({ id: poId });
      setApprovalDialogOpen(false);
      setRejectionReason("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const receiveGoodsMutation = trpc.purchaseOrders.receiveGoods.useMutation({
    onSuccess: (data) => {
      toast.success(`Goods receipt ${data.receiptNumber} created successfully`);
      utils.purchaseOrders.get.invalidate({ id: poId });
      setReceiveDialogOpen(false);
      setReceiptNotes("");
      setReceiptItems([]);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleApprove = () => {
    approveMutation.mutate({
      id: poId,
      approved: approvalDecision,
      rejectionReason: approvalDecision ? undefined : rejectionReason,
    });
  };

  const handleReceiveGoods = () => {
    if (receiptItems.length === 0) {
      toast.error("Please add at least one item to receive");
      return;
    }

    if (receiptItems.some((item) => item.quantityReceived <= 0)) {
      toast.error("All quantities must be greater than 0");
      return;
    }

    receiveGoodsMutation.mutate({
      poId,
      items: receiptItems.map((item) => ({
        ...item,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
      })),
      notes: receiptNotes || undefined,
    });
  };

  const initializeReceiptItems = () => {
    if (data?.items) {
      setReceiptItems(
        data.items.map((item) => ({
          poItemId: item.id,
          quantityReceived: item.quantity - item.receivedQuantity,
          condition: "good" as const,
        }))
      );
    }
    setReceiveDialogOpen(true);
  };

  const updateReceiptItem = (
    poItemId: number,
    field: string,
    value: string | number
  ) => {
    setReceiptItems((prev) =>
      prev.map((item) =>
        item.poItemId === poItemId ? { ...item, [field]: value } : item
      )
    );
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!data?.po) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Purchase order not found</h3>
          <Link href="/purchase-orders">
            <Button className="mt-4">Back to Purchase Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { po, items, receipts } = data;

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
    > = {
      draft: { variant: "secondary", label: "Draft" },
      submitted: { variant: "outline", label: "Submitted" },
      approved: { variant: "default", label: "Approved" },
      rejected: { variant: "destructive", label: "Rejected" },
      completed: { variant: "default", label: "Completed" },
      cancelled: { variant: "secondary", label: "Cancelled" },
    };
    const config = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getReceivedStatusBadge = (status: string) => {
    const variants: Record<
      string,
      { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
    > = {
      not_received: { variant: "secondary", label: "Not Received" },
      partially_received: { variant: "outline", label: "Partially Received" },
      fully_received: { variant: "default", label: "Fully Received" },
    };
    const config = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  const getSupplierName = (supplierId: number) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    return supplier?.name || "Unknown";
  };

  const getTenderTitle = (tenderId: number | null) => {
    if (!tenderId) return "N/A";
    const tender = tenders.find((t) => t.id === tenderId);
    return tender ? `${tender.referenceNumber} - ${tender.title}` : "Unknown";
  };

  const getBudgetName = (budgetId: number | null) => {
    if (!budgetId) return "N/A";
    const budget = budgets.find((b) => b.id === budgetId);
    return budget?.name || "Unknown";
  };

  const canApprove = po.status === "submitted";
  const canReceive = po.status === "approved" && po.receivedStatus !== "fully_received";

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/purchase-orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{po.poNumber}</h1>
            <p className="text-muted-foreground">Purchase Order Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          {getStatusBadge(po.status)}
          {getReceivedStatusBadge(po.receivedStatus)}
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Order Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">Supplier</Label>
              <p className="font-medium">{getSupplierName(po.supplierId)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Issue Date</Label>
              <p className="font-medium">{formatDate(po.issueDate)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Expected Delivery</Label>
              <p className="font-medium">{formatDate(po.deliveryDate)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Linked Tender</Label>
              <p className="font-medium">{getTenderTitle(po.tenderId)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Linked Budget</Label>
              <p className="font-medium">{getBudgetName(po.budgetId)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Total Amount</Label>
              <p className="text-2xl font-bold">{formatCurrency(po.totalAmount)}</p>
            </div>
          </div>

          {po.deliveryAddress && (
            <div>
              <Label className="text-muted-foreground">Delivery Address</Label>
              <p className="font-medium whitespace-pre-wrap">{po.deliveryAddress}</p>
            </div>
          )}

          {po.paymentTerms && (
            <div>
              <Label className="text-muted-foreground">Payment Terms</Label>
              <p className="font-medium whitespace-pre-wrap">{po.paymentTerms}</p>
            </div>
          )}

          {po.notes && (
            <div>
              <Label className="text-muted-foreground">Notes</Label>
              <p className="font-medium whitespace-pre-wrap">{po.notes}</p>
            </div>
          )}

          {po.status === "rejected" && po.rejectionReason && (
            <div className="bg-destructive/10 p-4 rounded-lg">
              <Label className="text-destructive">Rejection Reason</Label>
              <p className="text-destructive font-medium">{po.rejectionReason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.receivedQuantity >= item.quantity
                          ? "default"
                          : item.receivedQuantity > 0
                          ? "outline"
                          : "secondary"
                      }
                    >
                      {item.receivedQuantity} / {item.quantity}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell>{formatCurrency(item.totalPrice)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 space-y-2 text-right">
            <div className="flex justify-between text-lg">
              <span>Subtotal:</span>
              <span className="font-semibold">{formatCurrency(po.subtotal)}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span>Tax:</span>
              <span className="font-semibold">{formatCurrency(po.taxAmount)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(po.totalAmount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goods Receipts */}
      {receipts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Goods Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt Number</TableHead>
                  <TableHead>Receipt Date</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">{receipt.receiptNumber}</TableCell>
                    <TableCell>{formatDate(receipt.receiptDate)}</TableCell>
                    <TableCell>{receipt.notes || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-4">
        {canApprove && (
          <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve / Reject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Approve or Reject Purchase Order</DialogTitle>
                <DialogDescription>
                  Review the purchase order and make your decision
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Decision</Label>
                  <Select
                    value={approvalDecision ? "approve" : "reject"}
                    onValueChange={(value) => setApprovalDecision(value === "approve")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approve">Approve</SelectItem>
                      <SelectItem value="reject">Reject</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {!approvalDecision && (
                  <div className="space-y-2">
                    <Label>Rejection Reason *</Label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Explain why this PO is being rejected"
                      rows={4}
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending || (!approvalDecision && !rejectionReason)}
                >
                  {approveMutation.isPending ? "Processing..." : "Confirm"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {canReceive && (
          <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={initializeReceiptItems}>
                <Package className="mr-2 h-4 w-4" />
                Receive Goods
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Receive Goods</DialogTitle>
                <DialogDescription>
                  Record the receipt of goods for this purchase order
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {items.map((item) => {
                  const receiptItem = receiptItems.find((ri) => ri.poItemId === item.id);
                  if (!receiptItem) return null;

                  const remainingQty = item.quantity - item.receivedQuantity;

                  return (
                    <Card key={item.id}>
                      <CardHeader>
                        <CardTitle className="text-base">{item.description}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Ordered: {item.quantity} | Already Received: {item.receivedQuantity} |
                          Remaining: {remainingQty}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Quantity Received *</Label>
                            <Input
                              type="number"
                              min="0"
                              max={remainingQty}
                              value={receiptItem.quantityReceived}
                              onChange={(e) =>
                                updateReceiptItem(
                                  item.id,
                                  "quantityReceived",
                                  parseInt(e.target.value) || 0
                                )
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Condition</Label>
                            <Select
                              value={receiptItem.condition}
                              onValueChange={(value) =>
                                updateReceiptItem(item.id, "condition", value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="good">Good</SelectItem>
                                <SelectItem value="damaged">Damaged</SelectItem>
                                <SelectItem value="defective">Defective</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Batch Number</Label>
                            <Input
                              value={receiptItem.batchNumber || ""}
                              onChange={(e) =>
                                updateReceiptItem(item.id, "batchNumber", e.target.value)
                              }
                              placeholder="Optional"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Expiry Date</Label>
                            <Input
                              type="date"
                              value={receiptItem.expiryDate || ""}
                              onChange={(e) =>
                                updateReceiptItem(item.id, "expiryDate", e.target.value)
                              }
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Notes</Label>
                          <Input
                            value={receiptItem.notes || ""}
                            onChange={(e) =>
                              updateReceiptItem(item.id, "notes", e.target.value)
                            }
                            placeholder="Optional notes for this item"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                <div className="space-y-2">
                  <Label>Receipt Notes</Label>
                  <Textarea
                    value={receiptNotes}
                    onChange={(e) => setReceiptNotes(e.target.value)}
                    placeholder="General notes for this goods receipt"
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setReceiveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleReceiveGoods} disabled={receiveGoodsMutation.isPending}>
                  {receiveGoodsMutation.isPending ? "Processing..." : "Confirm Receipt"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
