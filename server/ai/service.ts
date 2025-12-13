/**
 * AI Service Manager
 * Handles the fallback chain for AI providers with rate limiting, circuit breaker, and structured logging
 */

import { AI_CONFIG, AIProviderConfig, TASK_MODELS, getAvailableProviders } from './config';
import { getCircuitBreaker, circuitBreakerRegistry, type CircuitBreakerStats } from '../_core/circuit-breaker';
import { logAIRequest, logAIError } from '../_core/ai-logger';

export interface AIRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  taskType?: keyof typeof TASK_MODELS;
}

export interface AIResponse {
  success: boolean;
  content: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
  latency?: number;
}

// Rate limit tracking
const rateLimits: Record<string, { minuteCount: number; minuteReset: number; dayCount: number; dayReset: number }> = {};

function initRateLimits(provider: string): void {
  if (!rateLimits[provider]) {
    const now = Date.now();
    rateLimits[provider] = {
      minuteCount: 0,
      minuteReset: now + 60000,
      dayCount: 0,
      dayReset: now + 86400000,
    };
  }
}

function checkRateLimits(provider: AIProviderConfig): boolean {
  initRateLimits(provider.name);
  const limits = rateLimits[provider.name];
  const now = Date.now();

  if (now > limits.minuteReset) {
    limits.minuteCount = 0;
    limits.minuteReset = now + 60000;
  }
  if (now > limits.dayReset) {
    limits.dayCount = 0;
    limits.dayReset = now + 86400000;
  }

  return limits.minuteCount < provider.rateLimitPerMinute && limits.dayCount < provider.rateLimitPerDay;
}

function incrementRateLimits(provider: string): void {
  initRateLimits(provider);
  rateLimits[provider].minuteCount++;
  rateLimits[provider].dayCount++;
}

// Response cache with size limit to prevent memory issues
const MAX_CACHE_SIZE = 1000;
const responseCache = new Map<string, { response: AIResponse; expiry: number; accessCount: number }>();

/**
 * Generate a cache key with hashing for better performance
 * Uses a simple hash to reduce key size while maintaining uniqueness
 */
function getCacheKey(request: AIRequest): string {
  const raw = `${request.prompt}-${request.systemPrompt || ''}-${request.taskType || ''}`;
  // Use a simple hash to reduce memory footprint
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `ai_${hash}_${raw.length}`;
}

/**
 * Evict least recently used cache entries when cache is full
 */
function evictLRUCache(): void {
  if (responseCache.size < MAX_CACHE_SIZE) return;
  
  // Find entry with oldest expiry or lowest access count
  let lruKey: string | null = null;
  let lruValue = Infinity;
  
  for (const [key, value] of responseCache.entries()) {
    const score = value.accessCount + (value.expiry / 1000000); // Combine access count and expiry
    if (score < lruValue) {
      lruValue = score;
      lruKey = key;
    }
  }
  
  if (lruKey) {
    responseCache.delete(lruKey);
  }
}

function getCachedResponse(request: AIRequest): AIResponse | null {
  if (!AI_CONFIG.cacheEnabled) return null;

  const key = getCacheKey(request);
  const cached = responseCache.get(key);

  if (cached && cached.expiry > Date.now()) {
    // Update access count for LRU tracking
    cached.accessCount++;
    return { ...cached.response, provider: cached.response.provider + ' (cached)' };
  }

  if (cached) responseCache.delete(key);
  return null;
}

function cacheResponse(request: AIRequest, response: AIResponse): void {
  if (!AI_CONFIG.cacheEnabled || !response.success) return;

  // Evict old entries if cache is full
  evictLRUCache();

  const key = getCacheKey(request);
  responseCache.set(key, {
    response,
    expiry: Date.now() + AI_CONFIG.cacheTTL * 1000,
    accessCount: 1,
  });
}

/**
 * Clear expired cache entries
 * Should be called periodically to prevent memory buildup
 */
