/**
 * OCR Service - Tender extraction with graceful fallback
 *
 * Attempts to use Python OCR if available, otherwise falls back to
 * a JavaScript-based PDF text extraction using pdf-parse.
 */

import { spawn } from "child_process";
import fs from "fs/promises";
import { createRequire } from "module";
import path from "path";

// Use createRequire to load CommonJS pdf-parse module at runtime
// This avoids esbuild bundling issues with ESM/CJS interop
const require = createRequire(import.meta.url);

// Lazy-loaded pdf-parse PDFParse class
let PDFParseClass:
  | (new (options: { data: Uint8Array }) => {
      getText(): Promise<{ pages: Array<{ text: string }>; text: string }>;
      getInfo(): Promise<{ total: number; info: Record<string, unknown> }>;
    })
  | null = null;

async function getPdfParseClass() {
  if (!PDFParseClass) {
    try {
      // Use require() to load CommonJS module - avoids esbuild static import issues
      // pdf-parse v2 exports PDFParse as a class that needs to be instantiated with new
      const pdfParseModule = require("pdf-parse");
      PDFParseClass = pdfParseModule.PDFParse;
      console.log("[OCR] pdf-parse PDFParse class loaded successfully");
    } catch (error) {
      console.error("[OCR] Failed to load pdf-parse:", error);
      throw new Error("PDF parsing library not available");
    }
  }
  return PDFParseClass;
}

// Helper function to extract text from PDF buffer
async function extractTextFromPdf(
  dataBuffer: Buffer
): Promise<{ text: string; numpages: number }> {
  const PdfParseClass = await getPdfParseClass();
  // pdf-parse v2 expects Uint8Array, convert Buffer if necessary
  const dataArray = new Uint8Array(dataBuffer);
  const parser = new PdfParseClass({ data: dataArray });

  // getText() handles the document loading internally in v2
  const textResult = await parser.getText();
  const infoResult = await parser.getInfo();

  // v2 returns text in both pages array and combined text property
  const fullText =
    textResult.text || textResult.pages.map(page => page.text).join("\n\n");

  // getInfo returns { total: number, info: {...} } - use 'total' for page count
  return {
    text: fullText,
    numpages: infoResult.total || textResult.pages.length,
  };
}

// Types for OCR results
export interface TenderItem {
  item_number: string;
  description: string;
  quantity: string;
  unit: string;
  specifications: string;
  language: string;
  has_arabic: boolean;
}

export interface TenderOCRResult {
  reference_number: string;
  title: string;
  closing_date: string;
  evaluation_date: string;
  posting_date: string;
  department: string;
  items: TenderItem[];
  specifications_text: string;
  items_count: number;
  ocr_confidence: number;
  source_files: string[];
  extraction_timestamp: string;
  extraction_method: string;
  language: string;
  has_arabic_content: boolean;
  raw_text?: string;
  errors: string[];
}

export interface OCRResponse {
  success: boolean;
  data?: TenderOCRResult;
  error?: string;
  details?: Record<string, unknown>;
}

export interface OCRDependencies {
  python_packages: boolean;
  missing_package: string | null;
  tesseract_available: boolean;
  tesseract_path: string | null;
  poppler_available: boolean;
  ready: boolean;
}

export interface OCROptions {
  department?: string;
  languages?: string[];
  dpi?: number;
  maxPages?: number;
  includeRawText?: boolean;
}

// Get the path to the Python script
const SCRIPT_DIR = path.join(process.cwd(), "server", "ocr");
const PYTHON_SCRIPT = path.join(SCRIPT_DIR, "tender_extractor.py");
const VENV_PYTHON = path.join(SCRIPT_DIR, "venv", "bin", "python");

// Cache Python availability check
let pythonAvailable: boolean | null = null;

/**
 * Check if Python is available on the system
 */
async function isPythonAvailable(): Promise<boolean> {
  if (pythonAvailable !== null) {
    return pythonAvailable;
  }

  return new Promise(resolve => {
    const proc = spawn("python3", ["--version"]);

    proc.on("close", code => {
      pythonAvailable = code === 0;
      resolve(pythonAvailable);
    });

    proc.on("error", () => {
      pythonAvailable = false;
      resolve(false);
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      proc.kill();
      pythonAvailable = false;
      resolve(false);
    }, 5000);
  });
}

