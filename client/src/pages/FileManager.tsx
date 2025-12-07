import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Eye, Trash2, Search, File, Image as ImageIcon, FileText, Filter } from "lucide-react";
import { toast } from "sonner";

export default function FileManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all");
  const [previewFile, setPreviewFile] = useState<any | null>(null);
  const [imageZoom, setImageZoom] = useState(100);
  
  // Get all files from database
  const { data: allFiles = [], refetch } = trpc.files.getAll.useQuery();
  
  const deleteMutation = trpc.files.delete.useMutation({
    onSuccess: () => {
      toast.success("File deleted successfully");
      refetch();
    },
    onError: () => toast.error("Failed to delete file"),
  });
  
  // Filter files based on search and filters
  const filteredFiles = allFiles.filter((file: any) => {
    const matchesSearch = file.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEntityType = entityTypeFilter === "all" || file.entityType === entityTypeFilter;
    
    let matchesFileType = true;
    if (fileTypeFilter === "image") {
      matchesFileType = file.mimeType.startsWith("image/");
    } else if (fileTypeFilter === "pdf") {
      matchesFileType = file.mimeType.includes("pdf");
    } else if (fileTypeFilter === "document") {
      matchesFileType = file.mimeType.includes("word") || file.mimeType.includes("doc");
    } else if (fileTypeFilter === "spreadsheet") {
      matchesFileType = file.mimeType.includes("sheet") || file.mimeType.includes("excel");
    }
    
    return matchesSearch && matchesEntityType && matchesFileType;
  });
  
  const stats = {
    total: allFiles.length,
    images: allFiles.filter((f: any) => f.mimeType.startsWith("image/")).length,
    pdfs: allFiles.filter((f: any) => f.mimeType.includes("pdf")).length,
    documents: allFiles.filter((f: any) => f.mimeType.includes("word") || f.mimeType.includes("doc")).length,
  };
  
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-blue-500" />;
    if (mimeType.includes("pdf")) return <FileText className="h-5 w-5 text-red-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };
  
  const getEntityTypeBadge = (entityType: string) => {
    const colors: Record<string, string> = {
      expense: "bg-green-100 text-green-800",
      delivery: "bg-blue-100 text-blue-800",
      tender: "bg-purple-100 text-purple-800",
      purchase_order: "bg-orange-100 text-orange-800",
      task: "bg-yellow-100 text-yellow-800",
      invoice: "bg-pink-100 text-pink-800",
    };
    
    return (
      <Badge className={colors[entityType] || "bg-gray-100 text-gray-800"}>
        {entityType.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };
  
  const handleDownload = async (file: any) => {
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
      console.error("Download error:", error);
    }
  };
  
  const handleView = (file: any) => {
    if (file.mimeType.startsWith("image/") || file.mimeType.includes("pdf")) {
      setPreviewFile(file);
      setImageZoom(100);
    } else {
      window.open(file.fileUrl, "_blank");
    }
  };
  
  const handleDelete = async (fileId: number) => {
    if (confirm("Are you sure you want to delete this file?")) {
      deleteMutation.mutate({ id: fileId });
    }
  };
  
  const closePreview = () => {
    setPreviewFile(null);
    setImageZoom(100);
  };
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">File Manager</h1>
      </div>
      
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.images}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">PDFs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pdfs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documents}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Search Files</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by filename..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Label>Entity Type</Label>
              <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="expense">Expenses</SelectItem>
                  <SelectItem value="delivery">Deliveries</SelectItem>
                  <SelectItem value="tender">Tenders</SelectItem>
                  <SelectItem value="purchase_order">Purchase Orders</SelectItem>
                  <SelectItem value="task">Tasks</SelectItem>
                  <SelectItem value="invoice">Invoices</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>File Type</Label>
              <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Files</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="pdf">PDFs</SelectItem>
                  <SelectItem value="document">Documents</SelectItem>
                  <SelectItem value="spreadsheet">Spreadsheets</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Files Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Files ({filteredFiles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No files found
                  </TableCell>
                </TableRow>
              ) : (
                filteredFiles.map((file: any) => (
                  <TableRow key={file.id}>
                    <TableCell>{getFileIcon(file.mimeType)}</TableCell>
                    <TableCell className="font-medium max-w-xs truncate">
                      {file.fileName}
                    </TableCell>
                    <TableCell>{getEntityTypeBadge(file.entityType)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{file.category || "N/A"}</Badge>
                    </TableCell>
                    <TableCell>{formatFileSize(file.fileSize)}</TableCell>
                    <TableCell>
                      {new Date(file.uploadedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(file)}
                          title="View file"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(file)}
                          title="Download file"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(file.id)}
                          title="Delete file"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* File Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="truncate flex-1 mr-4">{previewFile?.fileName}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => previewFile && handleDownload(previewFile)}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {previewFile?.mimeType.startsWith("image/") ? (
              <div className="flex items-center justify-center p-4">
                <img
                  src={previewFile.fileUrl}
                  alt={previewFile.fileName}
                  style={{ width: `${imageZoom}%`, maxWidth: "none" }}
                  className="object-contain"
                />
              </div>
            ) : previewFile?.mimeType.includes("pdf") ? (
              <iframe
                src={previewFile.fileUrl}
                className="w-full h-[70vh] border-0"
                title={previewFile.fileName}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
