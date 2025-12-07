import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Upload, FileText, CheckCircle2, XCircle, AlertTriangle, Download } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ParsedExpense {
  title: string;
  description?: string;
  categoryId: number;
  budgetId?: number;
  departmentId?: number;
  amount: number;
  expenseDate: string;
  notes?: string;
}

export default function BulkImportExpenses() {
  const [, setLocation] = useLocation();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedExpenses, setParsedExpenses] = useState<ParsedExpense[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importResults, setImportResults] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: budgetCategories = [] } = trpc.budgetCategories.list.useQuery();
  const { data: budgets = [] } = trpc.budgets.list.useQuery();
  const { data: departments = [] } = trpc.departments.list.useQuery();

  const bulkImportMutation = trpc.expenses.bulkImport.useMutation({
    onSuccess: (results) => {
      setImportResults(results);
      setIsProcessing(false);
      
      const successCount = results.success.length;
      const errorCount = results.errors.length;
      const duplicateCount = results.duplicates.length;
      
      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} expense(s)`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} expense(s) failed to import`);
      }
      if (duplicateCount > 0) {
        toast.warning(`${duplicateCount} duplicate(s) skipped`);
      }
    },
    onError: (error) => {
      setIsProcessing(false);
      toast.error("Import failed: " + error.message);
    },
  });

  const downloadTemplate = () => {
    const template = `title,description,category,budget,department,amount,expenseDate,notes
Office Supplies,Monthly office supplies purchase,Operations,,IT,150.00,2025-01-15,Purchased from Office Depot
Travel Expense,Flight to conference,Travel,Marketing Budget,Marketing,500.00,2025-01-20,Annual tech conference
Equipment,New laptop,Equipment,IT Budget,IT,1200.00,2025-01-25,MacBook Pro for developer`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expense_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    setCsvFile(file);
    setParsedExpenses([]);
    setParseErrors([]);
    setImportResults(null);

    // Parse CSV
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) {
      setParseErrors(["CSV file is empty or has no data rows"]);
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const requiredHeaders = ["title", "category", "amount", "expensedate"];
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));

    if (missingHeaders.length > 0) {
      setParseErrors([`Missing required columns: ${missingHeaders.join(", ")}`]);
      return;
    }

    const expenses: ParsedExpense[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(",").map((v) => v.trim());
      const row: any = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });

      try {
        // Find category by name
        const category = budgetCategories.find(
          (c) => c.name.toLowerCase() === row.category.toLowerCase()
        );
        if (!category) {
          errors.push(`Row ${i + 1}: Category "${row.category}" not found`);
          continue;
        }

        // Find budget by name (optional)
        let budgetId: number | undefined;
        if (row.budget) {
          const budget = budgets.find((b) => b.name.toLowerCase() === row.budget.toLowerCase());
          if (budget) {
            budgetId = budget.id;
          } else {
            errors.push(`Row ${i + 1}: Budget "${row.budget}" not found (skipping budget link)`);
          }
        }

        // Find department by name (optional)
        let departmentId: number | undefined;
        if (row.department) {
          const dept = departments.find((d) => d.name.toLowerCase() === row.department.toLowerCase());
          if (dept) {
            departmentId = dept.id;
          } else {
            errors.push(
              `Row ${i + 1}: Department "${row.department}" not found (skipping department link)`
            );
          }
        }

        // Parse amount
        const amount = parseFloat(row.amount);
        if (isNaN(amount) || amount <= 0) {
          errors.push(`Row ${i + 1}: Invalid amount "${row.amount}"`);
          continue;
        }

        // Parse date
        const expenseDate = new Date(row.expensedate);
        if (isNaN(expenseDate.getTime())) {
          errors.push(`Row ${i + 1}: Invalid date "${row.expensedate}"`);
          continue;
        }

        expenses.push({
          title: row.title,
          description: row.description || undefined,
          categoryId: category.id,
          budgetId,
          departmentId,
          amount: Math.round(amount * 100), // Convert to cents
          expenseDate: expenseDate.toISOString().split("T")[0],
          notes: row.notes || undefined,
        });
      } catch (error: any) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    setParsedExpenses(expenses);
    setParseErrors(errors);

    if (expenses.length === 0) {
      toast.error("No valid expenses found in CSV");
    } else {
      toast.success(`Parsed ${expenses.length} expense(s) from CSV`);
    }
  };

  const handleImport = () => {
    if (parsedExpenses.length === 0) {
      toast.error("No expenses to import");
      return;
    }

    setIsProcessing(true);
    bulkImportMutation.mutate({ expenses: parsedExpenses });
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/expenses">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Bulk Import Expenses</h1>
            <p className="text-muted-foreground">Import multiple expenses from a CSV file</p>
          </div>
        </div>
        <Button onClick={downloadTemplate} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download Template
        </Button>
      </div>

      {/* Instructions */}
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertTitle>CSV Format Instructions</AlertTitle>
        <AlertDescription>
          Required columns: <strong>title, category, amount, expenseDate</strong>
          <br />
          Optional columns: description, budget, department, notes
          <br />
          Date format: YYYY-MM-DD (e.g., 2025-01-15)
          <br />
          Amount format: Decimal number (e.g., 150.00)
        </AlertDescription>
      </Alert>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csvFile">Select CSV File</Label>
            <Input
              id="csvFile"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
          </div>

          {csvFile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              {csvFile.name} ({(csvFile.size / 1024).toFixed(2)} KB)
            </div>
          )}
        </CardContent>
      </Card>

      {/* Parse Errors */}
      {parseErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Parsing Warnings</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {parseErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Parsed Expenses Preview */}
      {parsedExpenses.length > 0 && !importResults && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Preview ({parsedExpenses.length} expenses)</CardTitle>
              <Button onClick={handleImport} disabled={isProcessing}>
                <Upload className="mr-2 h-4 w-4" />
                {isProcessing ? "Importing..." : "Import All"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Department</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedExpenses.map((expense, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{expense.title}</TableCell>
                      <TableCell>
                        {budgetCategories.find((c) => c.id === expense.categoryId)?.name}
                      </TableCell>
                      <TableCell>{formatCurrency(expense.amount)}</TableCell>
                      <TableCell>{expense.expenseDate}</TableCell>
                      <TableCell>
                        {expense.budgetId
                          ? budgets.find((b) => b.id === expense.budgetId)?.name
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {expense.departmentId
                          ? departments.find((d) => d.id === expense.departmentId)?.name
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResults && (
        <div className="space-y-4">
          {/* Success */}
          {importResults.success.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  Successfully Imported ({importResults.success.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {importResults.success.map((item: any) => (
                    <div key={item.row} className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <span>
                        Row {item.row}: {item.title}
                      </span>
                      <Badge variant="outline">{item.expenseNumber}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Duplicates */}
          {importResults.duplicates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600">
                  <AlertTriangle className="h-5 w-5" />
                  Duplicates Skipped ({importResults.duplicates.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {importResults.duplicates.map((item: any) => (
                    <div key={item.row} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                      <span>
                        Row {item.row}: {item.expense.title}
                      </span>
                      <span className="text-sm text-muted-foreground">{item.reason}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Errors */}
          {importResults.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  Failed to Import ({importResults.errors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {importResults.errors.map((item: any) => (
                    <div key={item.row} className="flex items-center justify-between p-2 bg-red-50 rounded">
                      <span>
                        Row {item.row}: {item.expense.title}
                      </span>
                      <span className="text-sm text-red-600">{item.error}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setLocation("/expenses")}>
              View Expenses
            </Button>
            <Button
              onClick={() => {
                setCsvFile(null);
                setParsedExpenses([]);
                setImportResults(null);
                setParseErrors([]);
              }}
            >
              Import Another File
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