/**
 * Get the Python executable path
 */
async function getPythonPath(): Promise<string> {
  // Try virtual environment first
  try {
    await fs.access(VENV_PYTHON);
    return VENV_PYTHON;
  } catch {
    // Fall back to system Python
    return "python3";
  }
}

/**
 * Execute Python script and return parsed JSON result
 */
async function executePython(args: string[]): Promise<OCRResponse> {
  // Check if Python is available first
  const hasPython = await isPythonAvailable();
  if (!hasPython) {
    return {
      success: false,
      error:
        "OCR not available: Python is not installed on this server. Please add tender details manually.",
      details: {
        reason: "python_not_installed",
        suggestion:
          "Manual entry mode is available - you can upload the PDF and fill in the tender details manually.",
      },
    };
  }

  const pythonPath = await getPythonPath();

  return new Promise(resolve => {
    const process = spawn(pythonPath, [PYTHON_SCRIPT, ...args]);

    let stdout = "";
    let stderr = "";

    process.stdout.on("data", data => {
      stdout += data.toString();
    });

    process.stderr.on("data", data => {
      stderr += data.toString();
    });

    process.on("close", code => {
      if (code !== 0 && !stdout) {
        resolve({
          success: false,
          error: `Python script failed with code ${code}`,
          details: { stderr },
        });
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (e) {
        resolve({
          success: false,
          error: "Failed to parse OCR output",
          details: { stdout, stderr },
        });
      }
    });

    process.on("error", err => {
      resolve({
        success: false,
        error: `OCR not available: ${err.message}. Please add tender details manually.`,
        details: {
          reason: "python_error",
          suggestion:
            "Manual entry mode is available - you can upload the PDF and fill in the tender details manually.",
        },
      });
    });
  });
}

/**
 * Check if OCR dependencies are available
 */
export async function checkOCRDependencies(): Promise<OCRDependencies> {
  const hasPython = await isPythonAvailable();

  if (!hasPython) {
    return {
      python_packages: false,
      missing_package: "Python not installed",
      tesseract_available: false,
      tesseract_path: null,
      poppler_available: false,
      ready: false,
    };
  }

  const result = await executePython(["--check"]);

  if (result.success && result.data) {
    return result.data as unknown as OCRDependencies;
  }

  // Parse from details if available
  if (result.details) {
    return result.details as unknown as OCRDependencies;
  }

  return {
    python_packages: false,
    missing_package: result.error || "Unknown error",
    tesseract_available: false,
    tesseract_path: null,
    poppler_available: false,
    ready: false,
  };
}

/**
 * JavaScript-based PDF text extraction using pdf-parse
 * This is used as a fallback when Python OCR is not available
 */
async function extractWithJavaScript(
  pdfPath: string,
  options: OCROptions = {}
): Promise<OCRResponse> {
  try {
    console.log("[OCR JS] Starting JavaScript PDF extraction for:", pdfPath);
    const dataBuffer = await fs.readFile(pdfPath);
    console.log("[OCR JS] Read file, buffer size:", dataBuffer.length);

    const pdfData = await extractTextFromPdf(dataBuffer);
    console.log("[OCR JS] Extracted text length:", pdfData.text?.length || 0);
    console.log("[OCR JS] Number of pages:", pdfData.numpages);

    const text = pdfData.text;
    const filename = path.basename(pdfPath);

    // Parse extracted text to find tender information
    const result = parseTenderText(text, filename, options.department);
    console.log(
      "[OCR JS] Parsed result - ref:",
      result.reference_number,
      "items:",
      result.items?.length
    );
    console.log("[OCR JS] Closing date extracted:", result.closing_date);
    console.log("[OCR JS] First 500 chars of text:", text.substring(0, 500));

    return {
      success: true,
      data: {
        ...result,
        extraction_method: "pdf-parse-js",
        ocr_confidence: 70, // Lower confidence for text extraction vs OCR
        raw_text: options.includeRawText ? text : undefined,
      },
    };
  } catch (e) {
    console.error("[OCR JS] Extraction failed:", e);
    return {
      success: false,
      error: `PDF text extraction failed: ${e instanceof Error ? e.message : String(e)}`,
      details: {
        suggestion:
          "The PDF may be image-based or corrupted. Please fill in the tender details manually.",
      },
    };
  }
}

/**
 * Parse a date string (DD/MM/YYYY or similar) to a Date object
 */
function parseDateString(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Normalize separators
  const normalized = dateStr.replace(/[-./]/g, "/");
  const parts = normalized.split("/");

  if (parts.length !== 3) return null;

  let day: number, month: number, year: number;

  // Check if format is DD/MM/YYYY or YYYY/MM/DD
  if (parts[0].length === 4) {
    // YYYY/MM/DD format
    year = parseInt(parts[0]);
    month = parseInt(parts[1]) - 1;
    day = parseInt(parts[2]);
  } else {
    // DD/MM/YYYY format (common in MOH tenders)
    day = parseInt(parts[0]);
    month = parseInt(parts[1]) - 1;
    year = parseInt(parts[2]);
    // Handle 2-digit year
    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }
  }

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  return new Date(year, month, day);
}

