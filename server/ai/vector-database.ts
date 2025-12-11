/**
 * Vector Database Integration for Semantic Search
 *
 * This module provides vector embeddings storage and similarity search
 * for products, tenders, suppliers, and documents.
 */

import { complete } from './service';

// Vector embedding type
export interface VectorEmbedding {
  id: string;
  entityType: 'product' | 'tender' | 'supplier' | 'document';
  entityId: number;
  vector: number[];
  text: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Search result with similarity score
export interface SimilarityResult {
  entityType: string;
  entityId: number;
  text: string;
  similarity: number;
  metadata: Record<string, any>;
}

// In-memory vector store (would use Pinecone/Weaviate/Qdrant in production)
class VectorStore {
  private embeddings: Map<string, VectorEmbedding> = new Map();
  private embeddingDimension = 384; // Typical for small models

  /**
   * Generate embedding using AI service
   * Falls back to simple TF-IDF style embedding if AI unavailable
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Try using AI for semantic embedding
      const response = await complete({
        prompt: `Generate a semantic embedding representation for the following text.
Return only a comma-separated list of 20 numbers between -1 and 1 representing key semantic dimensions:
categories, features, quality, price-range, medical-use, technical-complexity, size, durability,
brand-strength, popularity, innovation, compliance, reliability, efficiency, versatility,
safety, precision, portability, connectivity, sustainability.

Text: "${text.substring(0, 500)}"

Numbers only, comma-separated:`,
        maxTokens: 100,
        temperature: 0.1,
        taskType: 'fast_analysis',
      });

      if (response.success && response.content) {
        const numbers = response.content
          .split(',')
          .map(n => parseFloat(n.trim()))
          .filter(n => !isNaN(n))
          .slice(0, 20);

        if (numbers.length >= 10) {
          // Pad to consistent dimension
          while (numbers.length < this.embeddingDimension) {
            numbers.push(0);
          }
          return this.normalizeVector(numbers.slice(0, this.embeddingDimension));
        }
      }
    } catch (error) {
      console.log('[Vector] AI embedding failed, using fallback');
    }

    // Fallback: Simple TF-IDF style embedding
    return this.generateSimpleEmbedding(text);
  }

  /**
   * Simple embedding based on word frequencies and categories
   */
  private generateSimpleEmbedding(text: string): number[] {
    const vector: number[] = new Array(this.embeddingDimension).fill(0);
    const words = text.toLowerCase().split(/\s+/);

    // Category detection
    const categories: Record<string, string[]> = {
      medical: ['medical', 'healthcare', 'clinical', 'hospital', 'patient', 'diagnostic', 'treatment'],
      equipment: ['equipment', 'device', 'machine', 'apparatus', 'instrument', 'tool', 'system'],
      surgical: ['surgical', 'surgery', 'operation', 'procedure', 'sterile', 'operating'],
      monitor: ['monitor', 'display', 'screen', 'tracking', 'vital', 'signal'],
      laboratory: ['laboratory', 'lab', 'testing', 'analysis', 'sample', 'reagent'],
      imaging: ['imaging', 'xray', 'mri', 'ct', 'ultrasound', 'scan', 'radiology'],
      cardiac: ['cardiac', 'heart', 'cardiovascular', 'ecg', 'ekg', 'defibrillator'],
      respiratory: ['respiratory', 'ventilator', 'oxygen', 'breathing', 'pulmonary'],
      orthopedic: ['orthopedic', 'bone', 'joint', 'implant', 'prosthetic'],
      dental: ['dental', 'tooth', 'oral', 'dentistry'],
    };

    // Calculate category scores
    let dimIndex = 0;
    for (const [category, keywords] of Object.entries(categories)) {
      const matches = words.filter(w => keywords.some(k => w.includes(k))).length;
      vector[dimIndex] = Math.min(matches / 5, 1);
      dimIndex++;
    }

    // Add word length features
    vector[dimIndex++] = Math.min(words.length / 100, 1);
    vector[dimIndex++] = Math.min(text.length / 1000, 1);

    // Character distribution
    const chars = text.toLowerCase();
    vector[dimIndex++] = (chars.match(/[0-9]/g) || []).length / Math.max(chars.length, 1);
    vector[dimIndex++] = (chars.match(/[a-z]/g) || []).length / Math.max(chars.length, 1);

    // Add hash-based features for remaining dimensions
    for (let i = dimIndex; i < this.embeddingDimension; i++) {
      const hash = this.simpleHash(text + i.toString());
      vector[i] = (hash % 1000) / 1000 - 0.5;
    }

    return this.normalizeVector(vector);
  }

