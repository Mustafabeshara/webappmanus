import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { 
  FileText, 
  DollarSign, 
  Package, 
  Users, 
  TrendingUp, 
  Brain,
  Shield,
  Zap
} from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && user) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, user, setLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const features = [
    {
      icon: FileText,
      title: "Tender Management",
      description: "Create, track, and manage tenders with AI-powered document extraction and template system.",
    },
    {
      icon: DollarSign,
      title: "Budget Control",
      description: "Hierarchical budgets with real-time tracking, variance alerts, and multi-level approval workflows.",
    },
    {
      icon: Package,
      title: "Inventory Tracking",
      description: "Monitor stock levels, batch numbers, expiry dates with automated alerts and updates.",
    },
    {
      icon: Users,
      title: "CRM & Suppliers",
      description: "Manage customers, hospitals, suppliers with communication history and compliance tracking.",
    },
    {
      icon: TrendingUp,
      title: "Financial Management",
      description: "Track invoices, expenses, deliveries with automated workflows and payment monitoring.",
    },
    {
      icon: Brain,
      title: "AI-Powered Analytics",
      description: "Forecasting, anomaly detection, win rate analysis with intelligent document processing.",
    },
    {
      icon: Shield,
      title: "Role-Based Access",
      description: "Granular permissions per module with admin dashboard for user management.",
    },
    {
      icon: Zap,
      title: "Automated Workflows",
      description: "Auto-generate reference numbers, notifications, and approval chains for efficiency.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="container py-16 md:py-24">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            AI-Powered Business Management System
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Comprehensive platform for managing tenders, budgets, inventory, and financial operations
            with intelligent automation and analytics.
          </p>
          <div className="flex gap-4 justify-center">
            <a href={getLoginUrl()}>
              <Button size="lg" className="text-lg px-8">
                Get Started
              </Button>
            </a>
            <Button size="lg" variant="outline" className="text-lg px-8">
              Learn More
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <Card className="bg-primary text-primary-foreground border-0">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to transform your business operations?</h2>
            <p className="text-lg mb-6 opacity-90">
              Join thousands of businesses using our AI-powered platform to streamline operations and boost efficiency.
            </p>
            <a href={getLoginUrl()}>
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Start Free Trial
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
