#!/usr/bin/env python3
"""
RapidOCR Service - Fast local OCR for receipt processing
Uses RapidOCR (ONNX Runtime) for text extraction from images
"""

import sys
import json
import base64
from io import BytesIO
from PIL import Image
from rapidocr_onnxruntime import RapidOCR

# Initialize RapidOCR engine
ocr_engine = RapidOCR()

def extract_text_from_image(image_data_base64: str, region: dict = None) -> dict:
    """
    Extract text from image using RapidOCR
    
    Args:
        image_data_base64: Base64 encoded image data
        region: Optional dict with {x, y, width, height} for cropping
    
    Returns:
        dict with extracted text and bounding boxes
    """
    try:
        # Decode base64 image
        image_bytes = base64.b64decode(image_data_base64)
        image = Image.open(BytesIO(image_bytes))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Crop to region if specified
        if region:
            x = region.get('x', 0)
            y = region.get('y', 0)
            width = region.get('width', image.width)
            height = region.get('height', image.height)
            image = image.crop((x, y, x + width, y + height))
        
        # Perform OCR
        result, elapse = ocr_engine(image)
        
        if not result:
            return {
                "success": False,
                "text": "",
                "boxes": [],
                "error": "No text detected"
            }
        
        # Extract text and bounding boxes
        full_text = []
        boxes = []
        
        for item in result:
            box, text, confidence = item
            full_text.append(text)
            boxes.append({
                "text": text,
                "confidence": float(confidence),
                "box": box  # [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
            })
        
        return {
            "success": True,
            "text": "\n".join(full_text),
            "boxes": boxes,
            "processing_time_ms": elapse
        }
        
    except Exception as e:
        return {
            "success": False,
            "text": "",
            "boxes": [],
            "error": str(e)
        }

def main():
    """
    Main entry point for CLI usage
    Reads JSON from stdin, outputs JSON to stdout
    """
    try:
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        image_data = input_data.get('image')
        region = input_data.get('region')
        
        if not image_data:
            print(json.dumps({
                "success": False,
                "error": "No image data provided"
            }))
            sys.exit(1)
        
        # Perform OCR
        result = extract_text_from_image(image_data, region)
        
        # Output result as JSON
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
