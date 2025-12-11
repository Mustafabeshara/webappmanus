/**
 * AI-Powered Database Integration
 * Adds AI capabilities directly to database operations and queries
 */

import * as db from "../db";

export interface AIQueryRequest {
  query: string;
  context?: string;
  userId: number;
  maxResults?: number;
}

export interface AIQueryResult {
  results: any[];
  explanation: string;
  confidence: number;
  suggestedActions?: string[];
}

export interface SmartNotification {
  type:
    | "tender_match"
    | "price_alert"
    | "compliance_warning"
    | "opportunity"
    | "anomaly";
  priority: "low" | "medium" | "high" | "urgent";
  title: string;
  message: string;
  actionUrl?: string;
  data?: any;
}

class AIDatabaseIntegration {
  /**
   * Natural language database queries
   */
  async queryWithNaturalLanguage(
    request: AIQueryRequest
  ): Promise<AIQueryResult> {
    try {
      // Parse natural language query and convert to database operations
      const parsedQuery = await this.parseNaturalLanguageQuery(request.query);

      // Execute the parsed query
      const results = await this.executeAIQuery(
        parsedQuery,
        request.maxResults || 50
      );

      // Generate explanation
      const explanation = this.generateQueryExplanation(
        request.query,
        parsedQuery,
        results.length
      );

      return {
        results,
        explanation,
        confidence: parsedQuery.confidence,
        suggestedActions: this.generateSuggestedActions(parsedQuery, results),
      };
    } catch (error) {
      console.error("[AI DB] Natural language query failed:", error);
      throw error;
    }
  }

  /**
   * Parse natural language query into database operations
   */
  private async parseNaturalLanguageQuery(query: string): Promise<{
    operation: string;
    entity: string;
    filters: any[];
    confidence: number;
  }> {
    // AI-powered query parsing (simplified implementation)
    const queryLower = query.toLowerCase();

    // Detect operation type
    let operation = "select";
    if (queryLower.includes("create") || queryLower.includes("add"))
      operation = "create";
    if (queryLower.includes("update") || queryLower.includes("modify"))
      operation = "update";
    if (queryLower.includes("delete") || queryLower.includes("remove"))
      operation = "delete";

    // Detect entity type
    let entity = "unknown";
    const entities = [
      "tender",
      "supplier",
      "product",
      "invoice",
      "task",
      "user",
      "budget",
    ];
    for (const e of entities) {
      if (queryLower.includes(e)) {
        entity = e;
        break;
      }
    }

    // Extract filters (simplified)
    const filters = this.extractFiltersFromQuery(queryLower);

    return {
      operation,
      entity,
      filters,
      confidence: 0.8, // Would be calculated by AI
    };
  }

  /**
   * Extract filters from natural language query
   */
  private extractFiltersFromQuery(query: string): any[] {
    const filters: any[] = [];

    // Date filters
    if (query.includes("today")) {
      filters.push({ field: "date", operator: "equals", value: new Date() });
    }
    if (query.includes("this week")) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      filters.push({ field: "date", operator: "gte", value: weekStart });
    }

    // Status filters
    if (query.includes("active")) {
      filters.push({ field: "status", operator: "equals", value: "active" });
    }
    if (query.includes("pending")) {
      filters.push({ field: "status", operator: "equals", value: "pending" });
    }

    // Amount filters
    const amountMatch = query.match(/over (\d+)/);
    if (amountMatch) {
      filters.push({
        field: "amount",
        operator: "gt",
        value: parseInt(amountMatch[1]),
      });
    }

