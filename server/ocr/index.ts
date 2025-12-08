/**
 * OCR Service - Tender extraction with graceful fallback
 *
 * Attempts to use Python OCR if available, otherwise falls back to
 * a JavaScript-based PDF text extraction or manual entry mode.
 */

import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";

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
 * Extract tender data from a PDF file using OCR
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
    // Return a helpful message for manual entry
    return {
      success: false,
      error: "OCR extraction is not available on this server.",
      details: {
        reason: "python_not_installed",
        suggestion: "The PDF has been uploaded successfully. Please fill in the tender details manually.",
        file: pdfPath
      }
    };
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
}> {
  const hasPython = await isPythonAvailable();

  if (!hasPython) {
    return {
      available: false,
      dependencies: {
        python_packages: false,
        missing_package: "Python not installed",
        tesseract_available: false,
        tesseract_path: null,
        poppler_available: false,
        ready: false,
      },
      scriptPath: PYTHON_SCRIPT,
      pythonPath: "python3",
      message: "OCR is not available. Python is not installed on this server. You can still add tenders manually."
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
      : "OCR dependencies are missing. You can still add tenders manually."
  };
}
