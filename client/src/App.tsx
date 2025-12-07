import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Tenders from "./pages/Tenders";
import CreateTender from "./pages/CreateTender";
import TenderDetails from "./pages/TenderDetails";
import TenderTemplates from "./pages/TenderTemplates";
import CreateTemplate from "./pages/CreateTemplate";
import Budgets from "./pages/Budgets";
import CreateBudget from "./pages/CreateBudget";
import BudgetDetails from "./pages/BudgetDetails";
import Inventory from "./pages/Inventory";
import CreateProduct from "./pages/CreateProduct";
import ProductDetails from "./pages/ProductDetails";
import Suppliers from "./pages/Suppliers";
import CreateSupplier from "./pages/CreateSupplier";
import SupplierDetails from "./pages/SupplierDetails";
import Customers from "./pages/Customers";
import CreateCustomer from "./pages/CreateCustomer";
import CustomerDetails from "./pages/CustomerDetails";
import Invoices from "./pages/Invoices";
import CreateInvoice from "./pages/CreateInvoice";
import InvoiceDetails from "./pages/InvoiceDetails";
import PurchaseOrders from "./pages/PurchaseOrders";
import CreatePurchaseOrder from "./pages/CreatePurchaseOrder";
import PurchaseOrderDetails from "./pages/PurchaseOrderDetails";
import Expenses from "./pages/Expenses";
import CreateExpense from "./pages/CreateExpense";
import ExpenseDetails from "./pages/ExpenseDetails";
import BulkImportExpenses from "./pages/BulkImportExpenses";
import ExpenseApprovalDashboard from "./pages/ExpenseApprovalDashboard";
import MultiReceiptUpload from "./pages/MultiReceiptUpload";
import ExpenseAnalytics from "./pages/ExpenseAnalytics";
import Deliveries from "./pages/Deliveries";
import CreateDelivery from "./pages/CreateDelivery";
import DeliveryDetails from "./pages/DeliveryDetails";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path={"/"} component={Home} />
      
      {/* Dashboard routes */}
      <Route path={"/dashboard"}>
        {() => (
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/tenders"}>
        {() => (
          <DashboardLayout>
            <Tenders />
          </DashboardLayout>
        )}
      </Route>
      
      {/* Tenders - specific routes BEFORE dynamic routes */}
      <Route path={"/tenders/create"}>
        {() => (
          <DashboardLayout>
            <CreateTender />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/tenders/:id"}>
        {() => (
          <DashboardLayout>
            <TenderDetails />
          </DashboardLayout>
        )}
      </Route>
      
      {/* Templates - specific routes BEFORE dynamic routes */}
      <Route path={"/templates/create"}>
        {() => (
          <DashboardLayout>
            <CreateTemplate />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/templates"}>
        {() => (
          <DashboardLayout>
            <TenderTemplates />
          </DashboardLayout>
        )}
      </Route>
      
      {/* Budgets - specific routes BEFORE dynamic routes */}
      <Route path={"/budgets/create"}>
        {() => (
          <DashboardLayout>
            <CreateBudget />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/budgets/:id"}>
        {() => (
          <DashboardLayout>
            <BudgetDetails />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/budgets"}>
        {() => (
          <DashboardLayout>
            <Budgets />
          </DashboardLayout>
        )}
      </Route>
      
      {/* Inventory - specific routes BEFORE dynamic routes */}
      <Route path={"/inventory/create"}>
        {() => (
          <DashboardLayout>
            <CreateProduct />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/inventory/:id"}>
        {() => (
          <DashboardLayout>
            <ProductDetails />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/inventory"}>
        {() => (
          <DashboardLayout>
            <Inventory />
          </DashboardLayout>
        )}
      </Route>
      
      {/* Suppliers - specific routes BEFORE dynamic routes */}
      <Route path={"/suppliers/create"}>
        {() => (
          <DashboardLayout>
            <CreateSupplier />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/suppliers/:id"}>
        {() => (
          <DashboardLayout>
            <SupplierDetails />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/suppliers"}>
        {() => (
          <DashboardLayout>
            <Suppliers />
          </DashboardLayout>
        )}
      </Route>
      
      {/* Customers - specific routes BEFORE dynamic routes */}
      <Route path={"/customers/create"}>
        {() => (
          <DashboardLayout>
            <CreateCustomer />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/customers/:id"}>
        {() => (
          <DashboardLayout>
            <CustomerDetails />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/customers"}>
        {() => (
          <DashboardLayout>
            <Customers />
          </DashboardLayout>
        )}
      </Route>
      
      {/* Invoices - specific routes BEFORE dynamic routes */}
      <Route path={"/invoices/create"}>
        {() => (
          <DashboardLayout>
            <CreateInvoice />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/invoices/:id"}>
        {() => (
          <DashboardLayout>
            <InvoiceDetails />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/invoices"}>
        {() => (
          <DashboardLayout>
            <Invoices />
          </DashboardLayout>
        )}
      </Route>
      
      {/* Purchase Orders - specific routes BEFORE dynamic routes */}
      <Route path={"/purchase-orders/create"}>
        {() => (
          <DashboardLayout>
            <CreatePurchaseOrder />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/purchase-orders/:id"}>
        {() => (
          <DashboardLayout>
            <PurchaseOrderDetails />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/purchase-orders"}>
        {() => (
          <DashboardLayout>
            <PurchaseOrders />
          </DashboardLayout>
        )}
      </Route>
      
      {/* Expenses - specific routes BEFORE dynamic routes */}
      <Route path={"/expenses/approvals"}>
        {() => (
          <DashboardLayout>
            <ExpenseApprovalDashboard />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/expenses/analytics"}>
        {() => (
          <DashboardLayout>
            <ExpenseAnalytics />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/expenses/multi-upload"}>
        {() => (
          <DashboardLayout>
            <MultiReceiptUpload />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/expenses/bulk-import"}>
        {() => (
          <DashboardLayout>
            <BulkImportExpenses />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/expenses/create"}>
        {() => (
          <DashboardLayout>
            <CreateExpense />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/expenses/:id"}>
        {() => (
          <DashboardLayout>
            <ExpenseDetails />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/expenses"}>
        {() => (
          <DashboardLayout>
            <Expenses />
          </DashboardLayout>
        )}
      </Route>
      
      {/* Delivery routes */}
      <Route path={"/deliveries/create"}>
        {() => (
          <DashboardLayout>
            <CreateDelivery />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/deliveries/:id"}>
        {() => (
          <DashboardLayout>
            <DeliveryDetails />
          </DashboardLayout>
        )}
      </Route>
      
      <Route path={"/deliveries"}>
        {() => (
          <DashboardLayout>
            <Deliveries />
          </DashboardLayout>
        )}
      </Route>
      
      {/* Fallback routes */}
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
