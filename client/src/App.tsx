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