/**
 * Format a Date object as YYYY-MM-DD (ISO format for form inputs)
 */
function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculate evaluation date (2 weeks after closing date)
 */
function calculateEvaluationDate(closingDateStr: string): string {
  const closingDate = parseDateString(closingDateStr);
  if (!closingDate) return "";

  // Add 14 days (2 weeks)
  const evalDate = new Date(closingDate);
  evalDate.setDate(evalDate.getDate() + 14);

  return formatDateISO(evalDate);
}

/**
 * Parse extracted text to find tender information
 */
function parseTenderText(
  text: string,
  filename: string,
  department?: string
): TenderOCRResult {
  const now = new Date().toISOString();

  // Extract reference number
  const refPatterns = [
    /(?:Tender\s*(?:No\.?|Number|Ref\.?)?[:\s]*)?([\d]{1,2}[A-Z]{2,3}[\d]{2,4})/i,
    /(?:Reference[:\s]*)?([\d]{1,2}[A-Z]{2,3}[\d]{2,4})/i,
    /\b([\d]{1,2}(?:TN|LB|AL|EQ|LS|MA|PS|PT|TE|TS|IC|RC|BM|CDP|SSN)[\d]{2,4})\b/i,
  ];

  let referenceNumber = "";
  // Try filename first
  const fileMatch = filename.match(/([\d]{1,2}[A-Z]{2,3}[\d]{2,4})/i);
  if (fileMatch) {
    referenceNumber = fileMatch[1].toUpperCase();
  } else {
    for (const pattern of refPatterns) {
      const match = text.match(pattern);
      if (match) {
        referenceNumber = match[1].toUpperCase();
        break;
      }
    }
  }

  // Extract closing date - try multiple patterns
  const closingDatePatterns = [
    // Standard formats
    /CLOSING\s*DATE\s*[:\s]*([\d]{1,2}[/\-.][\d]{1,2}[/\-.][\d]{2,4})/i,
    /(?:Closing\s*Date|Close\s*Date|Last\s*Date|Deadline)[:\s]*([\d]{1,2}[/\-.][\d]{1,2}[/\-.][\d]{2,4})/i,
    /(?:close[sd]?\s*(?:on|by)?|deadline)[:\s]*([\d]{1,2}[/\-.][\d]{1,2}[/\-.][\d]{2,4})/i,
    // ISO format YYYY-MM-DD
    /CLOSING\s*DATE\s*[:\s]*([\d]{4}[/\-.][\d]{1,2}[/\-.][\d]{1,2})/i,
    /(?:Closing\s*Date|Close\s*Date|Last\s*Date|Deadline)[:\s]*([\d]{4}[/\-.][\d]{1,2}[/\-.][\d]{1,2})/i,
    // Date after CLOSING DATE on next line or with colon
    /CLOSING\s*DATE\s*\n\s*([\d]{1,2}[/\-.][\d]{1,2}[/\-.][\d]{2,4})/i,
    /CLOSING\s*DATE\s*\n\s*([\d]{4}[/\-.][\d]{1,2}[/\-.][\d]{1,2})/i,
    // Format: "Closing: DD/MM/YYYY" or "Close: DD/MM/YYYY"
    /(?:Closing|Close)\s*:\s*([\d]{1,2}[/\-.][\d]{1,2}[/\-.][\d]{2,4})/i,
    // Tender closes on DD/MM/YYYY
    /tender\s+closes?\s+(?:on\s+)?([\d]{1,2}[/\-.][\d]{1,2}[/\-.][\d]{2,4})/i,
    // Submission deadline: DD/MM/YYYY
    /submission\s*deadline\s*[:\s]*([\d]{1,2}[/\-.][\d]{1,2}[/\-.][\d]{2,4})/i,
    // Due date: DD/MM/YYYY
    /due\s*date\s*[:\s]*(\d{1,2}[/. -]\d{1,2}[/. -]\d{2,4})/i,
    // Arabic closing date formats
    /تاريخ\s*الإغلاق\s*[:\s]*(\d{1,2}[/. -]\d{1,2}[/. -]\d{2,4})/i,
    /تاريخ\s*الاغلاق\s*[:\s]*(\d{1,2}[/. -]\d{1,2}[/. -]\d{2,4})/i,
    /ــــخ اﻹغـﻼق[:\s]*(\d{4}[/. -]\d{1,2}[/. -]\d{1,2})/i,
    // Generic date near "closing" keyword (looser match)
    /closing[^\d]{0,20}(\d{1,2}[/. -]\d{1,2}[/. -]\d{2,4})/i,
  ];

  let closingDate = "";
  for (const pattern of closingDatePatterns) {
    const match = text.match(pattern);
    if (match) {
      closingDate = match[1].replace(/-/g, "/").replace(/\./g, "/");
      break;
    }
  }

  // If still no closing date found, try to find any date that looks like a deadline
  // by scanning for dates near keywords
  if (!closingDate) {
    const datePattern = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/g;
    const keywordPattern = /closing|deadline|due|last\s*date|submission/i;
    const lines = text.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (keywordPattern.test(line)) {
        // Check this line and next 2 lines for a date
        const searchText = lines.slice(i, i + 3).join(" ");
        const dateMatch = searchText.match(datePattern);
        if (dateMatch) {
          closingDate = dateMatch[0].replace(/-/g, "/").replace(/\./g, "/");
          break;
        }
      }
    }
  }

  // Convert closing date to ISO format for form input
  let closingDateISO = "";
  if (closingDate) {
    const parsed = parseDateString(closingDate);
    if (parsed) {
      closingDateISO = formatDateISO(parsed);
    }
  }

  // Calculate evaluation date (2 weeks after closing)
  const evaluationDate = closingDateISO
    ? calculateEvaluationDate(closingDate)
    : "";

  // Extract posting date
  const postingDatePatterns = [
    /(?:Posted|Published|Posted\s*Date|Publication\s*Date)[:\s]*([\d]{1,2}[/\-.][\d]{1,2}[/\-.][\d]{2,4})/i,
    /Printed\s*On\s*:\s*([\d]{1,2}[/\-.][\d]{1,2}[/\-.][\d]{2,4})/i,
  ];

  let postingDate = "";
  for (const pattern of postingDatePatterns) {
    const match = text.match(pattern);
    if (match) {
      postingDate = match[1].replace(/-/g, "/").replace(/\./g, "/");
      break;
    }
  }

  // Convert posting date to ISO format
  let postingDateISO = "";
  if (postingDate) {
    const parsed = parseDateString(postingDate);
    if (parsed) {
      postingDateISO = formatDateISO(parsed);
    }
  }

  // If no posting date, use today
  if (!postingDateISO) {
    postingDateISO = formatDateISO(new Date());
  }

  // Extract items
  const items = extractItemsFromText(text);

  // Extract specifications
  let specifications = "";
  const specPatterns = [
    /(?:Technical\s*)?Specifications?[:\s]*(.+?)(?:Terms|Conditions|Notes|$)/is,
    /Requirements?[:\s]*(.+?)(?:Terms|Notes|$)/is,
  ];

  for (const pattern of specPatterns) {
    const match = text.match(pattern);
    if (match && match[1].length > 50) {
      specifications = match[1].trim().substring(0, 2000);
      break;
    }
  }

  // Detect language
  const arabicPattern =
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
  const arabicChars = (text.match(arabicPattern) || []).length;
  const totalChars = text.replace(/\s+/g, "").length;
  const arabicRatio = totalChars > 0 ? arabicChars / totalChars : 0;
  const hasArabic = arabicChars > 0;
  const language =
    arabicRatio > 0.3 ? "arabic" : arabicRatio > 0.05 ? "mixed" : "english";

  return {
    reference_number: referenceNumber,
    title: referenceNumber, // Use reference number as title
    closing_date: closingDateISO,
    evaluation_date: evaluationDate,
    posting_date: postingDateISO,
    department: department || "Biomedical Engineering",
    items,
    specifications_text: specifications,
    items_count: items.length,
    ocr_confidence: 70,
    source_files: [filename],
    extraction_timestamp: now,
    extraction_method: "pdf-parse-js",
    language,
    has_arabic_content: hasArabic,
    errors: [],
  };
}

