#!/bin/bash
# OCR Setup Script for MOH Tender Extraction
# Run this script to install all required dependencies

set -e

echo "=========================================="
echo "MOH Tender OCR - Dependency Setup"
echo "=========================================="

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
    PACKAGE_MANAGER="brew"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
    if command -v apt-get &> /dev/null; then
        PACKAGE_MANAGER="apt"
    elif command -v yum &> /dev/null; then
        PACKAGE_MANAGER="yum"
    else
        echo "Unsupported Linux package manager"
        exit 1
    fi
else
    echo "Unsupported OS: $OSTYPE"
    exit 1
fi

echo "Detected OS: $OS"
echo "Package manager: $PACKAGE_MANAGER"

# Install system dependencies
echo ""
echo "Installing system dependencies..."

if [[ "$PACKAGE_MANAGER" == "brew" ]]; then
    # macOS with Homebrew
    if ! command -v brew &> /dev/null; then
        echo "Homebrew not found. Please install it first:"
        echo '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
        exit 1
    fi

    echo "Installing Tesseract OCR..."
    brew install tesseract

    echo "Installing Arabic language pack..."
    brew install tesseract-lang

    echo "Installing Poppler (for PDF processing)..."
    brew install poppler

elif [[ "$PACKAGE_MANAGER" == "apt" ]]; then
    # Debian/Ubuntu
    echo "Installing Tesseract OCR..."
    sudo apt-get update
    sudo apt-get install -y tesseract-ocr tesseract-ocr-ara tesseract-ocr-eng

    echo "Installing Poppler..."
    sudo apt-get install -y poppler-utils

elif [[ "$PACKAGE_MANAGER" == "yum" ]]; then
    # CentOS/RHEL
    echo "Installing Tesseract OCR..."
    sudo yum install -y tesseract tesseract-langpack-ara tesseract-langpack-eng

    echo "Installing Poppler..."
    sudo yum install -y poppler-utils
fi

# Create Python virtual environment
echo ""
echo "Setting up Python virtual environment..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/venv"

if [[ ! -d "$VENV_DIR" ]]; then
    python3 -m venv "$VENV_DIR"
    echo "Created virtual environment at $VENV_DIR"
fi

# Activate and install Python dependencies
echo "Installing Python dependencies..."
source "$VENV_DIR/bin/activate"
pip install --upgrade pip
pip install -r "$SCRIPT_DIR/requirements.txt"

# Verify installation
echo ""
echo "=========================================="
echo "Verifying installation..."
echo "=========================================="

# Check Tesseract
if command -v tesseract &> /dev/null; then
    TESSERACT_VERSION=$(tesseract --version 2>&1 | head -1)
    echo "✓ Tesseract: $TESSERACT_VERSION"
else
    echo "✗ Tesseract not found!"
fi

# Check available languages
echo "Available Tesseract languages:"
tesseract --list-langs 2>&1 | grep -E "(eng|ara)" || echo "  (checking...)"

# Check Poppler
if command -v pdftoppm &> /dev/null; then
    echo "✓ Poppler (pdftoppm) installed"
else
    echo "✗ Poppler not found!"
fi

# Check Python packages
echo ""
echo "Python packages:"
python -c "import pytesseract; print('✓ pytesseract')" 2>/dev/null || echo "✗ pytesseract"
python -c "import pdf2image; print('✓ pdf2image')" 2>/dev/null || echo "✗ pdf2image"
python -c "import PIL; print('✓ Pillow')" 2>/dev/null || echo "✗ Pillow"

# Run check command
echo ""
echo "Running dependency check..."
python "$SCRIPT_DIR/tender_extractor.py" --check

echo ""
echo "=========================================="
echo "Setup complete!"
echo "=========================================="
echo ""
echo "To use the OCR extractor:"
echo "  source $VENV_DIR/bin/activate"
echo "  python $SCRIPT_DIR/tender_extractor.py --file /path/to/tender.pdf"
echo ""
