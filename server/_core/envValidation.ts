import { z } from 'zod';

/**
 * Environment variable validation at startup
 * Implements L7: Validate Environment Variables at Startup
 */

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  OAUTH_SERVER_URL: z.string().url("OAUTH_SERVER_URL must be a valid URL"),
  BUILT_IN_FORGE_API_KEY: z.string().min(1, "BUILT_IN_FORGE_API_KEY is required"),
  BUILT_IN_FORGE_API_URL: z.string().url("BUILT_IN_FORGE_API_URL must be a valid URL"),
  VITE_APP_ID: z.string().min(1, "VITE_APP_ID is required"),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
});

export type ValidatedEnv = z.infer<typeof envSchema>;

/**
 * Validate environment variables and exit if invalid
 */
export function validateEnvironment(): ValidatedEnv {
  try {
    const validated = envSchema.parse(process.env);
    console.log('✅ Environment variables validated successfully');
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.issues.forEach((err: any) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error('❌ Environment validation failed:', error);
    }
    process.exit(1);
  }
}
