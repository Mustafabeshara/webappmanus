/**
 * Export Service
 * Provides CSV, Excel, and PDF export functionality across all modules
 */

export interface ExportColumn {
  key: string;
  label: string;
  format?: "currency" | "date" | "number" | "percent" | "boolean";
}

export interface ExportOptions {
  format: "csv" | "excel" | "pdf";
  filename?: string;
  title?: string;
  columns: ExportColumn[];
  data: ExportRow[];
}

export interface ExportResult {
  success: boolean;
  data?: string; // base64 encoded
  filename: string;
  mimeType: string;
  error?: string;
}

export type ExportCell = string | number | boolean | Date | null | undefined;
export type ExportRow = Record<string, ExportCell>;

function formatValue(
  value: ExportCell,
  format?: ExportColumn["format"]
): string {
  if (value === null || value === undefined) return "";

  switch (format) {
    case "currency":
      return `$${(Number(value) / 100).toFixed(2)}`;
    case "date":
      if (value instanceof Date) {
        return value.toLocaleDateString();
      }
      if (typeof value === "string" || typeof value === "number") {
        return new Date(value).toLocaleDateString();
      }
      return "";
    case "number":
      return Number(value).toLocaleString();
    case "percent":
      return `${Number(value).toFixed(1)}%`;
    case "boolean":
      return value ? "Yes" : "No";
    default:
      return String(value);
  }
}

export function exportToCSV(options: ExportOptions): ExportResult {
  try {
    const { columns, data, filename = "export" } = options;

    // Build CSV content
    const headers = columns
      .map(col => `"${col.label.replaceAll('"', '""')}"`)
      .join(",");

    const rows = data.map(row => {
      return columns
        .map(col => {
          const value = formatValue(row[col.key], col.format);
          return `"${value.replaceAll('"', '""')}"`;
        })
        .join(",");
    });

    const csvContent = [headers, ...rows].join("\n");
    const base64 = Buffer.from(csvContent, "utf-8").toString("base64");

    return {
      success: true,
      data: base64,
      filename: `${filename}.csv`,
      mimeType: "text/csv",
    };
  } catch (error) {
    return {
      success: false,
      filename: "",
      mimeType: "",
      error: `CSV export failed: ${error}`,
    };
  }
}

export function exportToExcel(options: ExportOptions): ExportResult {
  try {
    const { columns, data, filename = "export", title } = options;

    // Create simple XML spreadsheet (Office Open XML compatible)
    const worksheetName = title || "Data";

    let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xmlContent += '<?mso-application progid="Excel.Sheet"?>\n';
    xmlContent +=
      '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
    xmlContent +=
      '  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
    xmlContent += `  <Worksheet ss:Name="${escapeXml(worksheetName)}">\n`;
    xmlContent += "    <Table>\n";

    // Header row
    xmlContent += "      <Row>\n";
    for (const col of columns) {
      xmlContent += `        <Cell><Data ss:Type="String">${escapeXml(col.label)}</Data></Cell>\n`;
    }
    xmlContent += "      </Row>\n";

    // Data rows
    for (const row of data) {
      xmlContent += "      <Row>\n";
      for (const col of columns) {
        const value = formatValue(row[col.key], col.format);
        const type =
          col.format === "number" ||
          col.format === "currency" ||
          col.format === "percent"
            ? "Number"
            : "String";

        // For numbers, use raw value
        const cellValue = type === "Number" ? Number(row[col.key]) || 0 : value;
        xmlContent += `        <Cell><Data ss:Type="${type}">${escapeXml(String(cellValue))}</Data></Cell>\n`;
      }
      xmlContent += "      </Row>\n";
    }

    xmlContent += "    </Table>\n";
    xmlContent += "  </Worksheet>\n";
    xmlContent += "</Workbook>";

    const base64 = Buffer.from(xmlContent, "utf-8").toString("base64");

    return {
      success: true,
      data: base64,
      filename: `${filename}.xls`,
      mimeType: "application/vnd.ms-excel",
    };
  } catch (error) {
    return {
      success: false,
      filename: "",
      mimeType: "",
      error: `Excel export failed: ${error}`,
    };
  }
}

