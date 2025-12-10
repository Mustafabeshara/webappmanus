import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

function formatKwd(amountCents: number) {
  return `${(amountCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KWD`;
}

export default function Opportunities() {
  const { data: opportunities = [], refetch } = trpc.opportunities.list.useQuery();
  const createMutation = trpc.opportunities.create.useMutation({
    onSuccess: () => {
      toast.success("Opportunity created");
      setOpen(false);
      resetForm();
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = trpc.opportunities.update.useMutation({
    onSuccess: () => refetch(),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    amount: "",
    probability: "50",
    stage: "prospect",
    expectedCloseDate: "",
    notes: "",
  });

  const resetForm = () => {
    setForm({
      name: "",
      amount: "",
      probability: "50",
      stage: "prospect",
      expectedCloseDate: "",
      notes: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Math.round(Number(form.amount || 0) * 100);
    const probability = Number(form.probability || 0);
    createMutation.mutate({
      name: form.name,
      amount,
      probability,
      stage: form.stage as any,
      expectedCloseDate: form.expectedCloseDate || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Opportunities</h1>
          <p className="text-muted-foreground">Pipeline for forecasting and commissions.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>New Opportunity</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Opportunity</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Amount (KWD)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Probability (%)</Label>
                  <Input
                    type="number"
                    value={form.probability}
                    onChange={(e) => setForm({ ...form, probability: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Stage</Label>
                  <Select value={form.stage} onValueChange={(val) => setForm({ ...form, stage: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="proposal">Proposal</SelectItem>
                      <SelectItem value="negotiation">Negotiation</SelectItem>
                      <SelectItem value="verbal">Verbal</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Expected Close</Label>
                  <Input
                    type="date"
                    value={form.expectedCloseDate}
                    onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline</CardTitle>
          <CardDescription>Probability-weighted revenue view.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Prob.</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Expected Close</TableHead>
                  <TableHead>Weighted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No opportunities yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  opportunities.map((opp: any) => (
                    <TableRow key={opp.id}>
                      <TableCell className="font-medium">{opp.name}</TableCell>
                      <TableCell>{formatKwd(opp.amount || 0)}</TableCell>
                      <TableCell>{opp.probability}%</TableCell>
                      <TableCell className="capitalize">{opp.stage}</TableCell>
                      <TableCell>{opp.expectedCloseDate ? new Date(opp.expectedCloseDate).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>{formatKwd(Math.round((opp.amount || 0) * (opp.probability || 0) / 100))}</TableCell>
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
