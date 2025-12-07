import { Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export function UpcomingDeliveriesWidget() {
  const { data: deliveries } = trpc.deliveries.list.useQuery();

  const upcomingDeliveries = deliveries?.filter(d => 
    d.status === 'planned' || d.status === 'in_transit'
  ) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_transit': return 'default';
      case 'planned': return 'secondary';
      case 'delivered': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Upcoming Deliveries</CardTitle>
        <Truck className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{upcomingDeliveries.length}</div>
        <p className="text-xs text-muted-foreground">Deliveries in progress</p>
        <div className="mt-4 space-y-2">
          {upcomingDeliveries.slice(0, 4).map(delivery => (
            <Link key={delivery.id} href={`/deliveries/${delivery.id}`}>
              <a className="flex items-center justify-between text-sm hover:underline">
                <span className="truncate flex-1">{delivery.deliveryNumber}</span>
                <Badge variant={getStatusColor(delivery.status)} className="ml-2 text-xs">
                  {delivery.status}
                </Badge>
              </a>
            </Link>
          ))}
          {upcomingDeliveries.length > 4 && (
            <Link href="/deliveries">
              <a className="text-xs text-muted-foreground hover:underline">
                +{upcomingDeliveries.length - 4} more deliveries
              </a>
            </Link>
          )}
          {upcomingDeliveries.length === 0 && (
            <p className="text-xs text-muted-foreground">No upcoming deliveries</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
