import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Receipt, Eye, Plus, Search, Brain, List, Send, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import InvoiceAnalytics from "@/components/InvoiceAnalytics";

export default function Invoices() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: invoices, isLoading } = trpc.invoices.list.useQuery();

  const filteredInvoices = invoices?.filter((invoice) => {
    const search = searchTerm.toLowerCase();
    return (
      invoice.invoiceNumber.toLowerCase().includes(search) ||
      invoice.customer?.name?.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
      case "sent":
        return <Badge className="bg-blue-100 text-blue-800"><Send className="h-3 w-3 mr-1" />Sent</Badge>;
      case "overdue":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Overdue</Badge>;
      case "cancelled":
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return `KD ${(amount / 100).toLocaleString()}`;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Receipt className="h-8 w-8" />
            Invoices
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage invoices, track payments, and analyze collections
          </p>
        </div>
        <Link href="/invoices/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Invoice List
          </TabsTrigger>
          <TabsTrigger value="ai-analysis" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-analysis">
          <InvoiceAnalytics />
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by invoice number or customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading invoices...
                </div>
              ) : filteredInvoices && filteredInvoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono text-sm">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell className="font-medium">
                          {invoice.customer?.name || "-"}
                        </TableCell>
                        <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                        <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(invoice.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(invoice.paidAmount || 0)}
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/invoices/${invoice.id}`}>
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm
                      ? "Try adjusting your search terms"
                      : "Get started by creating your first invoice"}
                  </p>
                  {!searchTerm && (
                    <Link href="/invoices/create">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Invoice
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
