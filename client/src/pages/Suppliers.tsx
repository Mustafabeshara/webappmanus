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
import { Building2, Eye, Pencil, Plus, Search, Brain, List } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import VendorScoring from "@/components/VendorScoring";

export default function Suppliers() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: suppliers, isLoading } = trpc.suppliers.list.useQuery();

  const filteredSuppliers = suppliers?.filter((supplier) => {
    const search = searchTerm.toLowerCase();
    return (
      supplier.name.toLowerCase().includes(search) ||
      supplier.code?.toLowerCase().includes(search) ||
      supplier.email?.toLowerCase().includes(search)
    );
  });

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Building2 className="h-8 w-8" />
            Suppliers
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your supplier and manufacturer relationships
          </p>
        </div>
        <Link href="/suppliers/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Supplier
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Supplier List
          </TabsTrigger>
          <TabsTrigger value="ai-analysis" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Vendor Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-analysis">
          <VendorScoring />
        </TabsContent>

        <TabsContent value="list">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, or email..."
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
              Loading suppliers...
            </div>
          ) : filteredSuppliers && filteredSuppliers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-mono text-sm">
                      {supplier.code || "-"}
                    </TableCell>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        Supplier
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{supplier.contactPerson || "-"}</div>
                        <div className="text-muted-foreground">
                          {supplier.email || "-"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={supplier.isActive ? "default" : "secondary"}
                      >
                        {supplier.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          supplier.complianceStatus === "compliant"
                            ? "default"
                            : supplier.complianceStatus === "pending"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {supplier.complianceStatus === "compliant"
                          ? "Compliant"
                          : supplier.complianceStatus === "pending"
                          ? "Pending"
                          : "Non-Compliant"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/suppliers/${supplier.id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/suppliers/${supplier.id}/edit`}>
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
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
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No suppliers found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "Get started by adding your first supplier"}
              </p>
              {!searchTerm && (
                <Link href="/suppliers/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Supplier
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