/**
 * Extract items from tender text - handles MOH tabular format
 */
function extractItemsFromText(text: string): TenderItem[] {
  const items: TenderItem[] = [];
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l);

  // Try MOH tabular format first
  // MOH format has sections: SL No, item descriptions, UNIT, QUANTITY
  const mohItems = extractMOHTableItems(lines);
  if (mohItems.length > 0) {
    return mohItems;
  }

  // Fallback to line-by-line pattern matching
  const itemPatterns = [
    /^[\s]*([\d]+)[.)\-:\s]+([^0-9]+?)[\s]*[-–:][\s]*([\d]+(?:[.,][\d]+)?)\s*(pieces?|pcs?|units?|each|nos?|sets?|qty)?/i,
    /^[\s]*([\d]+)\s+([^\t]+?)\t+\s*([\d]+(?:[.,][\d]+)?)\s*(pieces?|pcs?|units?)?/i,
    /^[\s]*([\d]+)[.)\s]+(.+?)\s+([\d]+)\s*(pieces?|pcs?|units?|each|nos?|sets?|qty)?[\s]*$/i,
  ];

  let itemNumber = 0;
  const seen = new Set<string>();

  for (const line of lines) {
    if (line.length < 5) continue;

    for (const pattern of itemPatterns) {
      const match = line.match(pattern);
      if (match) {
        const [, num, desc, qty, unit] = match;
        let description = desc
          .trim()
          .replace(/\s+/g, " ")
          .replace(/^[\d\s.-]+/, "");

        if (description && description.length > 3) {
          const key = description.toLowerCase().substring(0, 100);
          if (!seen.has(key)) {
            seen.add(key);

            const arabicPattern = /[\u0600-\u06FF]/;
            const hasArabic = arabicPattern.test(description);

            items.push({
              item_number: num || String(++itemNumber),
              description: description.substring(0, 500),
              quantity: qty ? qty.replace(/[^\d.,]/g, "") : "",
              unit: unit ? unit.toLowerCase() : "units",
              specifications: "",
              language: hasArabic ? "arabic" : "english",
              has_arabic: hasArabic,
            });
          }
        }
        break;
      }
    }
  }

  return items;
}

