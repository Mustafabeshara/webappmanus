import { useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

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

const statusOptions = Object.keys(statusLabels);

const approvalRoles = [
  { value: "head_of_department", label: "Head of Department" },
  { value: "committee_head", label: "Committee Head" },
  { value: "specialty_head", label: "Specialty Head" },
  { value: "fatwa", label: "فتوى والتشريع" },
  { value: "ctc", label: "CTC" },
  { value: "audit", label: "Audit Bureau" },
];

const approvalGateLabels: Record<string, string> = {
  committee: "Committee",
  fatwa: "فتوى والتشريع",
  ctc_audit: "CTC + Audit",
};

function formatKwd(amountCents?: number | null) {
  if (amountCents === undefined || amountCents === null) return "-";
  return `${(amountCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KWD`;
}

export default function RequirementDetails() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const id = useMemo(() => Number(params.id || 0), [params.id]);

  const { data: requirement, isLoading, refetch } = trpc.requirements.get.useQuery({ id }, { enabled: id > 0 });
  const updateStatus = trpc.requirements.updateStatus.useMutation();
  const addApproval = trpc.requirements.addApproval.useMutation();
  const upsertCms = trpc.requirements.upsertCmsCase.useMutation();
  const addFollowup = trpc.requirements.addFollowup.useMutation();

  const [statusValue, setStatusValue] = useState<string>("");
  const [approvalRole, setApprovalRole] = useState<string>("head_of_department");
  const [approvalDecision, setApprovalDecision] = useState<string>("approved");
  const [approvalNote, setApprovalNote] = useState<string>("");
  const [cmsCaseNumber, setCmsCaseNumber] = useState<string>("");
  const [cmsStatus, setCmsStatus] = useState<string>("with_cms");
  const [cmsContact, setCmsContact] = useState<string>("");
  const [nextFollowup, setNextFollowup] = useState<string>("");
  const [cmsNotes, setCmsNotes] = useState<string>("");
  const [followupNote, setFollowupNote] = useState<string>("");
  const [followupContact, setFollowupContact] = useState<string>("");
  const [followupNextAction, setFollowupNextAction] = useState<string>("");

  const statusToUse = statusValue || requirement?.status || "draft";
  const approvals = requirement?.approvals || [];
  const items = requirement?.items || [];
  const cmsCase = requirement?.cmsCase;
  const followups = requirement?.followups || [];

  if (!id || Number.isNaN(id)) {
    return <div className="p-6">Invalid requirement ID.</div>;
  }

  if (isLoading) {
    return <div className="p-6">Loading requirement...</div>;
  }

  if (!requirement) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => setLocation("/requirements")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="mt-4 text-muted-foreground">Requirement not found.</div>
      </div>
    );
  }

  function handleStatusUpdate() {
    updateStatus.mutate(
      { id, status: statusToUse as any },
      {
        onSuccess: () => {
          toast.success("Status updated");
          refetch();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  }

  function handleAddApproval() {
    addApproval.mutate(
      {
        requestId: id,
        role: approvalRole as any,
        decision: approvalDecision as any,
        note: approvalNote || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Approval recorded");
          setApprovalNote("");
          refetch();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  }

  function handleSaveCms() {
    upsertCms.mutate(
      {
        requestId: id,
        caseNumber: cmsCaseNumber || undefined,
        status: cmsStatus as any,
        cmsContact: cmsContact || undefined,
        nextFollowupDate: nextFollowup || undefined,
        notes: cmsNotes || undefined,
      },
      {
        onSuccess: () => {
          toast.success("CMS case updated");
          refetch();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  }

  function handleAddFollowup() {
    if (!followupNote) {
      toast.error("Follow-up note is required");
      return;
    }
    addFollowup.mutate(
      {
        requestId: id,
        note: followupNote,
        contact: followupContact || undefined,
        nextActionDate: followupNextAction || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Follow-up logged");
          setFollowupNote("");
          setFollowupContact("");
          setFollowupNextAction("");
          refetch();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  }

  const isAbove75k = (requirement.totalValue || 0) >= 75_000 * 100;
  const isAbove100k = (requirement.totalValue || 0) > 100_000 * 100;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/requirements")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{requirement.hospital}</h1>
            <p className="text-muted-foreground">{requirement.specialty} • FY {requirement.fiscalYear}</p>
            <div className="flex gap-2 mt-2">
              <Badge>{statusLabels[requirement.status] || requirement.status}</Badge>
              <Badge variant="outline">{approvalGateLabels[requirement.approvalGate] || requirement.approvalGate}</Badge>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Total (est.)</div>
          <div className="text-2xl font-semibold">{formatKwd(requirement.totalValue)}</div>
          <div className="text-xs text-muted-foreground">
            {isAbove100k ? "CTC + Audit required" : isAbove75k ? "فتوى والتشريع required" : "Committee approval required"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Status</CardTitle>
              <CardDescription>Move through the approval/submission workflow</CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <Select value={statusToUse} onValueChange={setStatusValue}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleStatusUpdate} disabled={updateStatus.isPending}>
                {updateStatus.isPending ? "Updating..." : "Update"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-sm mb-2">Approvals</CardTitle>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Decision</TableHead>
                    <TableHead>Approver</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Decided At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No approvals recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    approvals.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell>{approvalRoles.find(r => r.value === a.role)?.label || a.role}</TableCell>
                        <TableCell>
                          <Badge variant={a.decision === "approved" ? "default" : a.decision === "pending" ? "secondary" : "destructive"}>
                            {a.decision}
                          </Badge>
                        </TableCell>
                        <TableCell>{a.approverName || "-"}</TableCell>
                        <TableCell className="max-w-xs truncate">{a.note || "-"}</TableCell>
                        <TableCell>{a.decidedAt ? new Date(a.decidedAt).toLocaleString() : "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              <div>
                <Label>Role</Label>
                <Select value={approvalRole} onValueChange={setApprovalRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {approvalRoles.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Decision</Label>
                <Select value={approvalDecision} onValueChange={setApprovalDecision}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Note</Label>
                <Input value={approvalNote} onChange={(e) => setApprovalNote(e.target.value)} placeholder="Optional note" />
              </div>
            </div>
            <div className="mt-3">
              <Button onClick={handleAddApproval} disabled={addApproval.isPending}>
                {addApproval.isPending ? "Saving..." : "Record Approval"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CMS Case</CardTitle>
            <CardDescription>Track submission and follow-up</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Case Number</Label>
              <Input
                value={cmsCaseNumber || cmsCase?.caseNumber || ""}
                onChange={(e) => setCmsCaseNumber(e.target.value)}
                placeholder="CMS case number"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={cmsStatus || cmsCase?.status || "with_cms"} onValueChange={setCmsStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="with_cms">With CMS</SelectItem>
                  <SelectItem value="discount_requested">Discount Requested</SelectItem>
                  <SelectItem value="awaiting_ctc">Awaiting CTC</SelectItem>
                  <SelectItem value="awaiting_fatwa">Awaiting فتوى والتشريع</SelectItem>
                  <SelectItem value="awaiting_audit">Awaiting Audit</SelectItem>
                  <SelectItem value="contract_issued">Contract Issued</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>CMS Contact</Label>
              <Input
                value={cmsContact || cmsCase?.cmsContact || ""}
                onChange={(e) => setCmsContact(e.target.value)}
                placeholder="Contact name/number"
              />
            </div>
            <div>
              <Label>Next Follow-up Date</Label>
              <Input
                type="date"
                value={nextFollowup || (cmsCase?.nextFollowupDate ? cmsCase.nextFollowupDate.slice(0, 10) : "")}
                onChange={(e) => setNextFollowup(e.target.value)}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={cmsNotes || cmsCase?.notes || ""}
                onChange={(e) => setCmsNotes(e.target.value)}
                rows={3}
              />
            </div>
            <Button onClick={handleSaveCms} disabled={upsertCms.isPending}>
              {upsertCms.isPending ? "Saving..." : "Save CMS Info"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
          <CardDescription>Requested products/services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Est. Unit Price</TableHead>
                  <TableHead>Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No items added.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{formatKwd(item.estimatedUnitPrice)}</TableCell>
                      <TableCell>{item.category || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Follow-ups</CardTitle>
            <CardDescription>Log weekly CMS follow-ups and next actions</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1 min-w-[200px]">
              <Label>Note</Label>
              <Input value={followupNote} onChange={(e) => setFollowupNote(e.target.value)} placeholder="Follow-up details" />
            </div>
            <div className="min-w-[180px]">
              <Label>Contact</Label>
              <Input value={followupContact} onChange={(e) => setFollowupContact(e.target.value)} placeholder="Name/phone" />
            </div>
            <div className="min-w-[160px]">
              <Label>Next Action Date</Label>
              <Input type="date" value={followupNextAction} onChange={(e) => setFollowupNextAction(e.target.value)} />
            </div>
            <Button onClick={handleAddFollowup} disabled={addFollowup.isPending}>
              {addFollowup.isPending ? "Logging..." : "Log"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Next Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {followups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No follow-ups logged yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  followups.map((f: any) => (
                    <TableRow key={f.id}>
                      <TableCell>{f.followupDate ? new Date(f.followupDate).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>{f.contact || "-"}</TableCell>
                      <TableCell className="max-w-xl">{f.note}</TableCell>
                      <TableCell>{f.nextActionDate ? new Date(f.nextActionDate).toLocaleDateString() : "-"}</TableCell>
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
