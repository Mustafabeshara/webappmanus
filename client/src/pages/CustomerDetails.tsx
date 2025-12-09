import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Building2, Mail, Phone, MapPin, CreditCard, FileText, Pencil, Plus, MessageSquare, Calendar } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function CustomerDetails() {
  const [, params] = useRoute("/customers/:id");
  const [, setLocation] = useLocation();
  const customerId = params?.id ? parseInt(params.id) : 0;
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCommOpen, setIsCommOpen] = useState(false);

  const utils = trpc.useUtils();

  const { data: customer, isLoading } = trpc.customers.get.useQuery({
    id: customerId,
  });

  const { data: communications } = trpc.customers.getCommunications.useQuery({
    customerId,
  });

  const [editForm, setEditForm] = useState({
    name: "",
    type: "hospital" as "hospital" | "clinic" | "pharmacy" | "other",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    taxId: "",
    creditLimit: "",
    notes: "",
  });

  const [commForm, setCommForm] = useState({
    type: "note" as "email" | "phone" | "meeting" | "note",
    subject: "",
    content: "",
  });

  const updateMutation = trpc.customers.update.useMutation({
    onSuccess: () => {
      toast.success("Customer updated successfully");
      setIsEditOpen(false);
      utils.customers.get.invalidate({ id: customerId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update customer");
    },
  });

  const addCommMutation = trpc.customers.addCommunication.useMutation({
    onSuccess: () => {
      toast.success("Communication added successfully");
      setIsCommOpen(false);
      setCommForm({ type: "note", subject: "", content: "" });
      utils.customers.getCommunications.invalidate({ customerId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add communication");
    },
  });

  const handleEditClick = () => {
    if (customer) {
      setEditForm({
        name: customer.name,
        type: customer.type as any,
        contactPerson: customer.contactPerson || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        taxId: customer.taxId || "",
        creditLimit: customer.creditLimit ? (customer.creditLimit / 100).toString() : "",
        notes: customer.notes || "",
      });
    }
    setIsEditOpen(true);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      id: customerId,
      name: editForm.name,
      type: editForm.type,
      contactPerson: editForm.contactPerson || undefined,
      email: editForm.email || undefined,
      phone: editForm.phone || undefined,
      address: editForm.address || undefined,
      taxId: editForm.taxId || undefined,
      creditLimit: editForm.creditLimit ? parseInt(editForm.creditLimit) * 100 : undefined,
      notes: editForm.notes || undefined,
    });
  };

  const handleCommSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addCommMutation.mutate({
      customerId,
      type: commForm.type,
      subject: commForm.subject || undefined,
      content: commForm.content,
    });
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-lg font-medium">Loading customer...</div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Building2 className="h-16 w-16 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Customer Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The customer you're looking for doesn't exist.
          </p>
          <Button onClick={() => setLocation("/customers")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/customers")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{customer.name}</h1>
            <Badge variant={customer.isActive ? "default" : "secondary"}>
              {customer.isActive ? "Active" : "Inactive"}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {customer.type}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Customer Code: {customer.code}
          </p>
        </div>
        <Button variant="outline" onClick={handleEditClick}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customer.contactPerson && (
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium">Contact Person</div>
                  <div className="text-sm text-muted-foreground">
                    {customer.contactPerson}
                  </div>
                </div>
              </div>
            )}

            {customer.email && (
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium">Email</div>
                  <div className="text-sm text-muted-foreground">
                    {customer.email}
                  </div>
                </div>
              </div>
            )}

            {customer.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium">Phone</div>
                  <div className="text-sm text-muted-foreground">
                    {customer.phone}
                  </div>
                </div>
              </div>
            )}

            {customer.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium">Address</div>
                  <div className="text-sm text-muted-foreground whitespace-pre-line">
                    {customer.address}
                  </div>
                </div>
              </div>
            )}

            {!customer.contactPerson && !customer.email && !customer.phone && !customer.address && (
              <p className="text-sm text-muted-foreground">No contact information available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customer.taxId && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium">Tax ID</div>
                  <div className="text-sm text-muted-foreground">
                    {customer.taxId}
                  </div>
                </div>
              </div>
            )}

            {customer.creditLimit && (
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium">Credit Limit</div>
                  <div className="text-sm text-muted-foreground">
                    KD {(customer.creditLimit / 100).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>
            )}

            {!customer.taxId && !customer.creditLimit && (
              <p className="text-sm text-muted-foreground">No financial information available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {customer.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {customer.notes}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Communications</CardTitle>
          <Dialog open={isCommOpen} onOpenChange={setIsCommOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Communication
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Communication</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCommSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="commType">Type</Label>
                  <Select
                    value={commForm.type}
                    onValueChange={(value: any) =>
                      setCommForm({ ...commForm, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone Call</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="note">Note</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={commForm.subject}
                    onChange={(e) =>
                      setCommForm({ ...commForm, subject: e.target.value })
                    }
                    placeholder="Enter subject"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    value={commForm.content}
                    onChange={(e) =>
                      setCommForm({ ...commForm, content: e.target.value })
                    }
                    placeholder="Enter communication details"
                    rows={4}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={addCommMutation.isPending}>
                    {addCommMutation.isPending ? "Adding..." : "Add Communication"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCommOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {communications && communications.length > 0 ? (
            <div className="space-y-4">
              {communications.map((comm) => (
                <div
                  key={comm.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {comm.type}
                      </Badge>
                      {comm.subject && (
                        <span className="font-medium">{comm.subject}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(comm.contactedAt)}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {comm.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No communications recorded</p>
              <p className="text-sm mt-2">
                Track emails, calls, and meetings with this customer
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No transactions found for this customer</p>
            <p className="text-sm mt-2">
              Invoices and orders will appear here once created
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Name *</Label>
                <Input
                  id="editName"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editType">Type</Label>
                <Select
                  value={editForm.type}
                  onValueChange={(value: any) =>
                    setEditForm({ ...editForm, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hospital">Hospital</SelectItem>
                    <SelectItem value="clinic">Clinic</SelectItem>
                    <SelectItem value="pharmacy">Pharmacy</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editContactPerson">Contact Person</Label>
                <Input
                  id="editContactPerson"
                  value={editForm.contactPerson}
                  onChange={(e) =>
                    setEditForm({ ...editForm, contactPerson: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editPhone">Phone</Label>
                <Input
                  id="editPhone"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editTaxId">Tax ID</Label>
                <Input
                  id="editTaxId"
                  value={editForm.taxId}
                  onChange={(e) =>
                    setEditForm({ ...editForm, taxId: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editAddress">Address</Label>
              <Textarea
                id="editAddress"
                value={editForm.address}
                onChange={(e) =>
                  setEditForm({ ...editForm, address: e.target.value })
                }
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editCreditLimit">Credit Limit (KD)</Label>
              <Input
                id="editCreditLimit"
                type="number"
                value={editForm.creditLimit}
                onChange={(e) =>
                  setEditForm({ ...editForm, creditLimit: e.target.value })
                }
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editNotes">Notes</Label>
              <Textarea
                id="editNotes"
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm({ ...editForm, notes: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
