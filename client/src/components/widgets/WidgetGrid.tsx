import { useState, useEffect } from "react";
import GridLayout, { Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-grid-layout/css/styles.css";
import { Button } from "@/components/ui/button";
import { Plus, Settings } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// Import all widget components
import { BudgetOverviewWidget } from "./BudgetOverviewWidget";
import { PendingApprovalsWidget } from "./PendingApprovalsWidget";
import { LowStockWidget } from "./LowStockWidget";
import { RecentExpensesWidget } from "./RecentExpensesWidget";
import { TaskSummaryWidget } from "./TaskSummaryWidget";
import { RevenueExpenseChartWidget } from "./RevenueExpenseChartWidget";
import { UpcomingDeliveriesWidget } from "./UpcomingDeliveriesWidget";

interface WidgetConfig {
  type: string;
  title: string;
  component: React.ComponentType;
  defaultSize: { w: number; h: number };
}

const AVAILABLE_WIDGETS: WidgetConfig[] = [
  { type: 'budget_overview', title: 'Budget Overview', component: BudgetOverviewWidget, defaultSize: { w: 2, h: 2 } },
  { type: 'pending_approvals', title: 'Pending Approvals', component: PendingApprovalsWidget, defaultSize: { w: 2, h: 2 } },
  { type: 'low_stock', title: 'Low Stock Alerts', component: LowStockWidget, defaultSize: { w: 2, h: 2 } },
  { type: 'recent_expenses', title: 'Recent Expenses', component: RecentExpensesWidget, defaultSize: { w: 2, h: 2 } },
  { type: 'task_summary', title: 'Task Summary', component: TaskSummaryWidget, defaultSize: { w: 2, h: 2 } },
  { type: 'revenue_expense_chart', title: 'Revenue vs Expenses', component: RevenueExpenseChartWidget, defaultSize: { w: 3, h: 2 } },
  { type: 'upcoming_deliveries', title: 'Upcoming Deliveries', component: UpcomingDeliveriesWidget, defaultSize: { w: 2, h: 2 } },
];

export function WidgetGrid() {
  const [layout, setLayout] = useState<Layout[]>([]);
  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
  
  const { data: preferences, refetch } = trpc.widgets.list.useQuery();
  const createWidget = trpc.widgets.create.useMutation();
  const updateWidget = trpc.widgets.update.useMutation();
  const deleteWidget = trpc.widgets.delete.useMutation();

  // Load saved preferences
  useEffect(() => {
    if (preferences && preferences.length > 0) {
      const loadedLayout: Layout[] = [];
      const loadedWidgets: string[] = [];
      
      preferences.forEach(pref => {
        if (pref.isVisible) {
          const position = JSON.parse(pref.position);
          loadedLayout.push({
            i: pref.id.toString(),
            x: position.x,
            y: position.y,
            w: position.w,
            h: position.h,
          });
          loadedWidgets.push(pref.widgetType);
        }
      });
      
      setLayout(loadedLayout);
      setActiveWidgets(loadedWidgets);
    } else {
      // Default layout for new users
      const defaultWidgets = ['budget_overview', 'pending_approvals', 'task_summary', 'recent_expenses'];
      const defaultLayout: Layout[] = defaultWidgets.map((type, index) => {
        const config = AVAILABLE_WIDGETS.find(w => w.type === type)!;
        return {
          i: `default-${index}`,
          x: (index % 2) * 2,
          y: Math.floor(index / 2) * 2,
          w: config.defaultSize.w,
          h: config.defaultSize.h,
        };
      });
      
      setLayout(defaultLayout);
      setActiveWidgets(defaultWidgets);
    }
  }, [preferences]);

  const handleLayoutChange = async (newLayout: Layout[]) => {
    setLayout(newLayout);
    
    // Save to backend
    for (const item of newLayout) {
      const widgetId = parseInt(item.i);
      if (!isNaN(widgetId)) {
        await updateWidget.mutateAsync({
          id: widgetId,
          position: JSON.stringify({ x: item.x, y: item.y, w: item.w, h: item.h }),
        });
      }
    }
  };

  const handleAddWidget = async (widgetType: string) => {
    const config = AVAILABLE_WIDGETS.find(w => w.type === widgetType)!;
    
    try {
      const result = await createWidget.mutateAsync({
        widgetType,
        position: JSON.stringify({
          x: 0,
          y: Infinity, // Put at bottom
          w: config.defaultSize.w,
          h: config.defaultSize.h,
        }),
        isVisible: true,
      });
      
      await refetch();
      toast.success(`${config.title} added to dashboard`);
    } catch (error) {
      toast.error('Failed to add widget');
    }
  };

  const handleRemoveWidget = async (widgetId: string) => {
    const id = parseInt(widgetId);
    if (!isNaN(id)) {
      try {
        await deleteWidget.mutateAsync({ id });
        await refetch();
        toast.success('Widget removed');
      } catch (error) {
        toast.error('Failed to remove widget');
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard Widgets</h2>
        <div className="flex gap-2">
          {AVAILABLE_WIDGETS.map(widget => (
            !activeWidgets.includes(widget.type) && (
              <Button
                key={widget.type}
                variant="outline"
                size="sm"
                onClick={() => handleAddWidget(widget.type)}
              >
                <Plus className="h-4 w-4 mr-1" />
                {widget.title}
              </Button>
            )
          ))}
        </div>
      </div>

      <GridLayout
        className="layout"
        layout={layout}
        cols={4}
        rowHeight={150}
        width={1200}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".widget-drag-handle"
      >
        {layout.map((item) => {
          const widgetId = parseInt(item.i);
          const pref = preferences?.find(p => p.id === widgetId);
          const widgetType = pref?.widgetType || activeWidgets[parseInt(item.i.replace('default-', ''))];
          const config = AVAILABLE_WIDGETS.find(w => w.type === widgetType);
          
          if (!config) return null;
          
          const WidgetComponent = config.component;
          
          return (
            <div key={item.i} className="relative">
              <div className="widget-drag-handle absolute top-2 left-2 cursor-move z-10 opacity-0 hover:opacity-100 transition-opacity">
                <Settings className="h-4 w-4 text-muted-foreground" />
              </div>
              <button
                className="absolute top-2 right-2 z-10 opacity-0 hover:opacity-100 transition-opacity"
                onClick={() => handleRemoveWidget(item.i)}
              >
                ×
              </button>
              <WidgetComponent />
            </div>
          );
        })}
      </GridLayout>
    </div>
  );
}
