import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type ExportFormat = "csv" | "excel" | "pdf";
type ExportModule = "tenders" | "budgets" | "expenses" | "inventory" | "invoices" | "suppliers" | "customers";

interface ExportButtonProps {
  module: ExportModule;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ExportButton({ module, className, variant = "outline", size = "sm" }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [currentFormat, setCurrentFormat] = useState<ExportFormat | null>(null);

  // Use the appropriate mutation based on module
  const exportMutations = {
    tenders: trpc.export.tenders.useMutation(),
    budgets: trpc.export.budgets.useMutation(),
    expenses: trpc.export.expenses.useMutation(),
    inventory: trpc.export.inventory.useMutation(),
    invoices: trpc.export.invoices.useMutation(),
    suppliers: trpc.export.suppliers.useMutation(),
    customers: trpc.export.customers.useMutation(),
  };

  const mutation = exportMutations[module];

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setCurrentFormat(format);

    try {
      const result = await mutation.mutateAsync({ format });

      if (!result.success) {
        throw new Error(result.error || "Export failed");
      }

      // Decode base64 and create download
      const byteCharacters = atob(result.data || "");
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: result.mimeType });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`${module} exported as ${format.toUpperCase()}`);
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
      setCurrentFormat(null);
    }
  };

  const formatIcons: Record<ExportFormat, React.ReactNode> = {
    csv: <FileText className="h-4 w-4 mr-2" />,
    excel: <FileSpreadsheet className="h-4 w-4 mr-2" />,
    pdf: <FileText className="h-4 w-4 mr-2" />,
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isExporting} className={className}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {isExporting ? `Exporting ${currentFormat?.toUpperCase()}...` : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          {formatIcons.csv}
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("excel")}>
          {formatIcons.excel}
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          {formatIcons.pdf}
          Export as PDF (HTML)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