/**
 * Extract items from MOH tabular format
 * MOH tenders have a specific layout with item numbers, descriptions, units, and quantities in separate sections
 */
function extractMOHTableItems(lines: string[]): TenderItem[] {
  const items: TenderItem[] = [];

  // Find key markers
  let slNoIndex = -1;
  let itemDescIndex = -1;
  let unitIndex = -1;
  let quantityIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase();
    if (line === "SL NO" || line === "SL. NO" || line === "SL.NO")
      slNoIndex = i;
    if (line === "ITEM DESCRIPTION" || line.includes("DESCRIPTION"))
      itemDescIndex = i;
    if (line === "UNIT") unitIndex = i;
    if (line === "QUANTITY") quantityIndex = i;
  }

  // If we don't have the key markers, this isn't MOH format
  if (slNoIndex === -1) return [];

  const itemNumbers: string[] = [];
  const descriptions: string[] = [];
  const units: string[] = [];
  const quantities: string[] = [];

  // Look for consecutive item numbers before SL NO
  for (let i = 0; i < slNoIndex; i++) {
    if (/^[\d]+$/.test(lines[i]) && parseInt(lines[i]) <= 100) {
      itemNumbers.push(lines[i]);
    }
  }

  const expectedItemCount = itemNumbers.length;

  // Extract descriptions between SL NO and UNIT (or ITEM DESCRIPTION and UNIT)
  // These need to be joined if split across lines
  const descEndIdx =
    unitIndex > -1
      ? unitIndex
      : quantityIndex > -1
        ? quantityIndex
        : lines.length;
  const rawDescLines: string[] = [];

  for (let i = slNoIndex + 1; i < descEndIdx; i++) {
    const line = lines[i];
    // Skip headers
    if (line.toUpperCase() === "ITEM DESCRIPTION") continue;
    // Skip if it's just numbers or too short
    if (/^[\d]+$/.test(line) || line.length < 2) continue;
    // Skip Arabic-only lines
    if (
      /^[\u0600-\u06FF\s\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+$/.test(
        line
      )
    )
      continue;
    // Skip unit keywords in description area
    if (/^(PCS?|PIECES?|EACH|UNITS?|NOS?|SETS?)$/i.test(line)) continue;

    rawDescLines.push(line);
  }

  // Merge description lines: if we have more raw lines than expected items,
  // some descriptions are split across lines
  if (rawDescLines.length > expectedItemCount && expectedItemCount > 0) {
    let currentDesc = "";
    for (const line of rawDescLines) {
      // If line starts with uppercase letter and we have content, might be new item
      if (
        currentDesc &&
        /^[A-Z]/.test(line) &&
        descriptions.length < expectedItemCount
      ) {
        // Check if this looks like a continuation (starts with common continuation words)
        if (/^(SIZES?|AND|WITH|FOR|IN|TO|OR)\b/i.test(line)) {
          currentDesc += " " + line;
        } else {
          descriptions.push(currentDesc.trim());
          currentDesc = line;
        }
      } else {
        currentDesc = currentDesc ? currentDesc + " " + line : line;
      }
    }
    if (currentDesc) {
      descriptions.push(currentDesc.trim());
    }
  } else {
    // Use raw lines directly
    for (const line of rawDescLines) {
      descriptions.push(line);
    }
  }

  // MOH format: units appear BEFORE the "UNIT" header, quantities BEFORE "QUANTITY" header
  // Extract units: look for PCS/PIECES etc. BEFORE the UNIT marker
  if (unitIndex > -1) {
    // Look backwards from UNIT marker for unit values
    for (
      let i = unitIndex - 1;
      i >= 0 && units.length < expectedItemCount;
      i--
    ) {
      const line = lines[i].toUpperCase();
      if (/^(PCS?|PIECES?|EACH|UNITS?|NOS?|SETS?)$/i.test(line)) {
        units.unshift(line.toLowerCase()); // Add to front since we're going backwards
      } else if (/^[A-Z]/.test(line) && line.length > 5) {
        // Hit description text, stop
        break;
      }
    }
  }

  // Extract quantities: look for numbers BETWEEN UNIT and QUANTITY markers
  if (unitIndex > -1 && quantityIndex > -1) {
    for (let i = unitIndex + 1; i < quantityIndex; i++) {
      const line = lines[i];
      if (/^[\d]+$/.test(line)) {
        quantities.push(line);
      }
    }
  } else if (quantityIndex > -1) {
    // If no UNIT marker, look for numbers before QUANTITY
    for (
      let i = quantityIndex - 1;
      i >= 0 && quantities.length < expectedItemCount;
      i--
    ) {
      const line = lines[i];
      if (/^[\d]+$/.test(line) && parseInt(line) <= 10000) {
        quantities.unshift(line);
      } else if (/^[A-Z]/.test(line) && line.length > 5) {
        break;
      }
    }
  }

  // Build items - use the count of item numbers or descriptions
  const itemCount = Math.max(expectedItemCount, descriptions.length);

  for (let i = 0; i < itemCount; i++) {
    const description = descriptions[i] || "";
    if (!description || description.length < 3) continue;

    const arabicPattern = /[\u0600-\u06FF]/;
    const hasArabic = arabicPattern.test(description);

    items.push({
      item_number: itemNumbers[i] || String(i + 1),
      description: description.substring(0, 500),
      quantity: quantities[i] || "",
      unit: units[i] || "pcs",
      specifications: "",
      language: hasArabic ? "arabic" : "english",
      has_arabic: hasArabic,
    });
  }

  return items;
}

