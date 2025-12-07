export type WidgetType =
  | 'budget_overview'
  | 'pending_approvals'
  | 'low_stock'
  | 'recent_expenses'
  | 'task_summary'
  | 'revenue_expense_chart'
  | 'upcoming_deliveries';

export interface WidgetData {
  id: number;
  type: WidgetType;
  title: string;
  position: { x: number; y: number; w: number; h: number };
  settings?: Record<string, any>;
  isVisible: boolean;
}

export interface WidgetProps {
  data: WidgetData;
  onRemove?: () => void;
  onSettings?: () => void;
}
