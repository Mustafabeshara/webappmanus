import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, FileText, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function TenderTemplates() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [defaultRequirements, setDefaultRequirements] = useState("");
  const [defaultTerms, setDefaultTerms] = useState("");

  const utils = trpc.useUtils();
  const { data: templates, isLoading } = trpc.tenderTemplates.list.useQuery();
  
  const createTemplate = trpc.tenderTemplates.create.useMutation({
    onSuccess: () => {
      utils.tenderTemplates.list.invalidate();
      setIsCreateOpen(false);
      setTemplateName("");
      setTemplateDescription("");
      setDefaultRequirements("");
      setDefaultTerms("");
      toast.success("Template created successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create template");
    },
  });

  const deleteTemplate = trpc.tenderTemplates.delete.useMutation({
    onSuccess: () => {
      utils.tenderTemplates.list.invalidate();
      toast.success("Template deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete template");
    },
  });

  const handleCreateTemplate = () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    createTemplate.mutate({
      name: templateName,
      description: templateDescription || undefined,
      defaultRequirements: defaultRequirements || undefined,
      defaultTerms: defaultTerms || undefined,
    });
  };

  const handleDeleteTemplate = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete template "${name}"?`)) {
      deleteTemplate.mutate({ id });
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tender Templates</h1>
          <p className="text-muted-foreground mt-1">
            Create reusable tender blueprints for faster tender creation
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Tender Template</DialogTitle>
              <DialogDescription>
                Create a reusable template with default fields and requirements
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Standard Medical Equipment Tender"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of this template..."
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="requirements">Default Requirements</Label>
                <Textarea
                  id="requirements"
                  placeholder="Standard requirements for this type of tender..."
                  value={defaultRequirements}
                  onChange={(e) => setDefaultRequirements(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="terms">Default Terms & Conditions</Label>
                <Textarea
                  id="terms"
                  placeholder="Standard terms and conditions..."
                  value={defaultTerms}
                  onChange={(e) => setDefaultTerms(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate} disabled={createTemplate.isPending}>
                {createTemplate.isPending ? "Creating..." : "Create Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Templates</CardTitle>
          <CardDescription>
            {templates?.length || 0} template(s) available
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates && templates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {template.description || "-"}
                    </TableCell>
                    <TableCell>
                      {format(new Date(template.createdAt), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toast.info("Template details view coming soon")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template.id, template.name)}
                          disabled={deleteTemplate.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No templates found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first template to speed up tender creation
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