/**
 * Extract tender data from a PDF file using OCR
 * Falls back to JavaScript PDF text extraction if Python is not available
 */
export async function extractTenderFromPDF(
  pdfPath: string,
  options: OCROptions = {}
): Promise<OCRResponse> {
  // Validate file exists
  try {
    await fs.access(pdfPath);
  } catch {
    return {
      success: false,
      error: `File not found: ${pdfPath}`,
    };
  }

  // Check if Python is available
  const hasPython = await isPythonAvailable();
  if (!hasPython) {
    // Fall back to JavaScript PDF extraction
    console.log("Python not available, using JavaScript PDF extraction");
    return extractWithJavaScript(pdfPath, options);
  }

  // Build arguments
  const args: string[] = ["--file", pdfPath];

  if (options.department) {
    args.push("--department", options.department);
  }

  if (options.languages && options.languages.length > 0) {
    args.push("--languages", options.languages.join(","));
  }

  if (options.dpi) {
    args.push("--dpi", options.dpi.toString());
  }

  if (options.maxPages) {
    args.push("--max-pages", options.maxPages.toString());
  }

  if (options.includeRawText) {
    args.push("--include-text");
  }

  return executePython(args);
}

/**
 * Extract tender from a base64-encoded PDF
 * Useful for API endpoints that receive file data
 */
