/**
 * AI Service Manager
 * Handles the fallback chain for AI providers with rate limiting
 */

import { AI_CONFIG, AIProviderConfig, TASK_MODELS, getAvailableProviders } from './config';

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

// Response cache
const responseCache = new Map<string, { response: AIResponse; expiry: number }>();

function getCacheKey(request: AIRequest): string {
  return `${request.prompt}-${request.systemPrompt || ''}-${request.taskType || ''}`;
}

function getCachedResponse(request: AIRequest): AIResponse | null {
  if (!AI_CONFIG.cacheEnabled) return null;

  const key = getCacheKey(request);
  const cached = responseCache.get(key);

  if (cached && cached.expiry > Date.now()) {
    return { ...cached.response, provider: cached.response.provider + ' (cached)' };
  }

  if (cached) responseCache.delete(key);
  return null;
}

function cacheResponse(request: AIRequest, response: AIResponse): void {
  if (!AI_CONFIG.cacheEnabled || !response.success) return;

  const key = getCacheKey(request);
  responseCache.set(key, {
    response,
    expiry: Date.now() + AI_CONFIG.cacheTTL * 1000,
  });
}

/**
 * Call Groq API
 */
async function callGroq(config: AIProviderConfig, request: AIRequest): Promise<AIResponse> {
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
  });

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
}

/**
 * Call Gemini API
 */
async function callGemini(config: AIProviderConfig, request: AIRequest): Promise<AIResponse> {
  const fullPrompt = request.systemPrompt
    ? `${request.systemPrompt}\n\n${request.prompt}`
    : request.prompt;

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
    }
  );

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
}

/**
 * Call OpenAI API
 */
async function callOpenAI(config: AIProviderConfig, request: AIRequest): Promise<AIResponse> {
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
  });

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
}

/**
 * Call a specific AI provider
 */
async function callProvider(provider: AIProviderConfig, request: AIRequest): Promise<AIResponse> {
  const startTime = Date.now();

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

    console.log(`[AI] ${provider.name} completed in ${response.latency}ms`);
    return response;
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error(`[AI] ${provider.name} failed:`, errorMessage);
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
 * Main AI completion function with fallback chain
 */
export async function complete(request: AIRequest): Promise<AIResponse> {
  // Check cache first
  const cached = getCachedResponse(request);
  if (cached) return cached;

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

  for (const provider of eligibleProviders) {
    for (let attempt = 0; attempt < AI_CONFIG.retryAttempts; attempt++) {
      const response = await callProvider(provider, request);

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
 * Get AI service status
 */
export function getAIStatus(): {
  configured: boolean;
  providers: Array<{ name: string; available: boolean; model: string }>;
} {
  const available = getAvailableProviders();

  return {
    configured: available.length > 0,
    providers: AI_CONFIG.providers.map(p => ({
      name: p.name,
      available: available.some(a => a.name === p.name),
      model: p.model,
    })),
  };
}
