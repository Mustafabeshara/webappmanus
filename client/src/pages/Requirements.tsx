import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type RequirementItemInput = {
  description: string;
  quantity: string;
  unit: string;
  estimatedUnitPrice: string;
  category?: string;
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  department_review: "Dept Review",
  committee_pending: "Committee Pending",
  committee_approved: "Committee Approved",
  submitted_to_cms: "Submitted to CMS",
  budget_allocated: "Budget Allocated",
  tender_posted: "Tender Posted",
  award_pending: "Award Pending",
  award_approved: "Award Approved",
  discount_requested: "Discount Requested",
  contract_issued: "Contract Issued",
  closed: "Closed",
  rejected: "Rejected",
};

const statusOptions = [
  "draft",
  "committee_pending",
  "committee_approved",
  "submitted_to_cms",
  "tender_posted",
  "contract_issued",
  "closed",
] as const;

const approvalGateLabels: Record<string, string> = {
  committee: "Committee",
  fatwa: "فتوى والتشريع",
  ctc_audit: "CTC + Audit",
};

function getDefaultFiscalYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based
  // Fiscal year starts in April; if Jan-Mar, fiscal year is previous year start
  return month < 3 ? year - 1 : year;
}

function formatKwd(amountCents?: number) {
  if (amountCents === undefined || amountCents === null) return "-";
  return `${(amountCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KWD`;
}

export default function Requirements() {
  const [createOpen, setCreateOpen] = useState(false);
  const [hospital, setHospital] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [fiscalYear, setFiscalYear] = useState(getDefaultFiscalYear().toString());
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<RequirementItemInput[]>([
    { description: "", quantity: "1", unit: "unit", estimatedUnitPrice: "" },
  ]);
  const [statusUpdate, setStatusUpdate] = useState<Record<number, string>>({});

  const { data: requirements = [], refetch } = trpc.requirements.list.useQuery();

  const createMutation = trpc.requirements.create.useMutation({
    onSuccess: () => {
      toast.success("Requirement request created");
      setCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStatusMutation = trpc.requirements.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const totals = useMemo(() => {
    return items.reduce((sum, item) => {
      const price = parseFloat(item.estimatedUnitPrice || "0");
      const qty = parseInt(item.quantity || "0", 10);
      if (Number.isNaN(price) || Number.isNaN(qty)) return sum;
      return sum + price * qty;
    }, 0);
  }, [items]);

  function resetForm() {
    setHospital("");
    setSpecialty("");
    setFiscalYear(getDefaultFiscalYear().toString());
    setNotes("");
    setItems([{ description: "", quantity: "1", unit: "unit", estimatedUnitPrice: "" }]);
  }

  function addItemRow() {
    setItems(prev => [...prev, { description: "", quantity: "1", unit: "unit", estimatedUnitPrice: "" }]);
  }

  function updateItem(idx: number, key: keyof RequirementItemInput, value: string) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [key]: value } : item));
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!hospital || !specialty) {
      toast.error("Hospital and specialty are required");
      return;
    }
    const parsedFiscal = parseInt(fiscalYear, 10);
    if (Number.isNaN(parsedFiscal)) {
      toast.error("Fiscal year is invalid");
      return;
    }

    const payloadItems = items.map(item => {
      const qty = parseInt(item.quantity || "0", 10);
      const price = parseFloat(item.estimatedUnitPrice || "0");
      if (Number.isNaN(qty) || qty <= 0) {
        throw new Error("Quantity must be greater than zero");
      }
      if (Number.isNaN(price) || price < 0) {
        throw new Error("Estimated unit price must be provided");
      }
      return {
        description: item.description,
        quantity: qty,
        unit: item.unit || "unit",
        estimatedUnitPrice: Math.round(price * 100),
        category: item.category || undefined,
      };
    });

    createMutation.mutate({
      hospital,
      specialty,
      fiscalYear: parsedFiscal,
      notes: notes || undefined,
      items: payloadItems,
      departmentId: undefined,
    });
  }

  function handleStatusChange(id: number, status: string) {
    setStatusUpdate(prev => ({ ...prev, [id]: status }));
  }

  function submitStatus(id: number) {
    const next = statusUpdate[id];
    if (!next) return;
    updateStatusMutation.mutate({ id, status: next as any });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Annual Requirements</h1>
          <p className="text-muted-foreground">
            Capture hospital requests, approvals, and CMS submission workflow (April–March fiscal year).
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>New Requirement</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Create Requirements Request</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Hospital</Label>
                  <Input value={hospital} onChange={(e) => setHospital(e.target.value)} required />
                </div>
                <div>
                  <Label>Specialty</Label>
                  <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} required />
                </div>
                <div>
                  <Label>Fiscal Year (start)</Label>
                  <Input
                    value={fiscalYear}
                    onChange={(e) => setFiscalYear(e.target.value)}
                    placeholder="2024"
                    required
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItemRow}>
                    Add Item
                  </Button>
                </div>
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Label>Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(idx, "description", e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Unit</Label>
                        <Input
                          value={item.unit}
                          onChange={(e) => updateItem(idx, "unit", e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Est. Unit Price (KWD)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={item.estimatedUnitPrice}
                          onChange={(e) => updateItem(idx, "estimatedUnitPrice", e.target.value)}
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button type="button" variant="ghost" onClick={() => removeItem(idx)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Total (est.): <span className="font-semibold">{totals.toFixed(3)} KWD</span>
                </div>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
          <CardDescription>Track committee approvals and CMS submission status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hospital / Specialty</TableHead>
                  <TableHead>Fiscal Year</TableHead>
                  <TableHead>Approval Gate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requirements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No requirements captured yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  requirements.map((req: any) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div className="font-medium">{req.hospital}</div>
                        <div className="text-sm text-muted-foreground">{req.specialty}</div>
                      </TableCell>
                      <TableCell>{req.fiscalYear}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {approvalGateLabels[req.approvalGate] || req.approvalGate}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge>{statusLabels[req.status] || req.status}</Badge>
                      </TableCell>
                      <TableCell>{formatKwd(req.totalValue)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={statusUpdate[req.id] || req.status}
                            onValueChange={(val) => handleStatusChange(req.id, val)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {statusLabels[opt]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="outline" onClick={() => submitStatus(req.id)}>
                            Update
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
