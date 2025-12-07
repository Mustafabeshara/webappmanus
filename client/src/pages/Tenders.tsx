import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Plus, Search, Eye, Edit, FileText, Upload, Download, Trash2, FolderOpen } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { FileUpload } from "@/components/FileUpload";
import { FileViewer } from "@/components/FileViewer";

export default function Tenders() {
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

  // Split tenders into "Our Tenders" (participating) and "All Tenders"
  const ourTenders = tenders?.filter(t => t.isParticipating);
  const allTenders = tenders;

  const filteredTenders = (activeTab === "our-tenders" ? ourTenders : allTenders)?.filter(tender => {
    const matchesSearch = tender.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tender.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || tender.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      draft: "status-draft",
      open: "status-open",
      awarded: "status-approved",
      closed: "status-closed",
      archived: "status-closed",
    };
    return <Badge className={`status-badge ${statusClasses[status] || ""}`}>{status}</Badge>;
  };

  const handleDocumentUpload = async (files: File[], category: string) => {
    // Upload files with tender ID and category
    for (const file of files) {
      // File upload logic will be handled by FileUpload component
      console.log(`Uploading ${file.name} to category: ${category}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Tenders</h1>
          <p className="text-muted-foreground">Manage tender opportunities and submissions</p>
        </div>
        <Link href="/tenders/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Tender
          </Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="our-tenders">Our Tenders ({ourTenders?.length || 0})</TabsTrigger>
          <TabsTrigger value="all-tenders">All Tenders ({allTenders?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="our-tenders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tenders We're Participating In</CardTitle>
              <CardDescription>Manage tenders where we've submitted or plan to submit proposals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search tenders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
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

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenders?.map((tender) => (
                    <TableRow key={tender.id}>
                      <TableCell className="font-medium">{tender.referenceNumber}</TableCell>
                      <TableCell>{tender.title}</TableCell>
                      <TableCell>{format(new Date(tender.submissionDeadline!), "MMM dd, yyyy")}</TableCell>
                      <TableCell>${((tender.estimatedValue || 0) / 100).toLocaleString() || "N/A"}</TableCell>
                      <TableCell>{getStatusBadge(tender.status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTender(tender.id);
                            setDocumentDialogOpen(true);
                          }}
                        >
                          <FolderOpen className="h-4 w-4 mr-2" />
                          Manage
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/tenders/${tender.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/tenders/${tender.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredTenders?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No tenders found matching your criteria
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all-tenders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Available Tenders</CardTitle>
              <CardDescription>Browse all tender opportunities in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search tenders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
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

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Participating</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenders?.map((tender) => (
                    <TableRow key={tender.id}>
                      <TableCell className="font-medium">{tender.referenceNumber}</TableCell>
                      <TableCell>{tender.title}</TableCell>
                      <TableCell>{format(new Date(tender.submissionDeadline!), "MMM dd, yyyy")}</TableCell>
                      <TableCell>${((tender.estimatedValue || 0) / 100).toLocaleString() || "N/A"}</TableCell>
                      <TableCell>{getStatusBadge(tender.status)}</TableCell>
                      <TableCell>
                        {tender.isParticipating ? (
                          <Badge variant="default">Yes</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/tenders/${tender.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/tenders/${tender.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredTenders?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No tenders found matching your criteria
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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

            <TabsContent value="registration" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Registration Documents</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload company registration, licenses, and qualification documents
                  </p>
                  <FileUpload
                    onUpload={async (files: File[]) => await handleDocumentUpload(files, "registration")}
                  />
                </div>
                <FileViewer
                  files={tenderDocuments?.filter((f: any) => f.category === "registration") || []}
                />
              </div>
            </TabsContent>

            <TabsContent value="catalogs" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Product Catalogs</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload product catalogs, brochures, and technical specifications
                  </p>
                  <FileUpload
                    onUpload={async (files: File[]) => await handleDocumentUpload(files, "catalog")}
                  />
                </div>
                <FileViewer
                  files={tenderDocuments?.filter((f: any) => f.category === "catalog") || []}
                />
              </div>
            </TabsContent>

            <TabsContent value="submissions" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Submission Documents</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload final proposal, pricing sheets, and submission forms
                  </p>
                  <FileUpload
                    onUpload={async (files: File[]) => await handleDocumentUpload(files, "submission")}
                  />
                </div>
                <FileViewer
                  files={tenderDocuments?.filter((f: any) => f.category === "submission") || []}
                />
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