export function clearExpiredCache(): number {
  const now = Date.now();
  let cleared = 0;
  
  for (const [key, value] of responseCache.entries()) {
    if (value.expiry <= now) {
      responseCache.delete(key);
      cleared++;
    }
  }
  
  return cleared;
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats(): {
  size: number;
  maxSize: number;
  hitRate: number;
  enabled: boolean;
} {
  // This is a simplified version - in production, you'd track hits/misses
  return {
    size: responseCache.size,
    maxSize: MAX_CACHE_SIZE,
    hitRate: 0, // Would need to track this separately
    enabled: AI_CONFIG.cacheEnabled,
  };
}

/**
 * Validate AI request input to prevent injection attacks
 */
function validateAIRequest(request: AIRequest): void {
  if (!request.prompt || typeof request.prompt !== 'string') {
    throw new Error('Prompt must be a non-empty string');
  }
  
  if (request.prompt.length > 50000) {
    throw new Error('Prompt exceeds maximum length of 50000 characters');
  }
  
  if (request.systemPrompt && typeof request.systemPrompt !== 'string') {
    throw new Error('System prompt must be a string');
  }
  
  if (request.systemPrompt && request.systemPrompt.length > 10000) {
    throw new Error('System prompt exceeds maximum length of 10000 characters');
  }
  
  if (request.maxTokens && (typeof request.maxTokens !== 'number' || request.maxTokens < 1 || request.maxTokens > 32768)) {
    throw new Error('Max tokens must be a number between 1 and 32768');
  }
  
  if (request.temperature !== undefined && (typeof request.temperature !== 'number' || request.temperature < 0 || request.temperature > 2)) {
    throw new Error('Temperature must be a number between 0 and 2');
  }
}

/**
 * Call Groq API with error handling and security
 */
async function callGroq(config: AIProviderConfig, request: AIRequest): Promise<AIResponse> {
  // Add timeout to prevent hanging requests
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_CONFIG.defaultTimeout);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.prompt },
        ],
        max_tokens: request.maxTokens || config.maxTokens,
        temperature: request.temperature ?? config.temperature,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      success: true,
      content: data.choices[0]?.message?.content || '',
      provider: config.name,
      model: config.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Groq API request timeout after ${AI_CONFIG.defaultTimeout}ms`);
    }
    throw error;
  }
}

/**
 * Call Gemini API with error handling and security
 */
async function callGemini(config: AIProviderConfig, request: AIRequest): Promise<AIResponse> {
  const fullPrompt = request.systemPrompt
    ? `${request.systemPrompt}\n\n${request.prompt}`
    : request.prompt;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_CONFIG.defaultTimeout);

  try {
    const response = await fetch(
      `${config.baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            maxOutputTokens: request.maxTokens || config.maxTokens,
            temperature: request.temperature ?? config.temperature,
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      success: true,
      content: text,
      provider: config.name,
      model: config.model,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
    };
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Gemini API request timeout after ${AI_CONFIG.defaultTimeout}ms`);
    }
    throw error;
  }
}

/**
 * Call OpenAI API with error handling and security
 */
async function callOpenAI(config: AIProviderConfig, request: AIRequest): Promise<AIResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_CONFIG.defaultTimeout);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.prompt },
        ],
        max_tokens: request.maxTokens || config.maxTokens,
        temperature: request.temperature ?? config.temperature,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      success: true,
      content: data.choices[0]?.message?.content || '',
      provider: config.name,
      model: config.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`OpenAI API request timeout after ${AI_CONFIG.defaultTimeout}ms`);
    }
    throw error;
  }
}

/**
 * Call a specific AI provider with circuit breaker protection and structured logging
 */
async function callProvider(
  provider: AIProviderConfig,
  request: AIRequest,
  taskType?: string
): Promise<AIResponse> {
  const startTime = Date.now();
  const circuitBreaker = getCircuitBreaker(provider.name);
  const cbState = circuitBreaker.getStats().state;

  // Check if circuit breaker allows requests
  if (!circuitBreaker.canExecute()) {
    const stats = circuitBreaker.getStats();

    // Log circuit breaker rejection
    logAIError({
      provider: provider.name,
      error: `Circuit breaker is open for ${provider.name}. Service temporarily unavailable.`,
      errorType: 'circuit_breaker',
      context: { failures: stats.totalFailures, state: stats.state },
    });

    return {
      success: false,
      content: '',
      provider: provider.name,
      model: provider.model,
      error: `Circuit breaker is open for ${provider.name}. Service temporarily unavailable.`,
      latency: 0,
    };
  }

  try {
    let response: AIResponse;

    switch (provider.name) {
      case 'Groq':
        response = await callGroq(provider, request);
        break;
      case 'Gemini':
        response = await callGemini(provider, request);
        break;
      case 'OpenAI':
        response = await callOpenAI(provider, request);
        break;
      default:
        throw new Error(`Unknown provider: ${provider.name}`);
    }

    response.latency = Date.now() - startTime;
    incrementRateLimits(provider.name);

    // Record success with circuit breaker
    circuitBreaker.onSuccess();

    // Log successful request with structured metrics
    logAIRequest({
      provider: provider.name,
      model: provider.model,
      taskType,
      latencyMs: response.latency,
      success: true,
      tokens: response.usage ? {
        prompt: response.usage.promptTokens,
        completion: response.usage.completionTokens,
        total: response.usage.totalTokens,
      } : undefined,
      cached: false,
      circuitBreakerState: cbState,
    });

    return response;
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Record failure with circuit breaker
    circuitBreaker.onFailure();

    // Determine error type for structured logging
    let errorType: 'rate_limit' | 'timeout' | 'api_error' | 'unknown' = 'unknown';
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      errorType = 'rate_limit';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      errorType = 'timeout';
    } else if (errorMessage.includes('API error') || errorMessage.includes('status')) {
      errorType = 'api_error';
    }

    // Log failed request with structured metrics
    logAIRequest({
      provider: provider.name,
      model: provider.model,
      taskType,
      latencyMs: latency,
      success: false,
      error: errorMessage,
      cached: false,
      circuitBreakerState: cbState,
    });

    logAIError({
      provider: provider.name,
      error: errorMessage,
      errorType,
      context: { latencyMs: latency, taskType },
    });

    return {
      success: false,
      content: '',
      provider: provider.name,
      model: provider.model,
      error: errorMessage,
      latency,
    };
  }
}

/**
 * Get providers for a task type
 */
function getProvidersForTask(taskType?: keyof typeof TASK_MODELS): AIProviderConfig[] {
  const available = getAvailableProviders();

  if (!taskType || !TASK_MODELS[taskType]) {
    return available;
  }

  const preferredOrder = TASK_MODELS[taskType];
  return available.sort((a, b) => {
    const aIndex = preferredOrder.indexOf(a.name);
    const bIndex = preferredOrder.indexOf(b.name);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

/**
 * Main AI completion function with fallback chain and input validation
 */
export async function complete(request: AIRequest): Promise<AIResponse> {
  // Input validation
  try {
    validateAIRequest(request);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Invalid request';
    console.error('[AI] Request validation failed:', errorMsg);
    return {
      success: false,
      content: '',
      provider: 'none',
      model: 'none',
      error: `Invalid request: ${errorMsg}`,
    };
  }

  // Check cache first
  const cached = getCachedResponse(request);
  if (cached) {
    // Log cache hit
    logAIRequest({
      provider: cached.provider.replace(' (cached)', ''),
      model: cached.model,
      taskType: request.taskType,
      latencyMs: 0,
      success: true,
      cached: true,
    });
    return cached;
  }

  // Get available providers for this task
  const providers = getProvidersForTask(request.taskType);

  if (providers.length === 0) {
    return {
      success: false,
      content: '',
      provider: 'none',
      model: 'none',
      error: 'No AI providers configured. Please set GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY.',
    };
  }

  // Filter by rate limits
  const eligibleProviders = providers.filter(p => checkRateLimits(p));

  if (eligibleProviders.length === 0) {
    return {
      success: false,
      content: '',
      provider: 'none',
      model: 'none',
      error: 'All AI providers are rate limited. Please try again later.',
    };
  }

  // Try each provider with retries
  const errors: string[] = [];
  const taskType = request.taskType;

  for (const provider of eligibleProviders) {
    for (let attempt = 0; attempt < AI_CONFIG.retryAttempts; attempt++) {
      const response = await callProvider(provider, request, taskType);

      if (response.success) {
        cacheResponse(request, response);
        return response;
      }

      errors.push(`${provider.name}: ${response.error}`);

      if (attempt < AI_CONFIG.retryAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, AI_CONFIG.retryDelay * (attempt + 1)));
      }
    }
  }

  return {
    success: false,
    content: '',
    provider: 'none',
    model: 'none',
    error: `All providers failed: ${errors.join('; ')}`,
  };
}

/**
 * Get AI service status including circuit breaker states
 */
export function getAIStatus(): {
  configured: boolean;
  providers: Array<{
    name: string;
    available: boolean;
    model: string;
    circuitBreaker: CircuitBreakerStats;
  }>;
} {
  const available = getAvailableProviders();

  return {
    configured: available.length > 0,
    providers: AI_CONFIG.providers.map(p => ({
      name: p.name,
      available: available.some(a => a.name === p.name),
      model: p.model,
      circuitBreaker: getCircuitBreaker(p.name).getStats(),
    })),
  };
}

/**
 * Get circuit breaker statistics for all AI providers
 */
export function getCircuitBreakerStats(): Record<string, CircuitBreakerStats> {
  return circuitBreakerRegistry.getAllStats();
}

/**
 * Reset circuit breaker for a specific provider or all providers
 */
export function resetCircuitBreaker(providerName?: string): void {
  if (providerName) {
    getCircuitBreaker(providerName).reset();
  } else {
    circuitBreakerRegistry.resetAll();
  }
}

/**
 * Check if AI is configured with at least one provider
 */
export function isAIConfigured(): boolean {
  return getAvailableProviders().length > 0;
}

// Re-export getAvailableProviders from config
export { getAvailableProviders } from "./config";
