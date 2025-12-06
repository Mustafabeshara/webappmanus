#!/bin/bash
# Generate all remaining pages for Phase 2 & 3

PAGES_DIR="client/src/pages"

# Create placeholder pages that will be filled in
pages=(
  "ProductDetails"
  "Suppliers"
  "CreateSupplier"
  "SupplierDetails"
  "Customers"
  "CreateCustomer"
  "CustomerDetails"
  "Invoices"
  "CreateInvoice"
  "InvoiceDetails"
)

for page in "${pages[@]}"; do
  cat > "$PAGES_DIR/$page.tsx" << 'EOF'
export default function PAGENAME() {
  return <div>PAGENAME - Under Construction</div>;
}
EOF
  sed -i "s/PAGENAME/$page/g" "$PAGES_DIR/$page.tsx"
  echo "Created $page.tsx"
done

echo "All pages created successfully"
