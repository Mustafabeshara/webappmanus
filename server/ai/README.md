# AI Service Documentation

## Overview

The AI Service provides intelligent document extraction, analysis, forecasting, and business insights using multiple LLM providers with automatic fallback, rate limiting, circuit breakers, and caching.

## Architecture

### Multi-Provider Fallback Chain

The service supports multiple AI providers with automatic fallback:

1. **Groq** - Fast, free tier available (Llama 3.3 70B)
2. **Gemini** - Google's AI with vision capabilities (Gemini 1.5 Flash)
3. **OpenAI** - Premium option (GPT-4o-mini)

Each provider has its strengths:
- Groq: Fastest response times, good for quick analyses
- Gemini: Best for document processing and Arabic text
- OpenAI: Most reliable, best for complex reasoning

### Key Features

#### 1. Security
- **SSRF Protection**: Validates URLs to prevent Server-Side Request Forgery
  - Blocks private IPs and localhost
  - Blocks cloud metadata endpoints (AWS, GCP, Azure)
  - Only allows HTTPS protocols
- **Input Validation**: All inputs are validated and sanitized
  - Maximum document size: 100KB
  - Maximum prompt length: 10KB
  - Removes control characters
- **Rate Limiting**: Built-in rate limiting per provider
  - Per-minute limits
  - Per-day limits
- **Secure Error Handling**: No sensitive data in error messages

#### 2. Performance
- **LRU Cache**: Intelligent caching with automatic eviction
  - Maximum cache size: 1000 entries
  - Hash-based cache keys for efficiency
  - TTL-based expiration (default: 1 hour)
- **Circuit Breakers**: Prevents cascading failures
  - Automatic provider recovery
  - Failure threshold monitoring
- **Request Timeouts**: 30-second timeout per API call
- **Retry Logic**: Configurable retry attempts with exponential backoff

#### 3. Reliability
- **Structured Logging**: Comprehensive request/response logging
- **Health Monitoring**: Circuit breaker statistics and cache metrics
- **Graceful Degradation**: Automatic fallback between providers

## Core Functions

### Document Extraction

#### `extractTenderData(documentText: string): Promise<ExtractionResult>`
Extracts tender information from RFP/tender documents.

**Extracted Fields:**
- Reference number, title, description
- Dates (publish, submission deadline, evaluation)
- Requirements, terms, estimated value
- Line items with quantities and specifications

**Example:**
```typescript
import { extractTenderData } from './server/aiService';

const result = await extractTenderData(documentText);
if (result.success) {
  console.log('Tender:', result.data.title);
  console.log('Deadline:', result.data.submissionDeadline);
  console.log('Confidence:', result.confidence);
}
```

#### `extractInvoiceData(documentText: string): Promise<ExtractionResult>`
Extracts detailed invoice information including line items.

**Extracted Fields:**
- Invoice number, dates, amounts (in cents)
- Supplier and customer information
- Tax details, payment terms
- Line items with SKU, quantities, prices

#### `extractPriceListData(documentText: string): Promise<ExtractionResult>`
Extracts product pricing from supplier price lists.

**Extracted Fields:**
- Supplier name, price list version, dates
- Currency, payment terms, delivery terms
- Products with SKU, prices, bulk pricing

#### `extractCatalogData(documentText: string): Promise<ExtractionResult>`
Extracts detailed product information from catalogs.

**Extracted Fields:**
- Product specifications, features, applications
- Certifications, warranty information
- Dimensions, weight, lead times

### Certificate & Compliance Extraction

- `extractSupplierData()` - Commercial registration info
- `extractVATCertificateData()` - VAT registration
- `extractZakatCertificateData()` - Zakat compliance
- `extractGOSICertificateData()` - Social insurance
- `extractFDACertificateData()` - FDA 510(k) clearance
- `extractCECertificateData()` - CE marking certification
- `extractISOCertificateData()` - ISO certifications
- `extractSFDACertificateData()` - Saudi FDA registration

### Business Intelligence

#### `generateForecast(historicalData, type): Promise<ForecastPoint[]>`
Generates 6-month forecasts based on historical data.

**Example:**
```typescript
const forecast = await generateForecast(
  [
    { period: '2024-01', value: 50000 },
    { period: '2024-02', value: 55000 },
    { period: '2024-03', value: 52000 },
  ],
  'sales'
);
```

#### `detectAnomalies(data, context): Promise<AnomalyFinding[]>`
Detects unusual patterns and outliers in business data.