export function exportToPDF(options: ExportOptions): ExportResult {
  try {
    const { columns, data, filename = "export", title } = options;

    // Create simple HTML for PDF conversion (can be printed to PDF)
    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title || filename)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background-color: #4a5568; color: white; padding: 12px 8px; text-align: left; }
    td { padding: 10px 8px; border-bottom: 1px solid #ddd; }
    tr:nth-child(even) { background-color: #f7f7f7; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; }
    @media print {
      body { margin: 0; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
    }
  </style>
</head>
<body>
  ${title ? `<h1>${escapeHtml(title)}</h1>` : ""}
  <table>
    <thead>
      <tr>
        ${columns.map(col => `<th>${escapeHtml(col.label)}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${data
        .map(
          row => `
      <tr>
        ${columns.map(col => `<td>${escapeHtml(formatValue(row[col.key], col.format))}</td>`).join("")}
      </tr>
      `
        )
        .join("")}
    </tbody>
  </table>
  <div class="footer">
    Generated on ${new Date().toLocaleString()} | Total Records: ${data.length}
  </div>
</body>
</html>`;

    const base64 = Buffer.from(htmlContent, "utf-8").toString("base64");

    return {
      success: true,
      data: base64,
      filename: `${filename}.html`, // HTML that can be printed to PDF
      mimeType: "text/html",
    };
  } catch (error) {
    return {
      success: false,
      filename: "",
      mimeType: "",
      error: `PDF export failed: ${error}`,
    };
  }
}

export function generateExport(options: ExportOptions): ExportResult {
  switch (options.format) {
    case "csv":
      return exportToCSV(options);
    case "excel":
      return exportToExcel(options);
    case "pdf":
      return exportToPDF(options);
    default:
      return {
        success: false,
        filename: "",
        mimeType: "",
        error: `Unsupported format: ${options.format}`,
      };
  }
}

function escapeXml(str: string): string {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function escapeHtml(str: string): string {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Pre-defined export configurations for different modules
export const EXPORT_CONFIGS = {
  tenders: {
    columns: [
      { key: "referenceNumber", label: "Reference #" },
      { key: "title", label: "Title" },
      { key: "status", label: "Status" },
      {
        key: "estimatedValue",
        label: "Estimated Value",
        format: "currency" as const,
      },
      { key: "submissionDeadline", label: "Deadline", format: "date" as const },
      { key: "createdAt", label: "Created", format: "date" as const },
    ],
  },
  budgets: {
    columns: [
      { key: "name", label: "Budget Name" },
      { key: "fiscalYear", label: "Fiscal Year" },
      {
        key: "allocatedAmount",
        label: "Allocated",
        format: "currency" as const,
      },
      { key: "spentAmount", label: "Spent", format: "currency" as const },
      { key: "remaining", label: "Remaining", format: "currency" as const },
      { key: "status", label: "Status" },
      { key: "approvalStatus", label: "Approval" },
    ],
  },
  expenses: {
    columns: [
      { key: "expenseNumber", label: "Expense #" },
      { key: "title", label: "Title" },
      { key: "amount", label: "Amount", format: "currency" as const },
      { key: "status", label: "Status" },
      { key: "expenseDate", label: "Date", format: "date" as const },
      { key: "createdAt", label: "Created", format: "date" as const },
    ],
  },
  inventory: {
    columns: [
      { key: "productName", label: "Product" },
      { key: "sku", label: "SKU" },
      { key: "quantity", label: "Quantity", format: "number" as const },
      { key: "minStockLevel", label: "Min Stock", format: "number" as const },
      { key: "location", label: "Location" },
      { key: "expiryDate", label: "Expiry", format: "date" as const },
    ],
  },
  invoices: {
    columns: [
      { key: "invoiceNumber", label: "Invoice #" },
      { key: "customerName", label: "Customer" },
      { key: "totalAmount", label: "Total", format: "currency" as const },
      { key: "status", label: "Status" },
      { key: "dueDate", label: "Due Date", format: "date" as const },
      { key: "createdAt", label: "Created", format: "date" as const },
    ],
  },
  suppliers: {
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "contactPerson", label: "Contact" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "complianceStatus", label: "Compliance" },
      { key: "rating", label: "Rating", format: "number" as const },
    ],
  },
  customers: {
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "type", label: "Type" },
      { key: "contactPerson", label: "Contact" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      {
        key: "creditLimit",
        label: "Credit Limit",
        format: "currency" as const,
      },
    ],
  },
};
