import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft, Plus, Edit, Users } from "lucide-react";
import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";

export default function TenderDetails() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/tenders/:id");
  const tenderId = params?.id ? parseInt(params.id) : 0;

  const [isAddingParticipant, setIsAddingParticipant] = useState(false);
  const [participantData, setParticipantData] = useState({
    supplierId: "",
    totalBidAmount: "",
    notes: "",
  });

  const { data, isLoading, refetch } = trpc.tenders.get.useQuery({ id: tenderId });
  const suppliers = trpc.suppliers.list.useQuery();

  const addParticipantMutation = trpc.tenders.addParticipant.useMutation({
    onSuccess: () => {
      toast.success("Participant added successfully");
      setIsAddingParticipant(false);
      setParticipantData({ supplierId: "", totalBidAmount: "", notes: "" });
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to add participant: ${error.message}`);
    },
  });

  const updateStatusMutation = trpc.tenders.update.useMutation({
    onSuccess: () => {
      toast.success("Status updated successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const handleAddParticipant = () => {
    if (!participantData.supplierId || !participantData.totalBidAmount) {
      toast.error("Please fill in all required fields");
      return;
    }

    addParticipantMutation.mutate({
      tenderId,
      supplierId: parseInt(participantData.supplierId),
      totalBidAmount: Math.round(parseFloat(participantData.totalBidAmount) * 100),
      notes: participantData.notes || undefined,
    });
  };

  const handleStatusChange = (newStatus: string) => {
    updateStatusMutation.mutate({
      id: tenderId,
      status: newStatus as any,
    });
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data?.tender) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Tender Not Found</h2>
          <p className="text-muted-foreground mb-4">The tender you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation("/tenders")}>Back to Tenders</Button>
        </div>
      </div>
    );
  }

  const { tender, items, participants } = data;
  const lowestBid = participants.length > 0 
    ? Math.min(...participants.map(p => p.totalBidAmount || 0))
    : 0;

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/tenders")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tenders
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{tender.title}</h1>
            <p className="text-muted-foreground">Reference: {tender.referenceNumber}</p>
          </div>
          <div className="flex gap-2">
            <Select value={tender.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="awarded">Awarded</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Tender Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">
                  <Badge variant={
                    tender.status === "open" ? "default" :
                    tender.status === "awarded" ? "default" :
                    tender.status === "closed" ? "secondary" :
                    "outline"
                  }>
                    {tender.status}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Estimated Value</Label>
                <div className="mt-1 font-semibold">
                  ${((tender.estimatedValue || 0) / 100).toFixed(2)}
                </div>
              </div>
              {tender.submissionDeadline && (
                <div>
                  <Label className="text-muted-foreground">Submission Deadline</Label>
                  <div className="mt-1">
                    {new Date(tender.submissionDeadline).toLocaleString()}
                  </div>
                </div>
              )}
              {tender.evaluationDeadline && (
                <div>
                  <Label className="text-muted-foreground">Evaluation Deadline</Label>
                  <div className="mt-1">
                    {new Date(tender.evaluationDeadline).toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {tender.description && (
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="mt-1">{tender.description}</p>
              </div>
            )}

            {tender.requirements && (
              <div>
                <Label className="text-muted-foreground">Requirements</Label>
                <p className="mt-1 whitespace-pre-wrap">{tender.requirements}</p>
              </div>
            )}

            {tender.terms && (
              <div>
                <Label className="text-muted-foreground">Terms & Conditions</Label>
                <p className="mt-1 whitespace-pre-wrap">{tender.terms}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tender Items */}
        <Card>
          <CardHeader>
            <CardTitle>Tender Items</CardTitle>
            <CardDescription>{items.length} item(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Est. Price</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.unit || "-"}</TableCell>
                    <TableCell className="text-right">
                      ${((item.estimatedPrice || 0) / 100).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${((item.quantity * (item.estimatedPrice || 0)) / 100).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Participants & Bids */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Participants & Bids</CardTitle>
                <CardDescription>{participants.length} participant(s)</CardDescription>
              </div>
              <Dialog open={isAddingParticipant} onOpenChange={setIsAddingParticipant}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Participant
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Participant</DialogTitle>
                    <DialogDescription>
                      Add a supplier as a participant to this tender
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Supplier *</Label>
                      <Select
                        value={participantData.supplierId}
                        onValueChange={(value) => setParticipantData({ ...participantData, supplierId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.data?.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id.toString()}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Total Bid Amount ($) *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={participantData.totalBidAmount}
                        onChange={(e) => setParticipantData({ ...participantData, totalBidAmount: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Input
                        value={participantData.notes}
                        onChange={(e) => setParticipantData({ ...participantData, notes: e.target.value })}
                        placeholder="Additional notes"
                      />
                    </div>
                    <Button
                      onClick={handleAddParticipant}
                      disabled={addParticipantMutation.isPending}
                      className="w-full"
                    >
                      {addParticipantMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Add Participant
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {participants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No participants yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Bid Amount</TableHead>
                    <TableHead className="text-right">vs Estimate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((participant) => {
                    const bidAmount = participant.totalBidAmount || 0;
                    const estimate = tender.estimatedValue || 0;
                    const difference = bidAmount - estimate;
                    const percentDiff = estimate > 0 ? (difference / estimate) * 100 : 0;
                    const isLowest = bidAmount === lowestBid && lowestBid > 0;

                    return (
                      <TableRow key={participant.id}>
                        <TableCell className="font-medium">
                          Supplier #{participant.supplierId}
                          {isLowest && (
                            <Badge variant="default" className="ml-2">Lowest Bid</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${(bidAmount / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={difference > 0 ? "text-red-600" : "text-green-600"}>
                            {difference > 0 ? "+" : ""}${(difference / 100).toFixed(2)}
                            ({percentDiff > 0 ? "+" : ""}{percentDiff.toFixed(1)}%)
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{participant.status || "pending"}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {participant.notes || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
