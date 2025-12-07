import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Download, Eye, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";

interface FileHistoryDialogProps {
  fileId: number | null;
  onClose: () => void;
  onRollback?: () => void;
}

export function FileHistoryDialog({ fileId, onClose, onRollback }: FileHistoryDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const { data: history, isLoading, refetch } = trpc.files.getHistory.useQuery(
    { fileId: fileId! },
    { enabled: fileId !== null }
  );

  const rollbackMutation = trpc.files.rollbackToVersion.useMutation({
    onSuccess: () => {
      toast.success("File rolled back successfully");
      refetch();
      onRollback?.();
    },
    onError: (error) => {
      toast.error(`Failed to rollback: ${error.message}`);
    },
  });

  const handleRollback = async (versionId: number) => {
    if (!confirm("Are you sure you want to rollback to this version? This will make it the current version.")) {
      return;
    }
    rollbackMutation.mutate({ versionId });
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
    }
  };

  const handlePreview = (file: any) => {
    if (file.mimeType.startsWith("image/") || file.mimeType.includes("pdf")) {
      setPreviewUrl(file.fileUrl);
    } else {
      window.open(file.fileUrl, "_blank");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <>
      <Dialog open={fileId !== null} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>File Version History</DialogTitle>
            <DialogDescription>
              View and manage all versions of this file. You can rollback to any previous version.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Loading version history...</p>
            </div>
          ) : history && history.length > 0 ? (
            <div className="space-y-3">
              {history.map((file) => (
                <div
                  key={file.id}
                  className={`p-4 rounded-lg border ${
                    file.isCurrent
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="text-sm font-medium truncate">{file.fileName}</h4>
                        {file.isCurrent && (
                          <Badge variant="default" className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Current
                          </Badge>
                        )}
                        <Badge variant="outline">v{file.version}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{formatFileSize(file.fileSize)}</span>
                        <span>•</span>
                        <span>
                          Uploaded {new Date(file.uploadedAt).toLocaleString()}
                        </span>
                        {file.replacedAt && (
                          <>
                            <span>•</span>
                            <span className="text-destructive">
                              Replaced {new Date(file.replacedAt).toLocaleString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(file)}
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
                      {!file.isCurrent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRollback(file.id)}
                          title="Rollback to this version"
                          disabled={rollbackMutation.isPending}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">No version history found</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      {previewUrl && (
        <Dialog open={previewUrl !== null} onOpenChange={(open) => !open && setPreviewUrl(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>File Preview</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center overflow-auto max-h-[70vh]">
              {previewUrl.includes("pdf") ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[70vh] border-0"
                  title="PDF Preview"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full h-auto"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