export async function extractTenderFromBase64(
  base64Data: string,
  filename: string,
  options: OCROptions = {}
): Promise<OCRResponse> {
  // Create temp file
  const tempDir = "/tmp/moh_ocr";
  const tempPath = path.join(tempDir, `${Date.now()}-${filename}`);

  try {
    // Ensure temp directory exists
    await fs.mkdir(tempDir, { recursive: true });

    // Write base64 data to temp file
    const buffer = Buffer.from(base64Data, "base64");
    await fs.writeFile(tempPath, buffer);

    // Extract
    const result = await extractTenderFromPDF(tempPath, options);

    // Clean up temp file
    await fs.unlink(tempPath).catch(() => {});

    return result;
  } catch (e) {
    // Clean up on error
    await fs.unlink(tempPath).catch(() => {});

    return {
      success: false,
      error: `Failed to process PDF: ${e instanceof Error ? e.message : String(e)}`,
      details: {
        suggestion:
          "The file may be corrupted. Please try uploading again or fill in the details manually.",
      },
    };
  }
}

/**
 * Get OCR service status
 */
export async function getOCRStatus(): Promise<{
  available: boolean;
  dependencies: OCRDependencies;
  scriptPath: string;
  pythonPath: string;
  message: string;
  extractionMethod: string;
}> {
  const hasPython = await isPythonAvailable();

  if (!hasPython) {
    return {
      available: true, // JavaScript fallback is always available
      dependencies: {
        python_packages: false,
        missing_package: "Python not installed - using JavaScript fallback",
        tesseract_available: false,
        tesseract_path: null,
        poppler_available: false,
        ready: true, // Ready because JS fallback works
      },
      scriptPath: PYTHON_SCRIPT,
      pythonPath: "pdf-parse (JavaScript)",
      message:
        "PDF text extraction is available using JavaScript. Note: Image-based PDFs may require manual entry.",
      extractionMethod: "pdf-parse-js",
    };
  }

  const dependencies = await checkOCRDependencies();
  const pythonPath = await getPythonPath();

  return {
    available: dependencies.ready,
    dependencies,
    scriptPath: PYTHON_SCRIPT,
    pythonPath,
    message: dependencies.ready
      ? "OCR is ready for use."
      : "OCR dependencies are missing. You can still add tenders manually.",
    extractionMethod: "python-ocr",
  };
}
