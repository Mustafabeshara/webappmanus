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
import Expenses from "./pages/Expenses";
import Deliveries from "./pages/Deliveries";
import PurchaseOrders from "./pages/PurchaseOrders";
import Tasks from "./pages/Tasks";
import Users from "./pages/Users";
import AuditLogs from "./pages/AuditLogs";

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
      
      {/* Expenses */}
      <Route path={"/expenses"}>
        {() => (
          <DashboardLayout>
            <Expenses />
          </DashboardLayout>
        )}
      </Route>
      
      {/* Purchase Orders */}
      <Route path={"/purchase-orders"}>
        {() => (
          <DashboardLayout>
            <PurchaseOrders />
          </DashboardLayout>
        )}
      </Route>
      
      {/* Deliveries */}
      <Route path={"/deliveries"}>
        {() => (
          <DashboardLayout>
            <Deliveries />
          </DashboardLayout>
        )}
      </Route>
      
      {/* Tasks */}
      <Route path={"/tasks"}>
        {() => (
          <DashboardLayout>
            <Tasks />
          </DashboardLayout>
        )}
      </Route>
      
      {/* Users */}
      <Route path={"/users"}>
        {() => (
          <DashboardLayout>
            <Users />
          </DashboardLayout>
        )}
      </Route>
      
      {/* Audit Logs */}
      <Route path={"/audit-logs"}>
        {() => (
          <DashboardLayout>
            <AuditLogs />
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
