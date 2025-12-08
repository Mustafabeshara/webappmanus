#!/usr/bin/env python3
"""
Tender OCR Extractor - Standalone Python Script
Extracts structured data from MOH tender PDFs using Tesseract OCR.

Usage:
  python tender_extractor.py --file /path/to/pdf
  python tender_extractor.py --file /path/to/pdf --department "Medical Store"
  python tender_extractor.py --check  # Check dependencies
"""

import os
import re
import sys
import json
import argparse
import subprocess
import logging
from pathlib import Path
from typing import List, Tuple, Dict, Optional
from datetime import datetime
from dataclasses import dataclass, asdict, field

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# Try to import required libraries
try:
    import pytesseract
    from pdf2image import convert_from_path
    from PIL import Image, ImageEnhance, ImageFilter
    DEPENDENCIES_AVAILABLE = True
except ImportError as e:
    DEPENDENCIES_AVAILABLE = False
    MISSING_DEPENDENCY = str(e)


# ============================================
# DATA MODELS
# ============================================

@dataclass
class TenderItem:
    """Single item from a tender"""
    item_number: str = ""
    description: str = ""
    quantity: str = ""
    unit: str = ""
    specifications: str = ""
    language: str = "unknown"
    has_arabic: bool = False


@dataclass
class TenderData:
    """Complete tender extraction result"""
    reference_number: str = ""
    title: str = ""
    closing_date: str = ""
    posting_date: str = ""
    department: str = ""
    items: List[TenderItem] = field(default_factory=list)
    specifications_text: str = ""
    items_count: int = 0
    ocr_confidence: float = 0.0
    source_files: List[str] = field(default_factory=list)
    extraction_timestamp: str = ""
    extraction_method: str = "ocr"
    language: str = "unknown"
    has_arabic_content: bool = False
    raw_text: str = ""
    errors: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization"""
        result = asdict(self)
        result['items'] = [asdict(item) for item in self.items]
        return result


# ============================================
# OCR CONFIGURATION
# ============================================

class OCRConfig:
    """OCR configuration settings"""
    TESSERACT_PATH = os.environ.get("TESSERACT_PATH", "/opt/homebrew/bin/tesseract")
    DEFAULT_LANGUAGES = ["eng", "ara"]
    DEFAULT_DPI = 300
    MAX_PAGES = 10
    TEMP_DIR = "/tmp/moh_ocr"


def find_tesseract() -> Optional[str]:
    """Find Tesseract executable"""
    paths = [
        OCRConfig.TESSERACT_PATH,
        "/opt/homebrew/bin/tesseract",
        "/usr/local/bin/tesseract",
        "/usr/bin/tesseract",
        "tesseract"
    ]

    for path in paths:
        try:
            result = subprocess.run([path, "--version"], capture_output=True, text=True)
            if result.returncode == 0:
                return path
        except (FileNotFoundError, subprocess.SubprocessError):
            continue
    return None


def check_poppler() -> bool:
    """Check if Poppler is available"""
    try:
        subprocess.run(["pdftoppm", "-v"], capture_output=True, text=True)
        return True
    except FileNotFoundError:
        return False


def check_dependencies() -> Dict:
    """Check all required dependencies"""
    tesseract_path = find_tesseract()

    return {
        "python_packages": DEPENDENCIES_AVAILABLE,
        "missing_package": MISSING_DEPENDENCY if not DEPENDENCIES_AVAILABLE else None,
        "tesseract_available": tesseract_path is not None,
        "tesseract_path": tesseract_path,
        "poppler_available": check_poppler(),
        "ready": DEPENDENCIES_AVAILABLE and tesseract_path is not None and check_poppler()
    }


# ============================================
# OCR ENGINE
# ============================================

class OCREngine:
    """OCR engine for PDF text extraction"""

    def __init__(self, languages: List[str] = None, dpi: int = None):
        self.languages = languages or OCRConfig.DEFAULT_LANGUAGES
        self.dpi = dpi or OCRConfig.DEFAULT_DPI
        self.lang_str = "+".join(self.languages)

        # Ensure temp directory exists
        os.makedirs(OCRConfig.TEMP_DIR, exist_ok=True)

        # Set tesseract path
        tesseract_path = find_tesseract()
        if tesseract_path:
            pytesseract.pytesseract.tesseract_cmd = tesseract_path

    def preprocess_image(self, image: Image.Image) -> Image.Image:
        """Preprocess image for better OCR accuracy"""
        # Convert to grayscale
        if image.mode != 'L':
            image = image.convert('L')

        # Enhance contrast
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.5)

        # Sharpen
        image = image.filter(ImageFilter.SHARPEN)

        # Binarize
        threshold = 128
        image = image.point(lambda p: 255 if p > threshold else 0)

        return image

    def extract_text_from_pdf(
        self,
        pdf_path: str,
        max_pages: int = None
    ) -> Tuple[str, float]:
        """Extract text from PDF using OCR"""
        max_pages = max_pages or OCRConfig.MAX_PAGES

        if not os.path.exists(pdf_path):
            logger.error(f"PDF not found: {pdf_path}")
            return "", 0.0

        try:
            logger.info(f"Converting PDF to images: {os.path.basename(pdf_path)}")

            images = convert_from_path(
                pdf_path,
                dpi=self.dpi,
                first_page=1,
                last_page=max_pages
            )

            logger.info(f"Processing {len(images)} pages")

            all_text = []
            confidences = []

            for i, image in enumerate(images, 1):
                processed_image = self.preprocess_image(image)

                # Get OCR data with confidence scores
                ocr_data = pytesseract.image_to_data(
                    processed_image,
                    lang=self.lang_str,
                    output_type=pytesseract.Output.DICT,
                    config='--psm 6 --oem 3'
                )

                page_text = []
                page_confidences = []

                for j, word in enumerate(ocr_data['text']):
                    conf = int(ocr_data['conf'][j])
                    if conf > 0 and word.strip():
                        page_text.append(word)
                        page_confidences.append(conf)

                if page_confidences:
                    confidences.append(sum(page_confidences) / len(page_confidences))

                all_text.append(" ".join(page_text))

            full_text = "\n\n--- PAGE BREAK ---\n\n".join(all_text)
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

            logger.info(f"Extracted {len(full_text)} characters, confidence: {avg_confidence:.1f}%")

            return full_text, avg_confidence

        except Exception as e:
            logger.error(f"OCR failed: {e}")
            return "", 0.0


# ============================================
# TENDER PARSER
# ============================================

class TenderParser:
    """Parser for extracting structured data from OCR text"""

    @staticmethod
    def detect_language(text: str) -> Dict:
        """Detect if text contains Arabic content"""
        arabic_pattern = r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]'
        arabic_chars = len(re.findall(arabic_pattern, text))
        total_chars = len(re.sub(r'\s+', '', text))

        if total_chars == 0:
            return {'language': 'unknown', 'arabic_ratio': 0, 'has_arabic': False}

        arabic_ratio = arabic_chars / total_chars

        if arabic_ratio > 0.3:
            primary_language = 'arabic'
        elif arabic_ratio > 0.05:
            primary_language = 'mixed'
        else:
            primary_language = 'english'

        return {
            'language': primary_language,
            'arabic_ratio': arabic_ratio,
            'has_arabic': arabic_chars > 0
        }

    @staticmethod
    def extract_reference_number(text: str, filename: str = "") -> str:
        """Extract tender reference number"""
        # Try filename first
        if filename:
            match = re.search(r'(\d{1,2}[A-Z]{2,3}\d{2,4})', filename)
            if match:
                return match.group(1)

        patterns = [
            r'(?:Tender\s*(?:No\.?|Number|Ref\.?)?[:\s]*)?(\d{1,2}[A-Z]{2,3}\d{2,4})',
            r'(?:Reference[:\s]*)?(\d{1,2}[A-Z]{2,3}\d{2,4})',
            r'\b(\d{1,2}(?:TN|LB|AL|EQ|LS|MA|PS|PT|TE|TS|IC|RC|BM)\d{2,4})\b',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).upper()

        return ""

    @staticmethod
    def extract_closing_date(text: str) -> str:
        """Extract closing date from tender text"""
        patterns = [
            r'(?:Closing\s*Date|Close\s*Date|Last\s*Date|Deadline)[:\s]*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})',
            r'(?:close[sd]?\s*(?:on|by)?|deadline)[:\s]*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})',
            r'(\d{2}/\d{2}/\d{4})',
        ]

        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                date_str = matches[-1] if len(matches) > 1 else matches[0]
                return date_str.replace('-', '/').replace('.', '/')

        return ""

    @staticmethod
    def extract_posting_date(text: str) -> str:
        """Extract posting date from tender text"""
        patterns = [
            r'(?:Posted|Published|Posted\s*Date|Publication\s*Date)[:\s]*(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).replace('-', '/').replace('.', '/')

        # Return first date found
        all_dates = re.findall(r'(\d{2}/\d{2}/\d{4})', text)
        return all_dates[0] if all_dates else ""

    @staticmethod
    def is_garbage_line(line: str) -> bool:
        """Check if line is garbage (headers, footers, etc.)"""
        garbage_patterns = [
            r'^page\s*\d+',
            r'^\d+\s*of\s*\d+$',
            r'^https?://',
            r'^\+?\d{3}[\s\-]?\d{4}[\s\-]?\d{4}$',  # Phone numbers
            r'^ministry\s+of\s+health',
            r'^state\s+of\s+kuwait',
            r'^medical\s+stores',
            r'^tender\s+department',
        ]

        line_lower = line.lower().strip()

        for pattern in garbage_patterns:
            if re.match(pattern, line_lower):
                return True

        # Too short or all digits/punctuation
        if len(line.strip()) < 5:
            return True
        if re.match(r'^[\d\s\-\.\,]+$', line):
            return True

        return False

    @staticmethod
    def extract_items(text: str) -> List[TenderItem]:
        """Extract items with descriptions and quantities"""
        items = []
        lines = text.split('\n')

        # Multiple patterns for different tender formats
        item_patterns = [
            # Pattern 1: "1. Description QTY: 100" or "1) Description - 100"
            r'^[\s]*(\d+)[.):\-\s]+([^0-9]+?)\s*[-–:]\s*(\d+(?:[.,]\d+)?)\s*(pieces?|pcs?|units?|each|nos?|sets?|qty)?',
            # Pattern 2: Tabular format
            r'^[\s]*(\d+)\s+([^\t]+?)\t+\s*(\d+(?:[.,]\d+)?)\s*(pieces?|pcs?|units?)?',
            # Pattern 3: "1. Description 100 pieces"
            r'^[\s]*(\d+)[.)\s]+(.+?)\s+(\d+)\s*(pieces?|pcs?|units?|each|nos?|sets?|qty)?[\s]*$',
            # Pattern 4: MOH Medical Store format
            r'^[\s]*(\d+)\s*\|?\s*([A-Z][A-Za-z\s\d\-\./]+)\s+(?:PFS|VIAL|AMP|TAB|CAP|TUBE|BTL|BOX|PKT|SET|UNIT|PCE)\s+(\d+[\d,]*)',
        ]

        current_item_number = 0

        for line in lines:
            line = line.strip()

            # Skip garbage lines
            if TenderParser.is_garbage_line(line):
                continue

            if len(line) < 5:
                continue

            for pattern in item_patterns:
                match = re.match(pattern, line, re.IGNORECASE | re.UNICODE)
                if match:
                    groups = match.groups()

                    item_no = groups[0]
                    description = groups[1].strip() if len(groups) > 1 else ""
                    quantity = groups[2] if len(groups) > 2 else ""
                    unit = groups[3] if len(groups) > 3 and groups[3] else "units"

                    # Clean description
                    description = re.sub(r'\s+', ' ', description).strip()
                    description = re.sub(r'^[\d\s\-\.]+', '', description)

                    # Clean quantity
                    if quantity:
                        quantity = re.sub(r'[^\d.,]', '', quantity)

                    if description and len(description) > 3:
                        lang_info = TenderParser.detect_language(description)

                        items.append(TenderItem(
                            item_number=str(item_no),
                            description=description[:500],
                            quantity=quantity,
                            unit=unit.lower() if unit else "units",
                            language=lang_info['language'],
                            has_arabic=lang_info['has_arabic']
                        ))
                        current_item_number = int(item_no)
                    break

            # Fallback pattern for lines with quantity at end
            if not items or current_item_number == 0:
                qty_match = re.search(
                    r'(.{10,}?)\s+(\d+)\s*(pieces?|pcs?|units?|each|nos?|sets?|qty)\s*$',
                    line,
                    re.IGNORECASE
                )
                if qty_match:
                    description = qty_match.group(1).strip()
                    quantity = qty_match.group(2)
                    unit = qty_match.group(3)

                    if len(description) > 5 and not TenderParser.is_garbage_line(description):
                        current_item_number += 1
                        lang_info = TenderParser.detect_language(description)

                        items.append(TenderItem(
                            item_number=str(current_item_number),
                            description=description[:500],
                            quantity=quantity,
                            unit=unit.lower(),
                            language=lang_info['language'],
                            has_arabic=lang_info['has_arabic']
                        ))

        # Remove duplicates based on description
        unique_items = []
        seen = set()

        for item in items:
            key = item.description.lower()[:100]
            if key not in seen:
                seen.add(key)
                unique_items.append(item)

        return unique_items

    @staticmethod
    def extract_specifications(text: str) -> str:
        """Extract specifications section"""
        patterns = [
            r'(?:Technical\s*)?Specifications?[:\s]*(.+?)(?:Terms|Conditions|Notes|\Z)',
            r'Requirements?[:\s]*(.+?)(?:Terms|Notes|\Z)',
            r'Description[:\s]*(.+?)(?:Quantity|Terms|\Z)',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                specs = match.group(1).strip()
                specs = re.sub(r'\s+', ' ', specs)
                if len(specs) > 50:
                    return specs[:2000]

        return ""


# ============================================
# TENDER EXTRACTOR (MAIN CLASS)
# ============================================

class TenderExtractor:
    """Main extractor class for processing tender PDFs"""

    def __init__(self, languages: List[str] = None, dpi: int = None):
        self.ocr_engine = OCREngine(languages, dpi)
        self.parser = TenderParser()

    def process_pdf(
        self,
        pdf_path: str,
        department: str = "Biomedical Engineering",
        max_pages: int = None,
        include_raw_text: bool = False
    ) -> TenderData:
        """Process a single PDF and extract tender data"""
        filename = os.path.basename(pdf_path)

        text, confidence = self.ocr_engine.extract_text_from_pdf(pdf_path, max_pages)

        if not text:
            return TenderData(
                reference_number=self.parser.extract_reference_number("", filename),
                department=department,
                source_files=[filename],
                errors=["Failed to extract text from PDF"],
                extraction_timestamp=datetime.now().isoformat()
            )

        lang_info = self.parser.detect_language(text)
        items = self.parser.extract_items(text)

        return TenderData(
            reference_number=self.parser.extract_reference_number(text, filename),
            closing_date=self.parser.extract_closing_date(text),
            posting_date=self.parser.extract_posting_date(text),
            department=department,
            items=items,
            specifications_text=self.parser.extract_specifications(text),
            items_count=len(items),
            ocr_confidence=confidence,
            source_files=[filename],
            extraction_timestamp=datetime.now().isoformat(),
            language=lang_info['language'],
            has_arabic_content=lang_info['has_arabic'],
            raw_text=text if include_raw_text else ""
        )


# ============================================
# CLI INTERFACE
# ============================================

def main():
    parser = argparse.ArgumentParser(
        description='Extract tender data from PDF using OCR'
    )
    parser.add_argument('--file', '-f', type=str, help='Path to PDF file')
    parser.add_argument('--department', '-d', type=str, default='Biomedical Engineering',
                        help='Department name')
    parser.add_argument('--languages', '-l', type=str, default='eng,ara',
                        help='OCR languages (comma-separated)')
    parser.add_argument('--dpi', type=int, default=300,
                        help='DPI for image conversion (100-600)')
    parser.add_argument('--max-pages', type=int, default=10,
                        help='Maximum pages to process')
    parser.add_argument('--include-text', action='store_true',
                        help='Include raw OCR text in output')
    parser.add_argument('--check', action='store_true',
                        help='Check dependencies and exit')
    parser.add_argument('--output', '-o', type=str, default='json',
                        choices=['json', 'pretty'],
                        help='Output format')

    args = parser.parse_args()

    # Check dependencies
    if args.check:
        deps = check_dependencies()
        print(json.dumps(deps, indent=2))
        sys.exit(0 if deps['ready'] else 1)

    # Validate dependencies
    deps = check_dependencies()
    if not deps['ready']:
        error_result = {
            "success": False,
            "error": "Missing dependencies",
            "details": deps
        }
        print(json.dumps(error_result))
        sys.exit(1)

    # Validate input
    if not args.file:
        error_result = {
            "success": False,
            "error": "No file specified. Use --file /path/to/pdf.pdf"
        }
        print(json.dumps(error_result))
        sys.exit(1)

    if not os.path.exists(args.file):
        error_result = {
            "success": False,
            "error": f"File not found: {args.file}"
        }
        print(json.dumps(error_result))
        sys.exit(1)

    # Process PDF
    try:
        languages = args.languages.split(',')
        extractor = TenderExtractor(languages=languages, dpi=args.dpi)

        result = extractor.process_pdf(
            pdf_path=args.file,
            department=args.department,
            max_pages=args.max_pages,
            include_raw_text=args.include_text
        )

        output = {
            "success": True,
            "data": result.to_dict()
        }

        if args.output == 'pretty':
            print(json.dumps(output, indent=2, ensure_ascii=False))
        else:
            print(json.dumps(output, ensure_ascii=False))

    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)


if __name__ == '__main__':
    main()
