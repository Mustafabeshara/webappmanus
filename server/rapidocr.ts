import { spawn } from "child_process";
import path from "path";

interface OCRResult {
  success: boolean;
  text: string;
  boxes: Array<{
    text: string;
    confidence: number;
    box: number[][];
  }>;
  processing_time_ms?: number;
  error?: string;
}

interface OCRRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Perform OCR on an image using RapidOCR
 * @param imageBase64 - Base64 encoded image data (without data:image/... prefix)
 * @param region - Optional region to crop before OCR
 * @returns OCR result with extracted text and bounding boxes
 */
export async function performRapidOCR(
  imageBase64: string,
  region?: OCRRegion
): Promise<OCRResult> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, "rapidocr_service.py");
    
    // Spawn Python process
    const python = spawn("python3", [pythonScript]);
    
    let stdout = "";
    let stderr = "";
    
    // Collect stdout
    python.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    
    // Collect stderr
    python.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    
    // Handle process completion
    python.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`RapidOCR process exited with code ${code}: ${stderr}`));
        return;
      }
      
      try {
        const result: OCRResult = JSON.parse(stdout);
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse OCR result: ${error}`));
      }
    });
    
    // Handle process errors
    python.on("error", (error) => {
      reject(new Error(`Failed to spawn RapidOCR process: ${error.message}`));
    });
    
    // Send input data to Python process
    const input = JSON.stringify({
      image: imageBase64,
      region: region || null,
    });
    
    python.stdin.write(input);
    python.stdin.end();
  });
}

/**
 * Extract text from a specific region of an image
 * @param imageBase64 - Base64 encoded image data
 * @param region - Region coordinates {x, y, width, height}
 * @returns Extracted text from the region
 */
export async function extractRegionText(
  imageBase64: string,
  region: OCRRegion
): Promise<string> {
  const result = await performRapidOCR(imageBase64, region);
  
  if (!result.success) {
    throw new Error(result.error || "OCR failed");
  }
  
  return result.text;
}
