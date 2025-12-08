import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight, FileX } from "lucide-react";

interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (term: string) => void;
  searchValue?: string;
  emptyMessage?: string;
  emptyDescription?: string;
  isLoading?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    onPageChange: (page: number) => void;
  };
  actions?: React.ReactNode;
  className?: string;
}

export function DataTable<T extends { id: number | string }>({
  data,
  columns,
  searchable,
  searchPlaceholder = "Search...",
  onSearch,
  searchValue = "",
  emptyMessage = "No data found",
  emptyDescription = "Try adjusting your search or filters",
  isLoading,
  pagination,
  actions,
  className,
}: DataTableProps<T>) {
  const totalPages = pagination
    ? Math.ceil(pagination.totalCount / pagination.pageSize)
    : 1;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {(searchable || actions) && (
        <div className="flex flex-col gap-4 p-4 border-b sm:flex-row sm:items-center sm:justify-between">
          {searchable && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearch?.(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      <CardContent className="p-0">
        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(
                      "font-semibold",
                      column.hideOnMobile && "hidden md:table-cell",
                      column.className
                    )}
                  >
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-48">
                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                      <FileX className="h-10 w-10 text-muted-foreground/50" />
                      <p className="font-medium text-muted-foreground">
                        {emptyMessage}
                      </p>
                      <p className="text-sm text-muted-foreground/70">
                        {emptyDescription}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow key={row.id} className="group">
                    {columns.map((column) => (
                      <TableCell
                        key={`${row.id}-${column.key}`}
                        className={cn(
                          column.hideOnMobile && "hidden md:table-cell",
                          column.className
                        )}
                      >
                        {column.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card List */}
        <div className="sm:hidden divide-y">
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center px-4">
              <FileX className="h-10 w-10 text-muted-foreground/50" />
              <p className="font-medium text-muted-foreground">{emptyMessage}</p>
              <p className="text-sm text-muted-foreground/70">
                {emptyDescription}
              </p>
            </div>
          ) : (
            data.map((row) => (
              <div key={row.id} className="p-4 space-y-2">
                {columns
                  .filter((col) => !col.hideOnMobile)
                  .map((column) => (
                    <div
                      key={`${row.id}-${column.key}-mobile`}
                      className="flex items-start justify-between gap-4"
                    >
                      <span className="text-sm text-muted-foreground shrink-0">
                        {column.header}
                      </span>
                      <span className="text-sm text-right">{column.cell(row)}</span>
                    </div>
                  ))}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination && totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 p-4 border-t">
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
