import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, NoResultsState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/status";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, Eye, Edit, FolderOpen, MoreHorizontal, UserPlus, UserMinus, FileText, Calendar, DollarSign } from "lucide-react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { toast } from "sonner";
import { FileUpload } from "@/components/FileUpload";
import { FileViewer } from "@/components/FileViewer";

function TendersSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-10 w-80" />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-44" />
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Tenders() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTender, setSelectedTender] = useState<number | null>(null);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("our-tenders");

  const { data: tenders, isLoading } = trpc.tenders.list.useQuery();
  const { data: tenderDocuments } = trpc.files.getByEntity.useQuery(
    { entityType: "tender", entityId: selectedTender! },
    { enabled: !!selectedTender }
  );

  const ourTenders = tenders?.filter(t => t.isParticipating);
  const allTenders = tenders;

  const filteredTenders = (activeTab === "our-tenders" ? ourTenders : allTenders)?.filter(tender => {
    const matchesSearch = tender.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tender.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || tender.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const uploadToS3 = trpc.files.uploadToS3.useMutation();
  const updateParticipation = trpc.tenders.updateParticipation.useMutation();
  const utils = trpc.useUtils();

  const handleDocumentUpload = async (files: File[], category: string) => {
    if (!selectedTender) return;

    for (const file of files) {
      try {
        const reader = new FileReader();
        const fileData = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        await uploadToS3.mutateAsync({
          fileName: file.name,
          fileData,
          mimeType: file.type,
          entityType: "tender",
          entityId: selectedTender,
          category,
        });

        toast.success(`${file.name} uploaded successfully`);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    utils.files.getByEntity.invalidate({ entityType: "tender", entityId: selectedTender });
  };

  const handleToggleParticipation = async (tender: { id: number; isParticipating: boolean }) => {
    await updateParticipation.mutateAsync({
      id: tender.id,
      isParticipating: !tender.isParticipating,
    });
    utils.tenders.list.invalidate();
    toast.success(tender.isParticipating ? "Removed from Our Tenders" : "Added to Our Tenders");
  };

  if (isLoading) {
    return <TendersSkeleton />;
  }

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenders"
        description="Manage tender opportunities and submissions"
        breadcrumbs={[{ label: "Tenders" }]}
        actions={
          <Link href="/tenders/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Tender
            </Button>
          </Link>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full max-w-md grid grid-cols-2">
          <TabsTrigger value="our-tenders" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Our Tenders
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
              {ourTenders?.length || 0}
            </span>
          </TabsTrigger>
          <TabsTrigger value="all-tenders" className="gap-2">
            <FileText className="h-4 w-4" />
            All Tenders
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
              {allTenders?.length || 0}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="our-tenders" className="mt-4">
          <TenderTable
            title="Tenders We're Participating In"
            description="Manage tenders where we've submitted or plan to submit proposals"
            tenders={filteredTenders || []}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onViewDocuments={(id) => {
              setSelectedTender(id);
              setDocumentDialogOpen(true);
            }}
            onToggleParticipation={handleToggleParticipation}
            onView={(id) => setLocation(`/tenders/${id}`)}
            onEdit={(id) => setLocation(`/tenders/${id}/edit`)}
            showParticipating={false}
            emptyState={
              searchTerm || statusFilter !== "all" ? (
                <NoResultsState searchTerm={searchTerm} onClear={clearFilters} />
              ) : (
                <EmptyState
                  title="No participating tenders"
                  description="Start tracking tenders by marking them as participating from the All Tenders tab."
                  action={{
                    label: "View All Tenders",
                    onClick: () => setActiveTab("all-tenders"),
                  }}
                />
              )
            }
          />
        </TabsContent>

        <TabsContent value="all-tenders" className="mt-4">
          <TenderTable
            title="All Available Tenders"
            description="Browse all tender opportunities in the system"
            tenders={filteredTenders || []}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onViewDocuments={(id) => {
              setSelectedTender(id);
              setDocumentDialogOpen(true);
            }}
            onToggleParticipation={handleToggleParticipation}
            onView={(id) => setLocation(`/tenders/${id}`)}
            onEdit={(id) => setLocation(`/tenders/${id}/edit`)}
            showParticipating={true}
            emptyState={
              searchTerm || statusFilter !== "all" ? (
                <NoResultsState searchTerm={searchTerm} onClear={clearFilters} />
              ) : (
                <EmptyState
                  title="No tenders yet"
                  description="Create your first tender to start tracking opportunities."
                  action={{
                    label: "Create Tender",
                    onClick: () => setLocation("/tenders/create"),
                    icon: Plus,
                  }}
                />
              )
            }
          />
        </TabsContent>
      </Tabs>

      {/* Document Management Dialog */}
      <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tender Documents</DialogTitle>
            <DialogDescription>
              Manage documents for this tender organized by category
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="registration" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="registration">Registration</TabsTrigger>
              <TabsTrigger value="catalogs">Catalogs</TabsTrigger>
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
            </TabsList>

            <TabsContent value="registration" className="space-y-4 mt-4">
              <DocumentSection
                title="Registration Documents"
                description="Upload company registration, licenses, and qualification documents"
                onUpload={(files) => handleDocumentUpload(files, "registration")}
                files={tenderDocuments?.filter((f: any) => f.category === "registration") || []}
              />
            </TabsContent>

            <TabsContent value="catalogs" className="space-y-4 mt-4">
              <DocumentSection
                title="Product Catalogs"
                description="Upload product catalogs, brochures, and technical specifications"
                onUpload={(files) => handleDocumentUpload(files, "catalog")}
                files={tenderDocuments?.filter((f: any) => f.category === "catalog") || []}
              />
            </TabsContent>

            <TabsContent value="submissions" className="space-y-4 mt-4">
              <DocumentSection
                title="Submission Documents"
                description="Upload final proposal, pricing sheets, and submission forms"
                onUpload={(files) => handleDocumentUpload(files, "submission")}
                files={tenderDocuments?.filter((f: any) => f.category === "submission") || []}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Extracted TenderTable component
interface Tender {
  id: number;
  referenceNumber: string;
  title: string;
  submissionDeadline: Date | null;
  estimatedValue: number | null;
  status: string;
  isParticipating: boolean;
}

interface TenderTableProps {
  title: string;
  description: string;
  tenders: Tender[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  onViewDocuments: (id: number) => void;
  onToggleParticipation: (tender: { id: number; isParticipating: boolean }) => void;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  showParticipating: boolean;
  emptyState: React.ReactNode;
}

function TenderTable({
  title,
  description,
  tenders,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onViewDocuments,
  onToggleParticipation,
  onView,
  onEdit,
  showParticipating,
  emptyState,
}: TenderTableProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col gap-3 mb-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or reference..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="awarded">Awarded</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {tenders.length === 0 ? (
          emptyState
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Reference</TableHead>
                    <TableHead className="font-semibold">Title</TableHead>
                    <TableHead className="font-semibold">Deadline</TableHead>
                    <TableHead className="font-semibold">Budget</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    {showParticipating && (
                      <TableHead className="font-semibold">Participating</TableHead>
                    )}
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenders.map((tender) => (
                    <TableRow key={tender.id} className="group">
                      <TableCell className="font-medium font-mono text-sm">
                        {tender.referenceNumber}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {tender.title}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {tender.submissionDeadline
                          ? format(new Date(tender.submissionDeadline), "MMM dd, yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatCurrency(tender.estimatedValue)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={tender.status} type="tender" />
                      </TableCell>
                      {showParticipating && (
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              tender.isParticipating
                                ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                          >
                            {tender.isParticipating ? "Yes" : "No"}
                          </span>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewDocuments(tender.id)}
                            className="h-8 w-8 p-0"
                          >
                            <FolderOpen className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onView(tender.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onEdit(tender.id)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onToggleParticipation(tender)}>
                                {tender.isParticipating ? (
                                  <>
                                    <UserMinus className="h-4 w-4 mr-2" />
                                    Remove from participating
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Mark as participating
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden space-y-3">
              {tenders.map((tender) => (
                <div
                  key={tender.id}
                  className="rounded-lg border p-4 space-y-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{tender.title}</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {tender.referenceNumber}
                      </p>
                    </div>
                    <StatusBadge status={tender.status} type="tender" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span>
                        {tender.submissionDeadline
                          ? format(new Date(tender.submissionDeadline), "MMM dd, yyyy")
                          : "No deadline"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4 shrink-0" />
                      <span className="tabular-nums">
                        {formatCurrency(tender.estimatedValue)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => onView(tender.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDocuments(tender.id)}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(tender.id)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onToggleParticipation(tender)}>
                          {tender.isParticipating ? (
                            <>
                              <UserMinus className="h-4 w-4 mr-2" />
                              Remove from participating
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-2" />
                              Mark as participating
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Document section component
function DocumentSection({
  title,
  description,
  onUpload,
  files,
}: {
  title: string;
  description: string;
  onUpload: (files: File[]) => Promise<void>;
  files: any[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <FileUpload onUpload={onUpload} />
      </div>
      <FileViewer files={files} />
    </div>
  );
}
