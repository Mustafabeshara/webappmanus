import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Eye, Trash2, File, Image as ImageIcon, FileText, ZoomIn, ZoomOut, X } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface FileItem {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date | string;
  uploadedBy?: number;
}

interface FileViewerProps {
  files: FileItem[];
  onDelete?: (fileId: number) => Promise<void>;
  showDelete?: boolean;
  title?: string;
}

export function FileViewer({
  files,
  onDelete,
  showDelete = false,
  title = "Attached Files",
}: FileViewerProps) {
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [imageZoom, setImageZoom] = useState(100);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <ImageIcon className="h-5 w-5" />;
    if (mimeType.includes("pdf")) return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const handleDownload = async (file: FileItem) => {
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

  const handleView = (file: FileItem) => {
    // For images and PDFs, show inline preview
    if (file.mimeType.startsWith("image/") || file.mimeType.includes("pdf")) {
      setPreviewFile(file);
      setImageZoom(100);
    } else {
      // For other files, open in new tab
      window.open(file.fileUrl, "_blank");
    }
  };

  const handleDelete = async (fileId: number) => {
    if (!onDelete) return;
    
    try {
      await onDelete(fileId);
      toast.success("File deleted successfully");
    } catch (error) {
      toast.error("Failed to delete file");
      console.error("Delete error:", error);
    }
  };

  const handleZoomIn = () => {
    setImageZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setImageZoom((prev) => Math.max(prev - 25, 50));
  };

  const closePreview = () => {
    setPreviewFile(null);
    setImageZoom(100);
  };

  if (files.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No files attached
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {title} ({files.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="text-muted-foreground">
                    {getFileIcon(file.mimeType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.fileName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(file.fileSize)}</span>
                      <span>•</span>
                      <span>
                        {new Date(file.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
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
                  {showDelete && onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(file.id)}
                      title="Delete file"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* File Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="truncate flex-1 mr-4">{previewFile?.fileName}</span>
              <div className="flex items-center gap-2">
                {previewFile?.mimeType.startsWith("image/") && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleZoomOut}
                      disabled={imageZoom <= 50}
                      title="Zoom out"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground min-w-[4rem] text-center">
                      {imageZoom}%
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleZoomIn}
                      disabled={imageZoom >= 200}
                      title="Zoom in"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => previewFile && handleDownload(previewFile)}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
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
    </>
  );
}
