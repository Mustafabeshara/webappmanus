import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { CalendarIcon, Download, TrendingUp, DollarSign, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];

export default function ExpenseAnalytics() {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [trendGroupBy, setTrendGroupBy] = useState<'day' | 'week' | 'month'>('month');

  // Fetch analytics data
  const { data: categoryData, isLoading: loadingCategory } = trpc.expenses.analyticsByCategory.useQuery({
    startDate,
    endDate,
  });

  const { data: departmentData, isLoading: loadingDepartment } = trpc.expenses.analyticsByDepartment.useQuery({
    startDate,
    endDate,
  });

  const { data: budgetVariance, isLoading: loadingBudget } = trpc.expenses.budgetVariance.useQuery({
    startDate,
    endDate,
  });

  const { data: trendData, isLoading: loadingTrend } = trpc.expenses.trendOverTime.useQuery({
    startDate: startDate || new Date(new Date().setMonth(new Date().getMonth() - 6)),
    endDate: endDate || new Date(),
    groupBy: trendGroupBy,
  }, {
    enabled: !!(startDate || endDate),
  });

  // Calculate summary statistics
  const totalSpending = categoryData?.reduce((sum, item) => sum + item.totalAmount, 0) || 0;
  const totalExpenses = categoryData?.reduce((sum, item) => sum + item.expenseCount, 0) || 0;
  const overBudgetCount = budgetVariance?.filter(b => b.status === 'over').length || 0;
  const warningBudgetCount = budgetVariance?.filter(b => b.status === 'warning').length || 0;

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text("Expense Analytics Report", 14, 22);
    
    // Date range
    doc.setFontSize(10);
    const dateRange = `Period: ${startDate ? format(startDate, "PPP") : "All time"} - ${endDate ? format(endDate, "PPP") : "Present"}`;
    doc.text(dateRange, 14, 30);
    
    // Summary statistics
    doc.setFontSize(12);
    doc.text("Summary Statistics", 14, 40);
    doc.setFontSize(10);
    doc.text(`Total Spending: $${totalSpending.toLocaleString()}`, 14, 48);
    doc.text(`Total Expenses: ${totalExpenses}`, 14, 54);
    doc.text(`Over Budget: ${overBudgetCount}`, 14, 60);
    doc.text(`Warning: ${warningBudgetCount}`, 14, 66);
    
    // Category breakdown table
    if (categoryData && categoryData.length > 0) {
      autoTable(doc, {
        startY: 75,
        head: [['Category', 'Total Amount', 'Expense Count']],
        body: categoryData.map(item => [
          item.categoryName,
          `$${item.totalAmount.toLocaleString()}`,
          item.expenseCount.toString(),
        ]),
        theme: 'grid',
      });
    }
    
    // Department breakdown table
    if (departmentData && departmentData.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || 75;
      autoTable(doc, {
        startY: finalY + 10,
        head: [['Department', 'Total Amount', 'Expense Count']],
        body: departmentData.map(item => [
          item.departmentName,
          `$${item.totalAmount.toLocaleString()}`,
          item.expenseCount.toString(),
        ]),
        theme: 'grid',
      });
    }
    
    // Budget variance table
    if (budgetVariance && budgetVariance.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || 75;
      autoTable(doc, {
        startY: finalY + 10,
        head: [['Budget', 'Allocated', 'Spent', 'Remaining', 'Utilization %', 'Status']],
        body: budgetVariance.map(item => [
          item.budgetName,
          `$${item.allocated.toLocaleString()}`,
          `$${item.spent.toLocaleString()}`,
          `$${item.remaining.toLocaleString()}`,
          `${item.utilizationPercent.toFixed(1)}%`,
          item.status === 'over' ? 'Over Budget' : item.status === 'warning' ? 'Warning' : 'OK',
        ]),
        theme: 'grid',
      });
    }
    
    // Save PDF
    doc.save(`expense-analytics-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Export to Excel
  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['Expense Analytics Report'],
      [''],
      ['Period', `${startDate ? format(startDate, "PPP") : "All time"} - ${endDate ? format(endDate, "PPP") : "Present"}`],
      [''],
      ['Summary Statistics'],
      ['Total Spending', `$${totalSpending.toLocaleString()}`],
      ['Total Expenses', totalExpenses],
      ['Over Budget', overBudgetCount],
      ['Warning', warningBudgetCount],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    
    // Category breakdown sheet
    if (categoryData && categoryData.length > 0) {
      const categorySheet = XLSX.utils.json_to_sheet(
        categoryData.map(item => ({
          'Category': item.categoryName,
          'Total Amount': item.totalAmount,
          'Expense Count': item.expenseCount,
        }))
      );
      XLSX.utils.book_append_sheet(workbook, categorySheet, 'By Category');
    }
    
    // Department breakdown sheet
    if (departmentData && departmentData.length > 0) {
      const departmentSheet = XLSX.utils.json_to_sheet(
        departmentData.map(item => ({
          'Department': item.departmentName,
          'Total Amount': item.totalAmount,
          'Expense Count': item.expenseCount,
        }))
      );
      XLSX.utils.book_append_sheet(workbook, departmentSheet, 'By Department');
    }
    
    // Budget variance sheet
    if (budgetVariance && budgetVariance.length > 0) {
      const budgetSheet = XLSX.utils.json_to_sheet(
        budgetVariance.map(item => ({
          'Budget': item.budgetName,
          'Allocated': item.allocated,
          'Spent': item.spent,
          'Remaining': item.remaining,
          'Utilization %': item.utilizationPercent.toFixed(1),
          'Status': item.status === 'over' ? 'Over Budget' : item.status === 'warning' ? 'Warning' : 'OK',
        }))
      );
      XLSX.utils.book_append_sheet(workbook, budgetSheet, 'Budget Variance');
    }
    
    // Trend data sheet
    if (trendData && trendData.length > 0) {
      const trendSheet = XLSX.utils.json_to_sheet(
        trendData.map(item => ({
          'Period': item.period,
          'Total Amount': item.totalAmount,
          'Expense Count': item.expenseCount,
          'Average Amount': item.averageAmount,
        }))
      );
      XLSX.utils.book_append_sheet(workbook, trendSheet, 'Trends');
    }
    
    // Save Excel file
    XLSX.writeFile(workbook, `expense-analytics-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expense Analytics</h1>
          <p className="text-muted-foreground">Comprehensive financial insights and reporting</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToPDF}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={exportToExcel}>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Date Range Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Select date range to analyze expenses</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : "Start Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : "End Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            onClick={() => {
              setStartDate(undefined);
              setEndDate(undefined);
            }}
          >
            Clear Filters
          </Button>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSpending.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Approved & paid expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExpenses}</div>
            <p className="text-xs text-muted-foreground">Number of transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Over Budget</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{overBudgetCount}</div>
            <p className="text-xs text-muted-foreground">Budgets exceeded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warning</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{warningBudgetCount}</div>
            <p className="text-xs text-muted-foreground">Budgets &gt;90% used</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>Distribution of expenses across categories</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCategory ? (
              <div className="h-[300px] flex items-center justify-center">Loading...</div>
            ) : categoryData && categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ categoryName, totalAmount }) =>
                      `${categoryName}: $${totalAmount.toLocaleString()}`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="totalAmount"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Spending by Department</CardTitle>
            <CardDescription>Comparison of departmental expenses</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDepartment ? (
              <div className="h-[300px] flex items-center justify-center">Loading...</div>
            ) : departmentData && departmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={departmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="departmentName" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="totalAmount" fill="#8884d8" name="Total Spending" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Trends</CardTitle>
            <CardDescription>Spending patterns over time</CardDescription>
            <Select value={trendGroupBy} onValueChange={(v: any) => setTrendGroupBy(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {loadingTrend ? (
              <div className="h-[300px] flex items-center justify-center">Loading...</div>
            ) : trendData && trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="totalAmount" stroke="#8884d8" name="Total Spending" />
                  <Line type="monotone" dataKey="averageAmount" stroke="#82ca9d" name="Average per Expense" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget Variance */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Utilization</CardTitle>
            <CardDescription>Budget vs actual spending comparison</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingBudget ? (
              <div className="h-[300px] flex items-center justify-center">Loading...</div>
            ) : budgetVariance && budgetVariance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={budgetVariance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="budgetName" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="allocated" fill="#82ca9d" name="Allocated" />
                  <Bar dataKey="spent" fill="#8884d8" name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budget Variance Table */}
      {budgetVariance && budgetVariance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Budget Analysis</CardTitle>
            <CardDescription>Budget-by-budget breakdown with utilization percentages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Budget Name</th>
                    <th className="text-right p-2">Allocated</th>
                    <th className="text-right p-2">Spent</th>
                    <th className="text-right p-2">Remaining</th>
                    <th className="text-right p-2">Utilization</th>
                    <th className="text-center p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetVariance.map((budget) => (
                    <tr key={budget.budgetId} className="border-b">
                      <td className="p-2">{budget.budgetName}</td>
                      <td className="text-right p-2">${budget.allocated.toLocaleString()}</td>
                      <td className="text-right p-2">${budget.spent.toLocaleString()}</td>
                      <td className="text-right p-2">${budget.remaining.toLocaleString()}</td>
                      <td className="text-right p-2">{budget.utilizationPercent.toFixed(1)}%</td>
                      <td className="text-center p-2">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs ${
                            budget.status === 'over'
                              ? 'bg-red-100 text-red-800'
                              : budget.status === 'warning'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {budget.status === 'over' ? 'Over Budget' : budget.status === 'warning' ? 'Warning' : 'OK'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
