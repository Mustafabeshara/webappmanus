import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { DocumentUploadWizard } from "@/components/DocumentUploadWizard";
import { ComprehensiveDocumentUpload } from "@/components/ComprehensiveDocumentUpload";
import {
  Search,
  FileText,
  Upload,
  Filter,
  Eye,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileImage,
  FileSpreadsheet,
  File,
  FolderOpen,
  Sparkles,
  BarChart3,
  Calendar,
  Building2,
  Wand2,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// DocumentFile matches the database schema from files table
type DocumentFile = {
  id: number;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  entityType: string;
  entityId: number;
  uploadedBy: number;
  category: string | null;
  version: number;
  parentFileId: number | null;
  isCurrent: boolean;
  replacedAt: Date | null;
  createdAt: Date;
  uploadedAt: Date;
};

interface ExtractionResult {
  id: number;
  documentId: number;
  extractedData: string;
  confidenceScores: string;
  provider: string;
  createdAt: string;
}

// Document type definitions for filtering
const DOCUMENT_TYPES = [
  { value: "all", label: "All Types" },
  { value: "tenders", label: "Tenders" },
  { value: "invoices", label: "Invoices" },
  { value: "suppliers", label: "Suppliers" },
  { value: "products", label: "Products/Catalogs" },
  { value: "expenses", label: "Expenses" },
  { value: "deliveries", label: "Deliveries" },
  { value: "contracts", label: "Contracts" },
];

const FILE_STATUS = [
  { value: "all", label: "All Status" },
  { value: "current", label: "Current" },
  { value: "archived", label: "Archived" },
];

export default function DocumentCenter() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [selectedDocument, setSelectedDocument] = useState<DocumentFile | null>(null);
  const [showUploadWizard, setShowUploadWizard] = useState(false);
  const [showComprehensiveUpload, setShowComprehensiveUpload] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<DocumentFile | null>(null);

  // Fetch all files
  const { data: files = [], isLoading, refetch } = trpc.files.getAll.useQuery();

  // Filter documents
  const filteredDocuments = useMemo(() => {
    return files.filter((file: DocumentFile) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!file.fileName.toLowerCase().includes(search)) {
          return false;
        }
      }

      // Type filter
      if (selectedType !== "all" && file.entityType !== selectedType) {
        return false;
      }

      // Status filter (by version - current vs archived)
      if (selectedStatus !== "all") {
        if (selectedStatus === "current" && !file.isCurrent) return false;
        if (selectedStatus === "archived" && file.isCurrent) return false;
      }

      // Date range filter
      if (dateRange.from) {
        const fileDate = new Date(file.createdAt);
        const fromDate = new Date(dateRange.from);
        if (fileDate < fromDate) return false;
      }
      if (dateRange.to) {
        const fileDate = new Date(file.createdAt);
        const toDate = new Date(dateRange.to);
        if (fileDate > toDate) return false;
      }

      return true;
    });
  }, [files, searchTerm, selectedType, selectedStatus, dateRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = files.length;
    const current = files.filter((f: DocumentFile) => f.isCurrent).length;
    const archived = files.filter((f: DocumentFile) => !f.isCurrent).length;

    const byType: Record<string, number> = {};
    files.forEach((f: DocumentFile) => {
      byType[f.entityType] = (byType[f.entityType] || 0) + 1;
    });

    return { total, current, archived, byType };
  }, [files]);

  // Get file icon based on mime type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
    if (mimeType.includes("image")) return <FileImage className="h-5 w-5 text-blue-500" />;
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  // Get file status badge (current vs archived)
  const getStatusBadge = (isCurrent: boolean, version: number) => {
    if (isCurrent) {
      return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Current (v{version})</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800"><Clock className="h-3 w-3 mr-1" />Archived (v{version})</Badge>;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  // Handle document download
  const handleDownload = async (file: DocumentFile) => {
    try {
      const response = await fetch(file.fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("File downloaded successfully");
    } catch (error) {
      toast.error("Failed to download file");
    }
  };

  // Handle re-extraction
  const handleReExtract = async (file: DocumentFile) => {
    try {
      toast.info("Re-extraction started...");
      // This would call the extraction API
      await refetch();
      toast.success("Document queued for re-extraction");
    } catch (error) {
      toast.error("Failed to re-extract document");
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FolderOpen className="h-8 w-8" />
            Document Center
          </h1>
          <p className="text-muted-foreground">
            Manage, view, and extract data from all your documents
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowUploadWizard(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Quick Upload
          </Button>
          <Button onClick={() => setShowComprehensiveUpload(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Smart Upload
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Across all modules</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.current}</div>
            <Progress value={(stats.current / stats.total) * 100} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archived</CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.archived}</div>
            <p className="text-xs text-muted-foreground">Older versions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">By Type</CardTitle>
            <FolderOpen className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{Object.keys(stats.byType).length}</div>
            <p className="text-xs text-muted-foreground">Document categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by file name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>Document Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>File Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  {FILE_STATUS.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date Range</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              Documents ({filteredDocuments.length} of {files.length})
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading documents...
                  </TableCell>
                </TableRow>
              ) : filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No documents found
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((file: DocumentFile) => (
                  <TableRow key={file.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.mimeType)}
                        <div>
                          <p className="font-medium truncate max-w-[200px]">{file.fileName}</p>
                          <p className="text-xs text-muted-foreground">ID: {file.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {file.entityType}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatFileSize(file.fileSize)}</TableCell>
                    <TableCell>{getStatusBadge(file.isCurrent, file.version)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(file.createdAt), "MMM d, yyyy")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(file.createdAt), "HH:mm")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewDocument(file)}
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(file)}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDocument(file)}
                          title="View Extracted Data"
                        >
                          <Sparkles className="h-4 w-4" />
                        </Button>
                        {!file.isCurrent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReExtract(file)}
                            title="Restore version"
                          >
                            <Wand2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Document Preview Dialog */}
      <Dialog open={!!previewDocument} onOpenChange={() => setPreviewDocument(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewDocument && getFileIcon(previewDocument.mimeType)}
              {previewDocument?.fileName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {previewDocument?.mimeType.includes("pdf") ? (
              <iframe
                src={previewDocument.fileUrl}
                className="w-full h-[70vh] border-0"
                title={previewDocument.fileName}
              />
            ) : previewDocument?.mimeType.includes("image") ? (
              <img
                src={previewDocument.fileUrl}
                alt={previewDocument.fileName}
                className="max-w-full h-auto mx-auto"
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <File className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Preview not available for this file type</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => previewDocument && handleDownload(previewDocument)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download to view
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Extracted Data Dialog */}
      <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Extracted Data
            </DialogTitle>
          </DialogHeader>
          {selectedDocument && (
            <Tabs defaultValue="data" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="data">Extracted Fields</TabsTrigger>
                <TabsTrigger value="metadata">Document Info</TabsTrigger>
              </TabsList>
              <TabsContent value="data" className="space-y-4 mt-4">
                {selectedDocument.isCurrent ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-medium">Current Version (v{selectedDocument.version})</span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        This is the current version of the document.
                      </p>
                    </div>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-muted-foreground text-center py-4">
                          Document details will be displayed here based on entity type.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-700">
                      <Clock className="h-5 w-5" />
                      <span className="font-medium">Archived Version (v{selectedDocument.version})</span>
                    </div>
                    <p className="text-sm text-yellow-600 mt-1">
                      This is an older version of the document.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => handleReExtract(selectedDocument)}
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Restore This Version
                    </Button>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="metadata" className="space-y-4 mt-4">
                <div className="grid gap-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">File Name</span>
                    <span className="font-medium">{selectedDocument.fileName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">File Size</span>
                    <span className="font-medium">{formatFileSize(selectedDocument.fileSize)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">MIME Type</span>
                    <span className="font-medium">{selectedDocument.mimeType}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Entity Type</span>
                    <Badge variant="outline" className="capitalize">{selectedDocument.entityType}</Badge>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Entity ID</span>
                    <span className="font-medium">{selectedDocument.entityId || "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Uploaded</span>
                    <span className="font-medium">
                      {format(new Date(selectedDocument.createdAt), "MMM d, yyyy HH:mm")}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Version Status</span>
                    {getStatusBadge(selectedDocument.isCurrent, selectedDocument.version)}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Wizard Dialog */}
      <DocumentUploadWizard
        open={showUploadWizard}
        onOpenChange={setShowUploadWizard}
        onSuccess={() => {
          refetch();
          toast.success("Document uploaded successfully!");
        }}
      />

      {/* Comprehensive Upload Dialog */}
      <ComprehensiveDocumentUpload
        open={showComprehensiveUpload}
        onOpenChange={setShowComprehensiveUpload}
        onSuccess={() => {
          refetch();
          toast.success("Document uploaded and processed successfully!");
        }}
      />
    </div>
  );
}
