import { AlertTriangle, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export function LowStockWidget() {
  const { data: inventory } = trpc.inventory.list.useQuery();

  const lowStockItems = inventory?.filter(item => 
    item.currentStock <= item.reorderLevel
  ) || [];

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
        <Package className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{lowStockItems.length}</div>
        <p className="text-xs text-muted-foreground">Items need restocking</p>
        <div className="mt-4 space-y-2">
          {lowStockItems.slice(0, 3).map(item => (
            <Link key={item.id} href={`/inventory/${item.id}`}>
              <a className="flex items-center justify-between text-sm hover:underline">
                <span className="truncate">{item.name}</span>
                <Badge variant="destructive" className="ml-2">
                  {item.currentStock}
                </Badge>
              </a>
            </Link>
          ))}
          {lowStockItems.length > 3 && (
            <Link href="/inventory">
              <a className="text-xs text-muted-foreground hover:underline">
                +{lowStockItems.length - 3} more items
              </a>
            </Link>
          )}
          {lowStockItems.length === 0 && (
            <div className="flex items-center text-xs text-muted-foreground">
              <AlertTriangle className="mr-1 h-3 w-3 text-green-500" />
              All stock levels healthy
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