  /**
   * Simple string hash function
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Normalize vector to unit length
   */
  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude === 0) return vector;
    return vector.map(v => v / magnitude);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Store an embedding
   */
  async upsert(
    entityType: VectorEmbedding['entityType'],
    entityId: number,
    text: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const id = `${entityType}-${entityId}`;
    const vector = await this.generateEmbedding(text);

    const embedding: VectorEmbedding = {
      id,
      entityType,
      entityId,
      vector,
      text,
      metadata,
      createdAt: this.embeddings.get(id)?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    this.embeddings.set(id, embedding);
  }

  /**
   * Search for similar entities
   */
  async search(
    query: string,
    options: {
      entityTypes?: VectorEmbedding['entityType'][];
      limit?: number;
      minSimilarity?: number;
    } = {}
  ): Promise<SimilarityResult[]> {
    const { entityTypes, limit = 10, minSimilarity = 0.3 } = options;
    const queryVector = await this.generateEmbedding(query);

    const results: SimilarityResult[] = [];

    for (const embedding of this.embeddings.values()) {
      // Filter by entity type if specified
      if (entityTypes && !entityTypes.includes(embedding.entityType)) {
        continue;
      }

      const similarity = this.cosineSimilarity(queryVector, embedding.vector);

      if (similarity >= minSimilarity) {
        results.push({
          entityType: embedding.entityType,
          entityId: embedding.entityId,
          text: embedding.text,
          similarity,
          metadata: embedding.metadata,
        });
      }
    }

    // Sort by similarity descending
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, limit);
  }

  /**
   * Delete an embedding
   */
  delete(entityType: VectorEmbedding['entityType'], entityId: number): boolean {
    const id = `${entityType}-${entityId}`;
    return this.embeddings.delete(id);
  }

  /**
   * Get statistics about the vector store
   */
  getStats(): {
    totalEmbeddings: number;
    byType: Record<string, number>;
  } {
    const byType: Record<string, number> = {};

    for (const embedding of this.embeddings.values()) {
      byType[embedding.entityType] = (byType[embedding.entityType] || 0) + 1;
    }

    return {
      totalEmbeddings: this.embeddings.size,
      byType,
    };
  }

  /**
   * Clear all embeddings
   */
  clear(): void {
    this.embeddings.clear();
  }
}

// Singleton instance
export const vectorStore = new VectorStore();

/**
 * Index a product for semantic search
 */
export async function indexProduct(product: {
  id: number;
  name: string;
  description?: string;
  category?: string;
  sku?: string;
  specifications?: Record<string, any>;
}): Promise<void> {
  const text = [
    product.name,
    product.description,
    product.category,
    product.sku,
    product.specifications ? JSON.stringify(product.specifications) : '',
  ].filter(Boolean).join(' ');

  await vectorStore.upsert('product', product.id, text, {
    name: product.name,
    category: product.category,
    sku: product.sku,
  });
}

/**
 * Index a tender for semantic search
 */
export async function indexTender(tender: {
  id: number;
  title: string;
  description?: string;
  department?: string;
  referenceNumber?: string;
  requirements?: string[];
}): Promise<void> {
  const text = [
    tender.title,
    tender.description,
    tender.department,
    tender.referenceNumber,
    tender.requirements?.join(' '),
  ].filter(Boolean).join(' ');

  await vectorStore.upsert('tender', tender.id, text, {
    title: tender.title,
    department: tender.department,
    referenceNumber: tender.referenceNumber,
  });
}

/**
 * Index a supplier for semantic search
 */
export async function indexSupplier(supplier: {
  id: number;
  name: string;
  description?: string;
  categories?: string[];
  contactPerson?: string;
}): Promise<void> {
  const text = [
    supplier.name,
    supplier.description,
    supplier.categories?.join(' '),
    supplier.contactPerson,
  ].filter(Boolean).join(' ');

  await vectorStore.upsert('supplier', supplier.id, text, {
    name: supplier.name,
    categories: supplier.categories,
  });
}

/**
 * Index a document for semantic search
 */
export async function indexDocument(document: {
  id: number;
  title: string;
  content?: string;
  type?: string;
  tags?: string[];
}): Promise<void> {
  const text = [
    document.title,
    document.content?.substring(0, 5000), // Limit content length
    document.type,
    document.tags?.join(' '),
  ].filter(Boolean).join(' ');

  await vectorStore.upsert('document', document.id, text, {
    title: document.title,
    type: document.type,
    tags: document.tags,
  });
}

/**
 * Semantic search across all entity types
 */
export async function semanticSearch(
  query: string,
  options?: {
    entityTypes?: ('product' | 'tender' | 'supplier' | 'document')[];
    limit?: number;
    minSimilarity?: number;
  }
): Promise<SimilarityResult[]> {
  return vectorStore.search(query, options);
}

/**
 * Find similar products
 */
export async function findSimilarProducts(
  productId: number,
  limit: number = 5
): Promise<SimilarityResult[]> {
  const embedding = vectorStore['embeddings'].get(`product-${productId}`);
  if (!embedding) return [];

  const results = await vectorStore.search(embedding.text, {
    entityTypes: ['product'],
    limit: limit + 1, // Include self
    minSimilarity: 0.5,
  });

  // Remove the source product
  return results.filter(r => r.entityId !== productId).slice(0, limit);
}

/**
 * Match products to tender requirements
 */
export async function matchProductsToTender(
  tenderId: number,
  limit: number = 10
): Promise<SimilarityResult[]> {
  const tenderEmbedding = vectorStore['embeddings'].get(`tender-${tenderId}`);
  if (!tenderEmbedding) return [];

  return vectorStore.search(tenderEmbedding.text, {
    entityTypes: ['product'],
    limit,
    minSimilarity: 0.4,
  });
}
