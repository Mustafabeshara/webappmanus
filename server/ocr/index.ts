/**
 * OCR Service - Tender extraction with graceful fallback
 *
 * Attempts to use Python OCR if available, otherwise falls back to
 * a JavaScript-based PDF text extraction using pdf-parse.
 */

import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import pdfParse from "pdf-parse";

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

  return new Promise((resolve) => {
    const proc = spawn("python3", ["--version"]);

    proc.on("close", (code) => {
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
      error: "OCR not available: Python is not installed on this server. Please add tender details manually.",
      details: {
        reason: "python_not_installed",
        suggestion: "Manual entry mode is available - you can upload the PDF and fill in the tender details manually."
      }
    };
  }

  const pythonPath = await getPythonPath();

  return new Promise((resolve) => {
    const process = spawn(pythonPath, [PYTHON_SCRIPT, ...args]);

    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("close", (code) => {
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

    process.on("error", (err) => {
      resolve({
        success: false,
        error: `OCR not available: ${err.message}. Please add tender details manually.`,
        details: {
          reason: "python_error",
          suggestion: "Manual entry mode is available - you can upload the PDF and fill in the tender details manually."
        }
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
    const dataBuffer = await fs.readFile(pdfPath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;
    const filename = path.basename(pdfPath);

    // Parse extracted text to find tender information
    const result = parseTenderText(text, filename, options.department);

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
    return {
      success: false,
      error: `PDF text extraction failed: ${e instanceof Error ? e.message : String(e)}`,
      details: {
        suggestion: "The PDF may be image-based or corrupted. Please fill in the tender details manually."
      }
    };
  }
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
    /\b([\d]{1,2}(?:TN|LB|AL|EQ|LS|MA|PS|PT|TE|TS|IC|RC|BM)[\d]{2,4})\b/i,
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

  // Extract closing date
  const closingDatePatterns = [
    /(?:Closing\s*Date|Close\s*Date|Last\s*Date|Deadline)[:\s]*([\d]{1,2}[/\-.][\d]{1,2}[/\-.][\d]{2,4})/i,
    /(?:close[sd]?\s*(?:on|by)?|deadline)[:\s]*([\d]{1,2}[/\-.][\d]{1,2}[/\-.][\d]{2,4})/i,
  ];

  let closingDate = "";
  for (const pattern of closingDatePatterns) {
    const match = text.match(pattern);
    if (match) {
      closingDate = match[1].replace(/-/g, "/").replace(/\./g, "/");
      break;
    }
  }

  // Extract posting date
  const postingDatePatterns = [
    /(?:Posted|Published|Posted\s*Date|Publication\s*Date)[:\s]*([\d]{1,2}[/\-.][\d]{1,2}[/\-.][\d]{2,4})/i,
  ];

  let postingDate = "";
  for (const pattern of postingDatePatterns) {
    const match = text.match(pattern);
    if (match) {
      postingDate = match[1].replace(/-/g, "/").replace(/\./g, "/");
      break;
    }
  }

  // If no posting date, try first date in document
  if (!postingDate) {
    const allDates = text.match(/([\d]{2}\/[\d]{2}\/[\d]{4})/g);
    if (allDates && allDates.length > 0) {
      postingDate = allDates[0];
    }
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
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
  const arabicChars = (text.match(arabicPattern) || []).length;
  const totalChars = text.replace(/\s+/g, "").length;
  const arabicRatio = totalChars > 0 ? arabicChars / totalChars : 0;
  const hasArabic = arabicChars > 0;
  const language = arabicRatio > 0.3 ? "arabic" : arabicRatio > 0.05 ? "mixed" : "english";

  return {
    reference_number: referenceNumber,
    title: "",
    closing_date: closingDate,
    posting_date: postingDate,
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
 * Extract items from tender text
 */
function extractItemsFromText(text: string): TenderItem[] {
  const items: TenderItem[] = [];
  const lines = text.split("\n");

  const itemPatterns = [
    /^[\s]*([\d]+)[.)\-:\s]+([^0-9]+?)[\s]*[-–:][\s]*([\d]+(?:[.,][\d]+)?)\s*(pieces?|pcs?|units?|each|nos?|sets?|qty)?/i,
    /^[\s]*([\d]+)\s+([^\t]+?)\t+\s*([\d]+(?:[.,][\d]+)?)\s*(pieces?|pcs?|units?)?/i,
    /^[\s]*([\d]+)[.)\s]+(.+?)\s+([\d]+)\s*(pieces?|pcs?|units?|each|nos?|sets?|qty)?[\s]*$/i,
  ];

  let itemNumber = 0;
  const seen = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 5) continue;

    for (const pattern of itemPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const [, num, desc, qty, unit] = match;
        let description = desc.trim().replace(/\s+/g, " ").replace(/^[\d\s\-\.]+/, "");

        if (description && description.length > 3) {
          const key = description.toLowerCase().substring(0, 100);
          if (!seen.has(key)) {
            seen.add(key);

            // Detect Arabic in description
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
        suggestion: "The file may be corrupted. Please try uploading again or fill in the details manually."
      }
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
      message: "PDF text extraction is available using JavaScript. Note: Image-based PDFs may require manual entry.",
      extractionMethod: "pdf-parse-js"
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
    extractionMethod: "python-ocr"
  };
}
