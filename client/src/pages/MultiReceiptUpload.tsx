import { useState } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Upload, FileImage, CheckCircle2, XCircle, Loader2, Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UploadResult {
  success: boolean;
  filename: string;
  receiptUrl?: string;
  extractedData?: any;
  expenseId?: number;
  expenseNumber?: string;
  error?: string;
}

export default function MultiReceiptUpload() {
  const [, setLocation] = useLocation();
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [progress, setProgress] = useState(0);

  const batchUploadMutation = trpc.expenses.batchUploadReceipts.useMutation({
    onSuccess: (data) => {
      setResults(data.results);
      setIsProcessing(false);
      setProgress(100);
      
      if (data.successCount > 0) {
        toast.success(`Successfully processed ${data.successCount} receipt(s)`);
      }
      if (data.errorCount > 0) {
        toast.error(`Failed to process ${data.errorCount} receipt(s)`);
      }
    },
    onError: (error) => {
      setIsProcessing(false);
      toast.error("Batch upload failed: " + error.message);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFiles(selectedFiles);
  };

  const handleFiles = (selectedFiles: File[]) => {
    // Validate file types
    const validFiles = selectedFiles.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit`);
        return false;
      }
      return true;
    });

    setFiles((prev) => [...prev, ...validFiles]);
    toast.success(`Added ${validFiles.length} file(s)`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Please select at least one receipt image");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    // Convert files to base64
    const receipts = await Promise.all(
      files.map(async (file) => {
        const base64 = await fileToBase64(file);
        return {
          file: base64,
          filename: file.name,
        };
      })
    );

    // Simulate progress (since actual processing happens on backend)
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 500);

    try {
      await batchUploadMutation.mutateAsync({ receipts });
      clearInterval(progressInterval);
    } catch (error) {
      clearInterval(progressInterval);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getStatusBadge = (result: UploadResult) => {
    if (!result.success) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    }
    if (result.expenseId) {
      return (
        <Badge variant="default" className="gap-1 bg-green-600">
          <CheckCircle2 className="h-3 w-3" />
          Created
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
          <XCircle className="h-3 w-3" />
          No Data
        </Badge>
    );
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/expenses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Multi-Receipt Upload</h1>
          <p className="text-muted-foreground">
            Upload multiple receipts at once for automatic processing
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Select Receipt Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-semibold mb-2">
              Drag and drop receipt images here
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse files
            </p>
            <p className="text-xs text-muted-foreground">
              Supports: JPG, PNG, WEBP (max 5MB per file)
            </p>
            <input
              id="file-input"
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  Selected Files ({files.length})
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFiles([])}
                  disabled={isProcessing}
                >
                  Clear All
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileImage className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={isProcessing}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing {files.length} receipt(s)...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload and Process {files.length} Receipt(s)
              </>
            )}
          </Button>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertDescription>
                <strong>
                  {results.filter((r) => r.success && r.expenseId).length}
                </strong>{" "}
                expense(s) created successfully.{" "}
                {results.filter((r) => !r.success).length > 0 && (
                  <>
                    <strong>{results.filter((r) => !r.success).length}</strong>{" "}
                    failed.
                  </>
                )}
              </AlertDescription>
            </Alert>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expense #</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {result.filename}
                      </TableCell>
                      <TableCell>{getStatusBadge(result)}</TableCell>
                      <TableCell>
                        {result.expenseNumber || "-"}
                      </TableCell>
                      <TableCell>
                        {result.extractedData?.data?.title || "-"}
                      </TableCell>
                      <TableCell>
                        {result.extractedData?.data?.amount
                          ? formatCurrency(result.extractedData.data.amount)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {result.expenseId ? (
                          <Link href={`/expenses/${result.expenseId}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Button>
                          </Link>
                        ) : result.error ? (
                          <span className="text-xs text-destructive">
                            {result.error}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Insufficient data
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setFiles([]);
                  setResults([]);
                  setProgress(0);
                }}
              >
                Upload More
              </Button>
              <Link href="/expenses">
                <Button>View All Expenses</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
