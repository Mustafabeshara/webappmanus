import { useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Edit2,
  Copy,
  Calendar,
  ClipboardList,
  FileCheck,
  Save,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface TenderTemplate {
  id: number;
  name: string;
  description: string | null;
  defaultRequirements: string | null;
  defaultTerms: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface TemplateDetailModalProps {
  template: TenderTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function TemplateDetailModal({
  template,
  open,
  onOpenChange,
  onUpdate,
}: TemplateDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedRequirements, setEditedRequirements] = useState("");
  const [editedTerms, setEditedTerms] = useState("");

  const utils = trpc.useUtils();

  // @ts-expect-error - update mutation added in tenderTemplates.router.ts, types will resolve after server restart
  const updateTemplate = trpc.tenderTemplates.update.useMutation({
    onSuccess: () => {
      utils.tenderTemplates.list.invalidate();
      setIsEditing(false);
      toast.success("Template updated successfully");
      onUpdate?.();
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "Failed to update template");
    },
  });

  const handleStartEdit = useCallback(() => {
    if (template) {
      setEditedName(template.name);
      setEditedDescription(template.description || "");
      setEditedRequirements(template.defaultRequirements || "");
      setEditedTerms(template.defaultTerms || "");
      setIsEditing(true);
    }
  }, [template]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!template) return;
    if (!editedName.trim()) {
      toast.error("Template name is required");
      return;
    }

    updateTemplate.mutate({
      id: template.id,
      name: editedName,
      description: editedDescription || undefined,
      defaultRequirements: editedRequirements || undefined,
      defaultTerms: editedTerms || undefined,
    });
  }, [template, editedName, editedDescription, editedRequirements, editedTerms, updateTemplate]);

  const handleDuplicate = useCallback(() => {
    if (!template) return;
    // Copy template data to clipboard for easy creation of a new template
    const templateData = {
      name: `${template.name} (Copy)`,
      description: template.description,
      defaultRequirements: template.defaultRequirements,
      defaultTerms: template.defaultTerms,
    };
    navigator.clipboard.writeText(JSON.stringify(templateData, null, 2));
    toast.success("Template data copied to clipboard");
  }, [template]);

  const requirementsList = useMemo(() => {
    if (!template?.defaultRequirements) return [];
    return template.defaultRequirements.split("\n").filter((r) => r.trim());
  }, [template?.defaultRequirements]);

  const termsList = useMemo(() => {
    if (!template?.defaultTerms) return [];
    return template.defaultTerms.split("\n").filter((t) => t.trim());
  }, [template?.defaultTerms]);

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                {isEditing ? (
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="font-semibold text-lg h-8"
                    placeholder="Template name"
                  />
                ) : (
                  <DialogTitle className="text-xl">{template.name}</DialogTitle>
                )}
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <Calendar className="h-3 w-3" />
                  Created {format(new Date(template.createdAt), "MMM dd, yyyy")}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="requirements">Requirements</TabsTrigger>
            <TabsTrigger value="terms">Terms</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto mt-4">
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Description
                </Label>
                {isEditing ? (
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    placeholder="Template description..."
                    rows={3}
                  />
                ) : (
                  <p className="text-sm p-3 rounded-lg bg-muted/50">
                    {template.description || "No description provided"}
                  </p>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardList className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-700 dark:text-blue-400">
                      Requirements
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                    {requirementsList.length}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-500">
                    default items
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <FileCheck className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-400">
                      Terms
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-green-800 dark:text-green-300">
                    {termsList.length}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-500">
                    default items
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Template Info
                </Label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between p-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{format(new Date(template.createdAt), "PPP")}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">Updated:</span>
                    <span>{format(new Date(template.updatedAt), "PPP")}</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Requirements Tab */}
            <TabsContent value="requirements" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Default Requirements
                </Label>
                {isEditing ? (
                  <Textarea
                    value={editedRequirements}
                    onChange={(e) => setEditedRequirements(e.target.value)}
                    placeholder="Enter requirements (one per line)..."
                    rows={10}
                    className="font-mono text-sm"
                  />
                ) : requirementsList.length > 0 ? (
                  <div className="space-y-2">
                    {requirementsList.map((req, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                      >
                        <Badge variant="outline" className="mt-0.5 shrink-0">
                          {idx + 1}
                        </Badge>
                        <span className="text-sm">{req}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground p-4 text-center bg-muted/30 rounded-lg">
                    No default requirements defined
                  </p>
                )}
              </div>
            </TabsContent>

            {/* Terms Tab */}
            <TabsContent value="terms" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Default Terms & Conditions
                </Label>
                {isEditing ? (
                  <Textarea
                    value={editedTerms}
                    onChange={(e) => setEditedTerms(e.target.value)}
                    placeholder="Enter terms and conditions (one per line)..."
                    rows={10}
                    className="font-mono text-sm"
                  />
                ) : termsList.length > 0 ? (
                  <div className="space-y-2">
                    {termsList.map((term, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                      >
                        <Badge variant="outline" className="mt-0.5 shrink-0">
                          {idx + 1}
                        </Badge>
                        <span className="text-sm">{term}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground p-4 text-center bg-muted/30 rounded-lg">
                    No default terms defined
                  </p>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="mt-4 pt-4 border-t">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancelEdit}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateTemplate.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateTemplate.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
              <Button onClick={handleStartEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Template
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