**Example:**
```typescript
const anomalies = await detectAnomalies(
  expenseRecords,
  'Monthly expense analysis for Q4 2024'
);

anomalies.forEach(anomaly => {
  console.log(`${anomaly.severity}: ${anomaly.description}`);
});
```

#### `analyzeTenderWinRate(tenderHistory): Promise<TenderWinRateAnalysis>`
Analyzes tender performance and provides pricing recommendations.

### OCR

#### `performOCR(imageUrl: string): Promise<OCRResult>`
Extracts text from images with multiple fallback options.

**Providers:**
1. OCR.space API (if API key configured)
2. LLM vision capabilities (Gemini/OpenAI)

**Security:** Full SSRF protection with URL validation

## Configuration

### Environment Variables

```bash
# AI Provider API Keys (at least one required)
GROQ_API_KEY=your_groq_key_here
GEMINI_API_KEY=your_gemini_key_here
OPENAI_API_KEY=your_openai_key_here

# Optional OCR
OCR_SPACE_API_KEY=your_ocr_space_key_here
```

### Caching Configuration

Located in `server/ai/config.ts`:

```typescript
export const AI_CONFIG = {
  defaultTimeout: 30000,      // 30 seconds
  retryAttempts: 2,            // Retry failed requests twice
  retryDelay: 1000,            // 1 second base delay
  cacheEnabled: true,          // Enable response caching
  cacheTTL: 3600,              // Cache for 1 hour
};
```

### Rate Limits

Default rate limits per provider:

| Provider | Per Minute | Per Day |
|----------|-----------|---------|
| Groq     | 30        | 14,400  |
| Gemini   | 60        | 1,500   |
| OpenAI   | 60        | 10,000  |

## Usage Examples

### Basic Document Extraction

```typescript
import { extractInvoiceData, extractTenderData } from './server/aiService';

// Extract invoice
const invoice = await extractInvoiceData(invoiceText);
if (invoice.success) {
  console.log('Total:', invoice.data.totalAmount / 100, 'SAR');
  console.log('Items:', invoice.data.items?.length);
}

// Extract tender
const tender = await extractTenderData(tenderText);
if (tender.success && tender.confidence.title > 0.8) {
  // High confidence extraction
  saveTenderToDatabase(tender.data);
}
```

### Using AI Service Directly

```typescript
import { complete } from './server/ai/service';

const response = await complete({
  prompt: 'Analyze this expense report...',
  systemPrompt: 'You are a financial analyst...',
  taskType: 'analysis',
  maxTokens: 1000,
  temperature: 0.3,
});

if (response.success) {
  console.log('Analysis:', response.content);
  console.log('Provider:', response.provider);
  console.log('Tokens used:', response.usage?.totalTokens);
}
```

### Cache Management

```typescript
import { clearExpiredCache, getCacheStats } from './server/ai/service';

// Get cache statistics
const stats = getCacheStats();
console.log('Cache size:', stats.size);
console.log('Cache hit rate:', stats.hitRate);

// Clear expired entries
const cleared = clearExpiredCache();
console.log('Cleared', cleared, 'expired entries');
```

### Circuit Breaker Monitoring

```typescript
import { getCircuitBreakerStats, getAIStatus } from './server/ai/service';

// Check overall AI service health
const status = getAIStatus();
console.log('Configured providers:', status.configured);

// Check individual provider status
status.providers.forEach(p => {
  console.log(`${p.name}:`, p.circuitBreaker.state);
});
```

## Error Handling

All functions return structured error information:

```typescript
const result = await extractInvoiceData(documentText);

if (!result.success) {
  console.error('Extraction failed');
  console.error('Errors:', result.errors);
  console.error('Provider attempted:', result.provider);
}
```

Common error scenarios:
- **Input validation failed**: Invalid or oversized input
- **Rate limited**: All providers exhausted
- **Circuit breaker open**: Provider temporarily unavailable
- **All providers failed**: Check API keys and network connectivity

## Best Practices

### 1. Input Validation
Always validate inputs before sending to AI service:

```typescript
// Good
const cleanText = documentText.trim().substring(0, 100000);
const result = await extractInvoiceData(cleanText);

// Bad - may be rejected
const result = await extractInvoiceData(hugeDocument);
```

### 2. Confidence Scores
Use confidence scores to determine data quality:

