import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Trash2, AlertCircle, CheckCircle2, Upload, FileSpreadsheet, FileText, X } from "lucide-react";
import { useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface TenderEntry {
  id: string;
  title: string;
  description: string;
  submissionDeadline: string;
  evaluationDeadline: string;
  status: "draft" | "open" | "awarded" | "closed" | "archived";
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
  }>;
}

const createEmptyTender = (): TenderEntry => ({
  id: crypto.randomUUID(),
  title: "",
  description: "",
  submissionDeadline: "",
  evaluationDeadline: "",
  status: "closed",
  items: [{ description: "", quantity: 1, unit: "pcs" }],
});

interface UploadedPDF {
  id: string;
  fileName: string;
  status: 'uploading' | 'extracting' | 'completed' | 'failed';
  progress: number;
  extraction?: {
    title: string;
    referenceNumber: string;
    itemsCount: number;
    closingDate?: string;
  };
  error?: string;
}

export default function BulkImportTenders() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tenders, setTenders] = useState<TenderEntry[]>([createEmptyTender()]);
  const [importResults, setImportResults] = useState<Array<{
    success: boolean;
    title: string;
    referenceNumber?: string;
    error?: string;
  }> | null>(null);

  // PDF Upload state
  const [uploadedPDFs, setUploadedPDFs] = useState<UploadedPDF[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bulkImportMutation = trpc.tenders.bulkImport.useMutation({
    onSuccess: (data) => {
      setIsSubmitting(false);
      setImportResults(data.results);

      if (data.success) {
        toast.success(`Successfully imported ${data.totalImported} tender(s)`);
      } else {
        toast.warning(`Imported ${data.totalImported} of ${data.totalImported + data.totalFailed} tenders`);
      }
    },
    onError: (error) => {
      setIsSubmitting(false);
      toast.error(`Import failed: ${error.message}`);
    },
  });

  // OCR mutation
  const ocrMutation = trpc.tenderOCR.uploadAndExtract.useMutation();

  // Handle multiple PDF file selection
  const handleFilesSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const pdfFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.pdf'));

    if (pdfFiles.length === 0) {
      toast.error("Please select PDF files");
      return;
    }

    if (uploadedPDFs.length + pdfFiles.length > 10) {
      toast.error(`Maximum 10 PDFs allowed. You can add ${10 - uploadedPDFs.length} more.`);
      return;
    }

    // Process each file
    for (const file of pdfFiles) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: File size must be less than 10MB`);
        continue;
      }

      const uploadId = crypto.randomUUID();

      // Add to uploaded list with uploading status
      setUploadedPDFs(prev => [...prev, {
        id: uploadId,
        fileName: file.name,
        status: 'uploading',
        progress: 10,
      }]);

      // Read and upload file
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];

        setUploadedPDFs(prev => prev.map(p =>
          p.id === uploadId ? { ...p, status: 'extracting' as const, progress: 50 } : p
        ));

        try {
          const result = await ocrMutation.mutateAsync({
            fileName: file.name,
            fileData: base64,
            department: "Biomedical Engineering",
            saveToTender: true, // Create tender directly
          });

          if (result.extraction) {
            setUploadedPDFs(prev => prev.map(p =>
              p.id === uploadId ? {
                ...p,
                status: 'completed' as const,
                progress: 100,
                extraction: {
                  title: result.extraction?.title || file.name,
                  referenceNumber: result.extraction?.reference_number || '',
                  itemsCount: result.extraction?.items_count || 0,
                  closingDate: result.extraction?.closing_date,
                },
              } : p
            ));
            toast.success(`Extracted: ${result.extraction.reference_number || file.name}`);
          }
        } catch (error) {
          setUploadedPDFs(prev => prev.map(p =>
            p.id === uploadId ? {
              ...p,
              status: 'failed' as const,
              progress: 0,
              error: error instanceof Error ? error.message : 'Extraction failed',
            } : p
          ));
          toast.error(`Failed: ${file.name}`);
        }
      };
      reader.onerror = () => {
        setUploadedPDFs(prev => prev.map(p =>
          p.id === uploadId ? { ...p, status: 'failed' as const, error: 'Failed to read file' } : p
        ));
      };
      reader.readAsDataURL(file);
    }

    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [uploadedPDFs, ocrMutation]);

  // Remove uploaded PDF
  const removeUploadedPDF = useCallback((id: string) => {
    setUploadedPDFs(prev => prev.filter(p => p.id !== id));
  }, []);

  const addTender = useCallback(() => {
    if (tenders.length >= 10) {
      toast.error("Maximum 10 tenders allowed per bulk import");
      return;
    }
    setTenders([...tenders, createEmptyTender()]);
  }, [tenders]);

  const removeTender = useCallback((id: string) => {
    if (tenders.length <= 1) {
      toast.error("At least one tender is required");
      return;
    }
    setTenders(tenders.filter(t => t.id !== id));
  }, [tenders]);

  const updateTender = useCallback((id: string, field: keyof TenderEntry, value: unknown) => {
    setTenders(prev => prev.map(t =>
      t.id === id ? { ...t, [field]: value } : t
    ));
  }, []);

  const addItem = useCallback((tenderId: string) => {
    setTenders(prev => prev.map(t =>
      t.id === tenderId
        ? { ...t, items: [...t.items, { description: "", quantity: 1, unit: "pcs" }] }
        : t
    ));
  }, []);

  const removeItem = useCallback((tenderId: string, itemIndex: number) => {
    setTenders(prev => prev.map(t => {
      if (t.id !== tenderId) return t;
      if (t.items.length <= 1) return t;
      return { ...t, items: t.items.filter((_, i) => i !== itemIndex) };
    }));
  }, []);

  const updateItem = useCallback((tenderId: string, itemIndex: number, field: string, value: unknown) => {
    setTenders(prev => prev.map(t => {
      if (t.id !== tenderId) return t;
      const newItems = [...t.items];
      newItems[itemIndex] = { ...newItems[itemIndex], [field]: value };
      return { ...t, items: newItems };
    }));
  }, []);

  const handleSubmit = async () => {
    // Validate at least one tender with title
    const validTenders = tenders.filter(t => t.title.trim());
    if (validTenders.length === 0) {
      toast.error("At least one tender with a title is required");
      return;
    }

    // Validate each tender has at least one item with description
    for (const tender of validTenders) {
      const validItems = tender.items.filter(item => item.description.trim());
      if (validItems.length === 0) {
        toast.error(`Tender "${tender.title}" needs at least one item`);
        return;
      }
    }

    setIsSubmitting(true);
    setImportResults(null);

    const tendersToImport = validTenders.map(t => ({
      title: t.title,
      description: t.description || undefined,
      submissionDeadline: t.submissionDeadline ? new Date(t.submissionDeadline) : undefined,
      evaluationDeadline: t.evaluationDeadline ? new Date(t.evaluationDeadline) : undefined,
      status: t.status,
      items: t.items
        .filter(item => item.description.trim())
        .map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
        })),
    }));

    bulkImportMutation.mutate({ tenders: tendersToImport });
  };

  const resetForm = () => {
    setTenders([createEmptyTender()]);
    setImportResults(null);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Bulk Import Tenders"
        description="Import up to 10 historical tenders at once"
        breadcrumbs={[
          { label: "Tenders", href: "/tenders" },
          { label: "Bulk Import" },
        ]}
      />

      {/* Info Alert */}
      <Alert>
        <FileSpreadsheet className="h-4 w-4" />
        <AlertDescription>
          Use this page to quickly add historical tenders to build your repository.
          Upload PDFs for automatic extraction or add up to 10 tenders manually.
        </AlertDescription>
      </Alert>

      {/* PDF Upload Section */}
      <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Upload Tender PDFs (OCR Extraction)
          </CardTitle>
          <CardDescription>
            Upload up to 10 PDF documents to automatically extract and create tenders.
            Supports English and Arabic text.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={handleFilesSelect}
            className="hidden"
            aria-label="Upload tender PDF files"
          />

          {uploadedPDFs.length < 10 && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Click to upload PDFs</p>
              <p className="text-xs text-muted-foreground mt-1">
                Max 10MB per file - Select multiple files at once
              </p>
              <p className="text-xs text-muted-foreground">
                {uploadedPDFs.length}/10 PDFs uploaded
              </p>
            </div>
          )}

          {uploadedPDFs.length > 0 && (
            <div className="mt-4 space-y-3">
              {uploadedPDFs.map((pdf) => (
                <div
                  key={pdf.id}
                  className={`p-3 rounded-lg flex items-center gap-3 ${
                    pdf.status === 'completed' ? 'bg-green-50 dark:bg-green-950/30' :
                    pdf.status === 'failed' ? 'bg-red-50 dark:bg-red-950/30' :
                    'bg-muted/50'
                  }`}
                >
                  {pdf.status === 'completed' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  ) : pdf.status === 'failed' ? (
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pdf.fileName}</p>
                    {pdf.status === 'uploading' && <p className="text-xs text-muted-foreground">Uploading...</p>}
                    {pdf.status === 'extracting' && <p className="text-xs text-muted-foreground">Extracting data...</p>}
                    {pdf.status === 'completed' && pdf.extraction && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Ref: {pdf.extraction.referenceNumber} | {pdf.extraction.itemsCount} items
                      </p>
                    )}
                    {pdf.status === 'failed' && (
                      <p className="text-xs text-red-600 dark:text-red-400">{pdf.error}</p>
                    )}
                    {(pdf.status === 'uploading' || pdf.status === 'extracting') && (
                      <Progress value={pdf.progress} className="h-1 mt-1" />
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeUploadedPDF(pdf.id)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {uploadedPDFs.some(p => p.status === 'completed') && (
                <div className="flex gap-3 mt-4 pt-4 border-t">
                  <Button onClick={() => setLocation("/tenders")}>
                    View All Tenders
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setUploadedPDFs([])}
                  >
                    Clear & Upload More
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Divider between PDF upload and manual entry */}
      <div className="relative flex items-center gap-4 py-2">
        <div className="flex-1 border-t border-muted" />
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          or add manually
        </span>
        <div className="flex-1 border-t border-muted" />
      </div>

      {/* Import Results */}
      {importResults && (
        <Card className={importResults.every(r => r.success) ? "border-green-500" : "border-yellow-500"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResults.every(r => r.success) ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {importResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg flex items-center justify-between ${
                    result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                  }`}
                >
                  <span>{result.title}</span>
                  {result.success ? (
                    <span className="text-sm font-medium">Ref: {result.referenceNumber}</span>
                  ) : (
                    <span className="text-sm">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <Button onClick={() => setLocation("/tenders")}>
                View All Tenders
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Import More
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tender Forms */}
      {!importResults && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {tenders.length} of 10 tenders
            </span>
            <Button
              onClick={addTender}
              disabled={tenders.length >= 10}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Tender
            </Button>
          </div>

          <div className="space-y-6">
            {tenders.map((tender, tenderIndex) => (
              <Card key={tender.id} className="relative">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Tender {tenderIndex + 1}</CardTitle>
                    {tenders.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTender(tender.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor={`title-${tender.id}`}>Title / Reference *</Label>
                    <Input
                      id={`title-${tender.id}`}
                      value={tender.title}
                      onChange={(e) => updateTender(tender.id, "title", e.target.value)}
                      placeholder="e.g., 5CDP13 or Medical Equipment 2024"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor={`desc-${tender.id}`}>Description</Label>
                    <Textarea
                      id={`desc-${tender.id}`}
                      value={tender.description}
                      onChange={(e) => updateTender(tender.id, "description", e.target.value)}
                      placeholder="Optional description..."
                      rows={2}
                    />
                  </div>

                  {/* Dates and Status Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`submission-${tender.id}`}>Closing Date</Label>
                      <Input
                        id={`submission-${tender.id}`}
                        type="date"
                        value={tender.submissionDeadline}
                        onChange={(e) => updateTender(tender.id, "submissionDeadline", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`evaluation-${tender.id}`}>Evaluation Date</Label>
                      <Input
                        id={`evaluation-${tender.id}`}
                        type="date"
                        value={tender.evaluationDeadline}
                        onChange={(e) => updateTender(tender.id, "evaluationDeadline", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`status-${tender.id}`}>Status</Label>
                      <Select
                        value={tender.status}
                        onValueChange={(value) => updateTender(tender.id, "status", value)}
                      >
                        <SelectTrigger id={`status-${tender.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="awarded">Awarded</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Items *</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addItem(tender.id)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Item
                      </Button>
                    </div>
                    {tender.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex gap-2 items-start">
                        <div className="flex-1">
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(tender.id, itemIndex, "description", e.target.value)}
                            placeholder="Item description"
                          />
                        </div>
                        <div className="w-20">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(tender.id, itemIndex, "quantity", parseInt(e.target.value) || 1)}
                            placeholder="Qty"
                          />
                        </div>
                        <div className="w-20">
                          <Input
                            value={item.unit}
                            onChange={(e) => updateItem(tender.id, itemIndex, "unit", e.target.value)}
                            placeholder="Unit"
                          />
                        </div>
                        {tender.items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(tender.id, itemIndex)}
                            className="shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setLocation("/tenders")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Import {tenders.filter(t => t.title.trim()).length} Tender(s)
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
