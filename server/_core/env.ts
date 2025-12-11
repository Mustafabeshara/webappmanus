const isProduction = process.env.NODE_ENV === "production";
const allowInsecureDev = process.env.ALLOW_INSECURE_DEV === "true";

function requireSecret(
  name: string,
  value: string | undefined | null,
  minLength = 16
) {
  // Only allow insecure fallbacks if explicitly opted in via ALLOW_INSECURE_DEV=true
  if (allowInsecureDev && !isProduction) {
    if (!value) {
      console.warn(
        `[ENV] WARNING: Missing ${name}; using insecure dev fallback. Set ALLOW_INSECURE_DEV=false or provide proper secrets.`
      );
    }
    return;
  }

  // In all other cases (production OR dev without explicit opt-in), require proper secrets
  if (!value || value.length < minLength) {
    throw new Error(
      `[ENV] ${name} is required and must be at least ${minLength} characters. ` +
      `Set ALLOW_INSECURE_DEV=true to use insecure defaults in development.`
    );
  }
}

// Validate critical secrets early - now enforced in ALL environments unless explicitly opted out
requireSecret("JWT_SECRET", process.env.JWT_SECRET, 32);
requireSecret("ADMIN_PASSWORD", process.env.ADMIN_PASSWORD, 12);

// Additional security validations for production
if (isProduction) {
  if (!process.env.DATABASE_URL) {
    throw new Error("[ENV] DATABASE_URL is required in production");
  }

  if (process.env.ADMIN_PASSWORD === "admin123") {
    throw new Error(
      "[ENV] Default admin password must be changed in production"
    );
  }

  // Prevent accidental insecure dev mode in production
  if (allowInsecureDev) {
    throw new Error(
      "[ENV] ALLOW_INSECURE_DEV cannot be true in production"
    );
  }
}

// Only use insecure defaults if explicitly opted in via ALLOW_INSECURE_DEV=true
// This prevents accidental deployment with weak credentials
const getSecretOrDevFallback = (
  envVar: string | undefined,
  devFallback: string
): string => {
  if (envVar) return envVar;
  if (allowInsecureDev && !isProduction) {
    console.warn(`[ENV] Using insecure dev fallback for secret`);
    return devFallback;
  }
  // This should never happen if requireSecret ran correctly
  throw new Error(`[ENV] Secret is required but not provided`);
};

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "moh-tender-app",
  cookieSecret: getSecretOrDevFallback(
    process.env.JWT_SECRET,
    "dev-insecure-secret-32-chars-min"
  ),
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction,
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Simple admin password authentication (no Manus OAuth required)
  adminPassword: getSecretOrDevFallback(
    process.env.ADMIN_PASSWORD,
    "dev-admin-pass-12"
  ),
};