```typescript
const result = await extractTenderData(text);

if (result.confidence.title > 0.9) {
  // High confidence - auto-process
  autoProcessTender(result.data);
} else if (result.confidence.title > 0.6) {
  // Medium confidence - review required
  flagForReview(result.data);
} else {
  // Low confidence - manual entry
  requestManualEntry();
}
```

### 3. Error Recovery
Implement proper error handling:

```typescript
try {
  const result = await extractInvoiceData(text);
  
  if (!result.success && result.errors?.includes('Rate limited')) {
    // Wait and retry later
    await delay(60000);
    return retryExtraction(text);
  }
} catch (error) {
  // Handle unexpected errors
  logError(error);
  notifyAdministrator();
}
```

### 4. Caching Strategy
For repeated analyses, rely on caching:

```typescript
// Same prompt will be cached
const analysis1 = await complete({
  prompt: 'Analyze Q4 2024 expenses',
  taskType: 'analysis',
});

// Returns cached result (instant)
const analysis2 = await complete({
  prompt: 'Analyze Q4 2024 expenses',
  taskType: 'analysis',
});
```

## Security Considerations

### 1. URL Validation
All image URLs are validated to prevent SSRF:

```typescript
// Safe
await performOCR('https://example.com/invoice.jpg');

// Blocked
await performOCR('http://localhost/internal'); // HTTP blocked
await performOCR('https://169.254.169.254/'); // AWS metadata blocked
await performOCR('https://internal.local/'); // Internal domain blocked
```

### 2. Input Sanitization
All text inputs are sanitized:
- Control characters removed
- Length limits enforced
- Type validation performed

### 3. API Key Security
Never expose API keys in:
- Client-side code
- Error messages
- Logs
- Version control

## Monitoring & Observability

### Structured Logging

All AI requests are logged with:
- Provider and model used
- Request latency
- Token usage
- Success/failure status
- Cache hits
- Circuit breaker state

### Metrics to Monitor

1. **Request Volume**: Requests per provider per minute
2. **Error Rate**: Failed requests / total requests
3. **Cache Hit Rate**: Cached responses / total requests
4. **Average Latency**: Response time per provider
5. **Token Usage**: Daily token consumption
6. **Circuit Breaker State**: Provider availability

## Troubleshooting

### Issue: All providers failing

**Solution:**
1. Check API keys are configured
2. Verify network connectivity
3. Check rate limits
4. Review circuit breaker states

### Issue: Slow performance

**Solution:**
1. Enable caching if disabled
2. Reduce max_tokens parameter
3. Use faster models (Groq)
4. Optimize prompt length

### Issue: Low extraction accuracy

**Solution:**
1. Improve document quality (OCR)
2. Use vision-capable models (Gemini/OpenAI)
3. Adjust confidence thresholds
4. Add domain-specific context to prompts

### Issue: Memory usage growing

**Solution:**
1. Call `clearExpiredCache()` periodically
2. Reduce cache TTL
3. Lower MAX_CACHE_SIZE constant

## Testing

Example test cases:

```typescript
import { extractInvoiceData } from './server/aiService';

describe('Invoice Extraction', () => {
  it('should extract invoice data', async () => {
    const result = await extractInvoiceData(sampleInvoice);
    expect(result.success).toBe(true);
    expect(result.data.invoiceNumber).toBeDefined();
    expect(result.confidence.invoiceNumber).toBeGreaterThan(0.7);
  });

  it('should handle invalid input', async () => {
    const result = await extractInvoiceData('');
    expect(result.success).toBe(false);
    expect(result.errors).toContain('Invalid document text input');
  });
});
```

## Performance Benchmarks

Typical latencies (with warm cache):

| Operation | Average Time | Cached Time |
|-----------|--------------|-------------|
| Invoice Extraction | 2-4 seconds | <10ms |
| Tender Analysis | 3-6 seconds | <10ms |
| Price List Parsing | 2-5 seconds | <10ms |
| Forecast Generation | 2-4 seconds | <10ms |

## Roadmap

Future enhancements:

- [ ] Batch processing API
- [ ] Streaming responses
- [ ] Fine-tuned models for specific document types
- [ ] Multi-language support enhancement
- [ ] Advanced prompt engineering templates
- [ ] Structured output validation with Zod schemas
- [ ] GraphQL API endpoint
- [ ] Real-time analytics dashboard

## Support

For issues or questions:
1. Check this documentation
2. Review error logs
3. Verify API keys and configuration
4. Contact system administrator
