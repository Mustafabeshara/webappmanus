/**
 * Module Interconnection Architecture
 * Defines how different modules connect and share data intelligently
 */

import * as db from "../db";
import { aiDocumentProcessor } from "./ai-document-processor";
import { aiTenderIntelligence } from "./ai-tender-intelligence";

export interface ModuleConnection {
  sourceModule: string;
  targetModule: string;
  connectionType: 'data_flow' | 'notification' | 'trigger' | 'sync';
  dataMapping: DataMapping[];
  conditions?: ConnectionCondition[];
}

export interface DataMapping {
  sourceField: string;
  targetField: string;
  transformation?: string;
  validation?: string;
}

export interface ConnectionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'contains';
  value: any;
}

export interface ModuleEvent {
  module: string;
  event: string;
  data: any;
  timestamp: Date;
  userId?: number;
}

class ModuleInterconnectionManager {
  private connections: Map<string, ModuleConnection[]> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.initializeConnections();
    this.setupEventHandlers();
  }

  /**
   * Initialize module connections
   */
  private initializeConnections(): void {
    // Supplier → Product Catalog Connection
    this.addConnection({
      sourceModule: 'supplier',
      targetModule: 'product_catalog',
      connectionType: 'data_flow',
      dataMapping: [
        { sourceField: 'catalog_document', targetField: 'product_data' },
        { sourceField: 'supplier_id', targetField: 'supplier_id' },
        { sourceField: 'price_list', targetField: 'pricing_data' }
      ]
    });

    // Product Catalog → Tender Matching Connection
    this.addConnection({
      sourceModule: 'product_catalog',
      targetModule: 'tender_matching',
      connectionType: 'trigger',
      dataMapping: [
        { sourceField: 'product_specs', targetField: 'matching_criteria' },
        { sourceField: 'availability', targetField: 'delivery_capability' }
      ],
      conditions: [
        { field: 'status', operator: 'equals', value: 'active' }
      ]
    });

    // Tender → Notification Connection
    this.addConnection({
      sourceModule: 'tender',
      targetModule: 'notification',
      connectionType: 'notification',
      dataMapping: [
        { sourceField: 'tender_id', targetField: 'reference_id' },
        { sourceField: 'match_score', targetField: 'priority_score' }
      ],
      conditions: [
        { field: 'match_score', operator: 'greater_than', value: 0.7 }
      ]
    });

    // Invoice → Financial Analytics Connection
    this.addConnection({
      sourceModule: 'invoice',
      targetModule: 'financial_analytics',
      connectionType: 'sync',
      dataMapping: [
        { sourceField: 'total_amount', targetField: 'expense_amount' },
        { sourceField: 'supplier_id', targetField: 'vendor_id' },
        { sourceField: 'line_items', targetField: 'expense_categories' }
      ]
    });

    // Document Upload → AI Processing Connection
    this.addConnection({
      sourceModule: 'document_upload',
      targetModule: 'ai_processing',
      connectionType: 'trigger',
      dataMapping: [
        { sourceField: 'document_id', targetField: 'processing_queue' },
        { sourceField: 'document_type', targetField: 'template_selection' }
      ]
    });
  }

  /**
   * Setup event handlers for module interactions
   */
  private setupEventHandlers(): void {
    // Document processed → Auto-populate fields
    this.addEventListener('document_processed', async (event: ModuleEvent) => {
      await this.handleDocumentProcessed(event);
    });

    // Product catalog updated → Trigger tender matching
    this.addEventListener('catalog_updated', async (event: ModuleEvent) => {
      await this.handleCatalogUpdated(event);
    });

    // Tender published → Find matching suppliers
    this.addEventListener('tender_published', async (event: ModuleEvent) => {
      await this.handleTenderPublished(event);
    });

    // Price list updated → Update product pricing
    this.addEventListener('price_list_updated', async (event: ModuleEvent) => {
      await this.handlePriceListUpdated(event);
    });

    // Invoice processed → Update supplier performance
    this.addEventListener('invoice_processed', async (event: ModuleEvent) => {
      await this.handleInvoiceProcessed(event);
    });
  }

  /**
   * Add module connection
   */
  private addConnection(connection: ModuleConnection): void {
    const key = `${connection.sourceModule}-${connection.targetModule}`;
    if (!this.connections.has(key)) {
      this.connections.set(key, []);
    }
    this.connections.get(key)!.push(connection);
  }

  /**
   * Add event listener
   */
  private addEventListener(event: string, handler: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(handler);
  }

  /**
   * Emit module event
   */
  async emitEvent(event: ModuleEvent): Promise<void> {
    const handlers = this.eventListeners.get(event.event) || [];

    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`[Module] Event handler failed for ${event.event}:`, error);
      }
    }
  }

  /**
   * Handle document processed event
   */
  private async handleDocumentProcessed(event: ModuleEvent): Promise<void> {
    const { documentId, extractedData, documentType } = event.data;

    try {
      // Auto-populate related entity fields
      await aiDocumentProcessor.autoPopulateFields(documentId, extractedData);

      // Trigger specific workflows based on document type
      switch (documentType) {
        case 'catalog':
          await this.processCatalogDocument(documentId, extractedData);
          break;
        case 'price_list':
          await this.processPriceListDocument(documentId, extractedData);
          break;
        case 'invoice':
          await this.processInvoiceDocument(documentId, extractedData);
          break;
        case 'tender':
          await this.processTenderDocument(documentId, extractedData);
          break;
      }
    } catch (error) {
      console.error('[Module] Document processing failed:', error);
    }
  }

  /**
   * Process catalog document
   */
  private async processCatalogDocument(documentId: number, extractedData: any): Promise<void> {
    // Extract products from catalog
    if (extractedData.products?.value) {
      const products = this.parseProductTable(extractedData.products.value);

      for (const product of products) {
        // Create or update product in database
        await this.createOrUpdateProduct(product, extractedData.supplierName?.value);
      }

      // Emit catalog updated event
      await this.emitEvent({
        module: 'product_catalog',
        event: 'catalog_updated',
        data: { documentId, productCount: products.length },
        timestamp: new Date()
      });
    }
  }

  /**
   * Process price list document
   */
  private async processPriceListDocument(documentId: number, extractedData: any): Promise<void> {
    if (extractedData.products?.value) {
      const priceData = this.parsePriceTable(extractedData.products.value);

      // Update product prices
      for (const item of priceData) {
        await this.updateProductPrice(item);
      }

      // Emit price list updated event
      await this.emitEvent({
        module: 'pricing',
        event: 'price_list_updated',
        data: { documentId, updatedItems: priceData.length },
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle catalog updated event
   */
  private async handleCatalogUpdated(event: ModuleEvent): Promise<void> {
    const { documentId } = event.data;

    try {
      // Get supplier from document
      const document = await db.getDocumentById(documentId);
      if (!document || document.entityType !== 'supplier') return;

      // Trigger tender matching for this supplier
      const matchingRequest = {
        supplierId: document.entityId,
        matchingCriteria: {
          specificationWeight: 0.4,
          priceWeight: 0.3,
          deliveryWeight: 0.1,
          complianceWeight: 0.2,
          minimumMatchScore: 0.5
        }
      };

      const matches = await aiTenderIntelligence.findMatchingTenders(matchingRequest);

      // Create notifications for high-value matches
      for (const match of matches.filter(m => m.matchScore > 0.8)) {
        await this.createTenderMatchNotification(document.entityId, match);
      }
    } catch (error) {
      console.error('[Module] Catalog update handling failed:', error);
    }
  }

  /**
   * Handle tender published event
   */
  private async handleTenderPublished(event: ModuleEvent): Promise<void> {
    const { tenderId } = event.data;

    try {
      // Find all suppliers that might match this tender
      const suppliers = await db.getAllSuppliers();

      for (const supplier of suppliers) {
        const matchingRequest = {
          tenderId,
          supplierId: supplier.id,
          matchingCriteria: {
            specificationWeight: 0.4,
            priceWeight: 0.3,
            deliveryWeight: 0.1,
            complianceWeight: 0.2,
            minimumMatchScore: 0.6
          }
        };

        const matches = await aiTenderIntelligence.findMatchingTenders(matchingRequest);

        if (matches.length > 0 && matches[0].matchScore > 0.7) {
          await this.createTenderOpportunityNotification(supplier.id, matches[0]);
        }
      }
    } catch (error) {
      console.error('[Module] Tender published handling failed:', error);
    }
  }

  /**
   * Handle price list updated event
   */
  private async handlePriceListUpdated(event: ModuleEvent): Promise<void> {
    const { documentId, updatedItems } = event.data;

    try {
      // Analyze price changes and create alerts
      const priceChanges = await this.analyzePriceChanges(documentId);

      if (priceChanges.significantChanges.length > 0) {
        await this.createPriceChangeNotifications(priceChanges);
      }

      // Update budget forecasts if significant changes
      if (priceChanges.averageChange > 0.1) { // 10% change
        await this.updateBudgetForecasts(priceChanges);
      }
    } catch (error) {
      console.error('[Module] Price list update handling failed:', error);
    }
  }

  /**
   * Handle invoice processed event
   */
  private async handleInvoiceProcessed(event: ModuleEvent): Promise<void> {
    const { invoiceId, extractedData } = event.data;

    try {
      // Update supplier performance metrics
      if (extractedData.supplierName?.value) {
        await this.updateSupplierPerformance(extractedData.supplierName.value, extractedData);
      }

      // Update spending analytics
      await this.updateSpendingAnalytics(extractedData);

      // Check for budget alerts
      await this.checkBudgetAlerts(extractedData);
    } catch (error) {
      console.error('[Module] Invoice processing handling failed:', error);
    }
  }

  /**
   * Parse product table from extracted data
   */
  private parseProductTable(tableData: any): any[] {
    // Implementation to parse product table
    // This would handle various table formats and extract product information
    return [];
  }

  /**
   * Parse price table from extracted data
   */
  private parsePriceTable(tableData: any): any[] {
    // Implementation to parse price table
    return [];
  }

  /**
   * Create or update product
   */
  private async createOrUpdateProduct(productData: any, supplierName?: string): Promise<void> {
    // Implementation to create or update product in database
  }

  /**
   * Update product price
   */
  private async updateProductPrice(priceData: any): Promise<void> {
    // Implementation to update product pricing
  }

  /**
   * Create tender match notification
   */
  private async createTenderMatchNotification(supplierId: number, match: any): Promise<void> {
    // Implementation to create notification
  }

  /**
   * Create tender opportunity notification
   */
  private async createTenderOpportunityNotification(supplierId: number, match: any): Promise<void> {
    // Implementation to create opportunity notification
  }

  /**
   * Analyze price changes
   */
  private async analyzePriceChanges(documentId: number): Promise<{
    significantChanges: any[];
    averageChange: number;
  }> {
    // Implementation to analyze price changes
    return { significantChanges: [], averageChange: 0 };
  }

  /**
   * Create price change notifications
   */
  private async createPriceChangeNotifications(priceChanges: any): Promise<void> {
    // Implementation to create price change notifications
  }

  /**
   * Update budget forecasts
   */
  private async updateBudgetForecasts(priceChanges: any): Promise<void> {
    // Implementation to update budget forecasts
  }

  /**
   * Update supplier performance
   */
  private async updateSupplierPerformance(supplierName: string, invoiceData: any): Promise<void> {
    // Implementation to update supplier performance metrics
  }

  /**
   * Update spending analytics
   */
  private async updateSpendingAnalytics(invoiceData: any): Promise<void> {
    // Implementation to update spending analytics
  }

  /**
   * Check budget alerts
   */
  private async checkBudgetAlerts(invoiceData: any): Promise<void> {
    // Implementation to check and create budget alerts
  }
}

export const moduleInterconnectionManager = new ModuleInterconnectionManager();
