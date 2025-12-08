/**
 * AI Service Configuration
 * Multi-provider support with fallback chain
 */

export interface AIProviderConfig {
  name: string;
  apiKey: string | undefined;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
  supportsVision: boolean;
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
}

export const AI_CONFIG = {
  defaultTimeout: 30000,
  retryAttempts: 2,
  retryDelay: 1000,
  cacheEnabled: true,
  cacheTTL: 3600, // 1 hour

  providers: [
    {
      name: 'Groq',
      apiKey: process.env.GROQ_API_KEY,
      baseUrl: 'https://api.groq.com/openai/v1',
      model: 'llama-3.3-70b-versatile',
      maxTokens: 4000,
      temperature: 0.3,
      supportsVision: false,
      rateLimitPerMinute: 30,
      rateLimitPerDay: 14400,
    },
    {
      name: 'Gemini',
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY,
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-1.5-flash',
      maxTokens: 4000,
      temperature: 0.3,
      supportsVision: true,
      rateLimitPerMinute: 60,
      rateLimitPerDay: 1500,
    },
    {
      name: 'OpenAI',
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      maxTokens: 4000,
      temperature: 0.3,
      supportsVision: true,
      rateLimitPerMinute: 60,
      rateLimitPerDay: 10000,
    },
  ] as AIProviderConfig[],
};

// Task-specific model preferences
export const TASK_MODELS = {
  tenderAnalysis: ['Groq', 'Gemini', 'OpenAI'],
  documentExtraction: ['Gemini', 'OpenAI', 'Groq'],
  summarization: ['Groq', 'Gemini', 'OpenAI'],
  vision: ['Gemini', 'OpenAI'],
  arabicProcessing: ['Gemini', 'OpenAI', 'Groq'],
};

// Get available providers (with valid API keys)
export function getAvailableProviders(): AIProviderConfig[] {
  return AI_CONFIG.providers.filter(p => p.apiKey && p.apiKey.length > 10);
}

// Check if any AI provider is configured
export function isAIConfigured(): boolean {
  return getAvailableProviders().length > 0;
}