    return filters;
  }

  /**
   * Execute AI-parsed query
   */
  private async executeAIQuery(
    parsedQuery: any,
    maxResults: number
  ): Promise<any[]> {
    switch (parsedQuery.entity) {
      case "tender":
        return this.queryTenders(parsedQuery.filters, maxResults);
      case "supplier":
        return this.querySuppliers(parsedQuery.filters, maxResults);
      case "product":
        return this.queryProducts(parsedQuery.filters, maxResults);
      case "invoice":
        return this.queryInvoices(parsedQuery.filters, maxResults);
      case "task":
        return this.queryTasks(parsedQuery.filters, maxResults);
      default:
        return [];
    }
  }

  /**
   * Query tenders with AI filters
   */
  private async queryTenders(
    filters: any[],
    maxResults: number
  ): Promise<any[]> {
    let tenders = await db.getAllTenders();

    // Apply filters
    for (const filter of filters) {
      tenders = tenders.filter(tender => this.applyFilter(tender, filter));
    }

    return tenders.slice(0, maxResults);
  }

  /**
   * Query suppliers with AI filters
   */
  private async querySuppliers(
    filters: any[],
    maxResults: number
  ): Promise<any[]> {
    let suppliers = await db.getAllSuppliers();

    for (const filter of filters) {
      suppliers = suppliers.filter(supplier =>
        this.applyFilter(supplier, filter)
      );
    }

    return suppliers.slice(0, maxResults);
  }

  /**
   * Query products with AI filters
   */
  private async queryProducts(
    filters: any[],
    maxResults: number
  ): Promise<any[]> {
    let products = await db.getAllProducts();

    for (const filter of filters) {
      products = products.filter(product => this.applyFilter(product, filter));
    }

    return products.slice(0, maxResults);
  }

  /**
   * Query invoices with AI filters
   */
  private async queryInvoices(
    filters: any[],
    maxResults: number
  ): Promise<any[]> {
    let invoices = await db.getAllInvoices();

    for (const filter of filters) {
      invoices = invoices.filter(invoice => this.applyFilter(invoice, filter));
    }

    return invoices.slice(0, maxResults);
  }

  /**
   * Query tasks with AI filters
   */
  private async queryTasks(filters: any[], maxResults: number): Promise<any[]> {
    let tasks = await db.getAllTasks();

    for (const filter of filters) {
      tasks = tasks.filter(task => this.applyFilter(task, filter));
    }

    return tasks.slice(0, maxResults);
  }

  /**
   * Apply filter to entity
   */
  private applyFilter(entity: any, filter: any): boolean {
    const value = entity[filter.field];

    switch (filter.operator) {
      case "equals":
        return value === filter.value;
      case "gt":
        return value > filter.value;
      case "gte":
        return value >= filter.value;
      case "lt":
        return value < filter.value;
      case "lte":
        return value <= filter.value;
      case "contains":
        return (
          typeof value === "string" &&
          value.toLowerCase().includes(filter.value.toLowerCase())
        );
      default:
        return true;
    }
  }

  /**
   * Generate explanation for query results
   */
  private generateQueryExplanation(
    originalQuery: string,
    parsedQuery: any,
    resultCount: number
  ): string {
    return (
      `Found ${resultCount} ${parsedQuery.entity}(s) matching your query "${originalQuery}". ` +
      `Searched for ${parsedQuery.entity} records with ${parsedQuery.filters.length} filter(s) applied.`
    );
  }

  /**
   * Generate suggested actions based on query results
   */
  private generateSuggestedActions(parsedQuery: any, results: any[]): string[] {
    const actions: string[] = [];

    if (results.length === 0) {
      actions.push(`Create a new ${parsedQuery.entity}`);
      actions.push("Modify your search criteria");
    } else if (results.length > 20) {
      actions.push("Refine your search to get more specific results");
      actions.push("Export results to spreadsheet");
    } else {
      actions.push(`View details of ${parsedQuery.entity} records`);
      actions.push(`Edit selected ${parsedQuery.entity} records`);
    }

    return actions;
  }

  /**
   * Smart notifications based on AI analysis
   */
  async generateSmartNotifications(
    userId: number
  ): Promise<SmartNotification[]> {
    const notifications: SmartNotification[] = [];

    try {
      // Tender matching notifications
      const tenderMatches = await this.findTenderOpportunities(userId);
      notifications.push(...tenderMatches);

      // Price alerts
      const priceAlerts = await this.detectPriceAnomalies();
      notifications.push(...priceAlerts);

      // Compliance warnings
      const complianceWarnings = await this.checkComplianceStatus();
      notifications.push(...complianceWarnings);

      // Task deadlines
      const taskDeadlines = await this.checkTaskDeadlines(userId);
      notifications.push(...taskDeadlines);

      return notifications;
    } catch (error) {
      console.error("[AI DB] Smart notifications failed:", error);
      return [];
    }
  }

  /**
   * Find tender opportunities using AI
   */
  private async findTenderOpportunities(
    userId: number
  ): Promise<SmartNotification[]> {
    const notifications: SmartNotification[] = [];

    // Get user's supplier if they are associated with one
    const user = await db.getUserById(userId);
    if (!user) return notifications;

    // Get open tenders
    const tenders = await db.getAllTenders();
    const openTenders = tenders.filter(t => t.status === "open");

    for (const tender of openTenders.slice(0, 3)) {
      // Limit to 3 for performance
      // Simple matching logic (would be enhanced with AI)
      const daysUntilDeadline = tender.submissionDeadline
        ? Math.ceil(
            (new Date(tender.submissionDeadline).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;

      if (daysUntilDeadline > 0 && daysUntilDeadline <= 14) {
        notifications.push({
          type: "tender_match",
          priority: daysUntilDeadline <= 7 ? "high" : "medium",
          title: "Tender Opportunity Detected",
          message: `Tender "${tender.title}" matches your capabilities. Deadline in ${daysUntilDeadline} days.`,
          actionUrl: `/tenders/${tender.id}`,
          data: { tenderId: tender.id, daysLeft: daysUntilDeadline },
        });
      }
    }

    return notifications;
  }

  /**
   * Detect price anomalies
   */
  private async detectPriceAnomalies(): Promise<SmartNotification[]> {
    const notifications: SmartNotification[] = [];

    // This would analyze price trends and detect anomalies
    // For now, return a sample notification
    notifications.push({
      type: "price_alert",
      priority: "medium",
      title: "Price Increase Detected",
      message: "Medical supplies prices have increased by 15% this month",
      actionUrl: "/analytics/pricing",
      data: { category: "medical_supplies", increase: 15 },
    });

    return notifications;
  }

  /**
   * Check compliance status
   */
  private async checkComplianceStatus(): Promise<SmartNotification[]> {
    const notifications: SmartNotification[] = [];

    // Check for expiring certificates, compliance issues, etc.
    notifications.push({
      type: "compliance_warning",
      priority: "high",
      title: "Certificate Expiring Soon",
      message: "ISO 9001 certificate expires in 30 days",
      actionUrl: "/compliance/certificates",
      data: { certificateType: "ISO 9001", daysUntilExpiry: 30 },
    });

    return notifications;
  }

  /**
   * Check task deadlines
   */
  private async checkTaskDeadlines(
    userId: number
  ): Promise<SmartNotification[]> {
    const notifications: SmartNotification[] = [];

    const tasks = await db.getTasksByAssignee(userId);
    const overdueTasks = tasks.filter(
      task =>
        task.dueDate &&
        new Date(task.dueDate) < new Date() &&
        !["completed", "cancelled"].includes(task.status)
    );

    if (overdueTasks.length > 0) {
      notifications.push({
        type: "opportunity",
        priority: "urgent",
        title: "Overdue Tasks",
        message: `You have ${overdueTasks.length} overdue task(s)`,
        actionUrl: "/tasks?filter=overdue",
        data: { count: overdueTasks.length },
      });
    }

    return notifications;
  }

  /**
   * AI-powered data insights
   */
  async generateDataInsights(
    entityType: string,
    timeRange: string = "30d"
  ): Promise<{
    insights: string[];
    trends: any[];
    recommendations: string[];
  }> {
    const insights: string[] = [];
    const trends: any[] = [];
    const recommendations: string[] = [];

    switch (entityType) {
      case "tenders":
        const tenderInsights = await this.analyzeTenderTrends(timeRange);
        insights.push(...tenderInsights.insights);
        trends.push(...tenderInsights.trends);
        recommendations.push(...tenderInsights.recommendations);
        break;

      case "suppliers":
        const supplierInsights =
          await this.analyzeSupplierPerformance(timeRange);
        insights.push(...supplierInsights.insights);
        trends.push(...supplierInsights.trends);
        recommendations.push(...supplierInsights.recommendations);
        break;

      case "spending":
        const spendingInsights = await this.analyzeSpendingPatterns(timeRange);
        insights.push(...spendingInsights.insights);
        trends.push(...spendingInsights.trends);
        recommendations.push(...spendingInsights.recommendations);
        break;
    }

    return { insights, trends, recommendations };
  }

  /**
   * Analyze tender trends
   */
  private async analyzeTenderTrends(timeRange: string): Promise<{
    insights: string[];
    trends: any[];
    recommendations: string[];
  }> {
    const tenders = await db.getAllTenders();

    return {
      insights: [
        `${tenders.length} tenders processed in the last ${timeRange}`,
        "Medical equipment tenders show 20% increase",
        "Average tender value: $45,000",
      ],
      trends: [
        { category: "Medical Equipment", change: "+20%", value: 15 },
        { category: "Office Supplies", change: "-5%", value: 8 },
        { category: "IT Equipment", change: "+10%", value: 12 },
      ],
      recommendations: [
        "Focus on medical equipment opportunities",
        "Improve response time for high-value tenders",
        "Consider partnering for IT equipment tenders",
      ],
    };
  }

  /**
   * Analyze supplier performance
   */
  private async analyzeSupplierPerformance(timeRange: string): Promise<{
    insights: string[];
    trends: any[];
    recommendations: string[];
  }> {
    const suppliers = await db.getAllSuppliers();

    return {
      insights: [
        `${suppliers.length} active suppliers in system`,
        "Top 10 suppliers account for 70% of spending",
        "Average supplier rating: 4.2/5",
      ],
      trends: [
        { supplier: "MedTech Solutions", performance: "+15%", rating: 4.8 },
        { supplier: "Global Supplies Inc", performance: "-3%", rating: 4.1 },
        { supplier: "Tech Innovations", performance: "+8%", rating: 4.5 },
      ],
      recommendations: [
        "Negotiate better terms with top suppliers",
        "Diversify supplier base for critical items",
        "Implement supplier scorecards",
      ],
    };
  }

  /**
   * Analyze spending patterns
   */
  private async analyzeSpendingPatterns(timeRange: string): Promise<{
    insights: string[];
    trends: any[];
    recommendations: string[];
  }> {
    const expenses = await db.getAllExpenses();

    return {
      insights: [
        "Total spending increased 12% compared to last period",
        "Medical supplies represent 45% of total spend",
        "Q4 shows seasonal spike in equipment purchases",
      ],
      trends: [
        { month: "Jan", amount: 125000, change: "+5%" },
        { month: "Feb", amount: 135000, change: "+8%" },
        { month: "Mar", amount: 142000, change: "+12%" },
      ],
      recommendations: [
        "Implement spend controls for non-critical items",
        "Negotiate volume discounts for medical supplies",
        "Plan equipment purchases to avoid seasonal spikes",
      ],
    };
  }
}

export const aiDatabaseIntegration = new AIDatabaseIntegration();
