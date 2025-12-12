/**
 * Structured Logging for AI Metrics
 *
 * Provides consistent, structured logging for AI service operations
 * to enable monitoring, alerting, and analytics.
 */

export interface AIMetrics {
  requestId: string;
  timestamp: string;
  provider: string;
  model: string;
  taskType?: string;
  latencyMs: number;
  success: boolean;
  error?: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cached: boolean;
  circuitBreakerState?: string;
  retryCount?: number;
}

export interface AIRequestLog {
  type: "ai_request";
  metrics: AIMetrics;
}

export interface AIErrorLog {
  type: "ai_error";
  requestId: string;
  timestamp: string;
  provider: string;
  error: string;
  errorType: "rate_limit" | "timeout" | "api_error" | "circuit_breaker" | "unknown";
  context?: Record<string, unknown>;
}

export interface AICircuitBreakerLog {
  type: "ai_circuit_breaker";
  timestamp: string;
  provider: string;
  event: "opened" | "closed" | "half_open";
  failures: number;
  previousState: string;
  newState: string;
}

export interface AIPerformanceSummary {
  type: "ai_performance_summary";
  timestamp: string;
  period: string;
  providers: Record<string, {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgLatencyMs: number;
    p95LatencyMs: number;
    totalTokens: number;
    cacheHitRate: number;
    errorRate: number;
  }>;
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `ai-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Format timestamp for logging
 */
function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * In-memory metrics storage for performance summaries
 */
const metricsStore: {
  requests: AIMetrics[];
  maxSize: number;
} = {
  requests: [],
  maxSize: 1000,
};

/**
 * Store metrics for aggregation
 */
function storeMetrics(metrics: AIMetrics): void {
  metricsStore.requests.push(metrics);
  // Keep only the most recent entries
  if (metricsStore.requests.length > metricsStore.maxSize) {
    metricsStore.requests = metricsStore.requests.slice(-metricsStore.maxSize);
  }
}

/**
 * Log an AI request with structured metrics
 */
export function logAIRequest(params: {
  provider: string;
  model: string;
  taskType?: string;
  latencyMs: number;
  success: boolean;
  error?: string;
  tokens?: { prompt: number; completion: number; total: number };
  cached?: boolean;
  circuitBreakerState?: string;
  retryCount?: number;
}): string {
  const requestId = generateRequestId();
  const metrics: AIMetrics = {
    requestId,
    timestamp: formatTimestamp(),
    provider: params.provider,
    model: params.model,
    taskType: params.taskType,
    latencyMs: params.latencyMs,
    success: params.success,
    error: params.error,
    tokens: params.tokens,
    cached: params.cached ?? false,
    circuitBreakerState: params.circuitBreakerState,
    retryCount: params.retryCount,
  };

  const log: AIRequestLog = {
    type: "ai_request",
    metrics,
  };

  // Store for aggregation
  storeMetrics(metrics);

  // Output structured log
  console.log(JSON.stringify(log));

  return requestId;
}

/**
 * Log an AI error with context
 */
export function logAIError(params: {
  requestId?: string;
  provider: string;
  error: string;
  errorType: AIErrorLog["errorType"];
  context?: Record<string, unknown>;
}): void {
  const log: AIErrorLog = {
    type: "ai_error",
    requestId: params.requestId || generateRequestId(),
    timestamp: formatTimestamp(),
    provider: params.provider,
    error: params.error,
    errorType: params.errorType,
    context: params.context,
  };

  console.error(JSON.stringify(log));
}

/**
 * Log circuit breaker state changes
 */
export function logCircuitBreakerEvent(params: {
  provider: string;
  event: AICircuitBreakerLog["event"];
  failures: number;
  previousState: string;
  newState: string;
}): void {
  const log: AICircuitBreakerLog = {
    type: "ai_circuit_breaker",
    timestamp: formatTimestamp(),
    provider: params.provider,
    event: params.event,
    failures: params.failures,
    previousState: params.previousState,
    newState: params.newState,
  };

  console.log(JSON.stringify(log));
}

/**
 * Calculate percentile from sorted array
 */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] || 0;
}

/**
 * Generate performance summary for a time period
 */
export function generatePerformanceSummary(periodMinutes: number = 60): AIPerformanceSummary {
  const cutoff = Date.now() - periodMinutes * 60 * 1000;
  const recentRequests = metricsStore.requests.filter(
    (m) => new Date(m.timestamp).getTime() >= cutoff
  );

  // Group by provider
  const providerGroups: Record<string, AIMetrics[]> = {};
  for (const req of recentRequests) {
    if (!providerGroups[req.provider]) {
      providerGroups[req.provider] = [];
    }
    providerGroups[req.provider].push(req);
  }

  // Calculate stats per provider
  const providers: AIPerformanceSummary["providers"] = {};

  for (const [provider, requests] of Object.entries(providerGroups)) {
    const successful = requests.filter((r) => r.success);
    const latencies = requests.map((r) => r.latencyMs);
    const totalTokens = requests.reduce(
      (sum, r) => sum + (r.tokens?.total || 0),
      0
    );
    const cachedCount = requests.filter((r) => r.cached).length;

    providers[provider] = {
      totalRequests: requests.length,
      successfulRequests: successful.length,
      failedRequests: requests.length - successful.length,
      avgLatencyMs: latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0,
      p95LatencyMs: percentile(latencies, 95),
      totalTokens,
      cacheHitRate: requests.length > 0
        ? Math.round((cachedCount / requests.length) * 100)
        : 0,
      errorRate: requests.length > 0
        ? Math.round(((requests.length - successful.length) / requests.length) * 100)
        : 0,
    };
  }

  const summary: AIPerformanceSummary = {
    type: "ai_performance_summary",
    timestamp: formatTimestamp(),
    period: `${periodMinutes}m`,
    providers,
  };

  console.log(JSON.stringify(summary));

  return summary;
}

/**
 * Get recent metrics for monitoring dashboards
 */
export function getRecentMetrics(limit: number = 100): AIMetrics[] {
  return metricsStore.requests.slice(-limit);
}

/**
 * Clear stored metrics (useful for testing)
 */
export function clearMetrics(): void {
  metricsStore.requests = [];
}

/**
 * Create a logger instance with preset provider
 */
export function createAILogger(provider: string) {
  return {
    logRequest: (params: Omit<Parameters<typeof logAIRequest>[0], "provider">) =>
      logAIRequest({ ...params, provider }),

    logError: (params: Omit<Parameters<typeof logAIError>[0], "provider">) =>
      logAIError({ ...params, provider }),

    logCircuitBreaker: (
      params: Omit<Parameters<typeof logCircuitBreakerEvent>[0], "provider">
    ) => logCircuitBreakerEvent({ ...params, provider }),
  };
}

// Pre-configured loggers for AI providers
export const groqLogger = createAILogger("Groq");
export const geminiLogger = createAILogger("Gemini");
export const openaiLogger = createAILogger("OpenAI");
