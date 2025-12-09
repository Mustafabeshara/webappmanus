const isProduction = process.env.NODE_ENV === "production";

function requireSecret(name: string, value: string | undefined | null, minLength = 16) {
  if (!isProduction) {
    if (!value) {
      console.warn(`[ENV] Missing ${name}; using insecure dev fallback. Do NOT use in production.`);
    }
    return;
  }

  if (!value || value.length < minLength) {
    throw new Error(`[ENV] ${name} is required in production and must be at least ${minLength} characters.`);
  }
}

// Validate critical secrets early
requireSecret("JWT_SECRET", process.env.JWT_SECRET);
requireSecret("ADMIN_PASSWORD", process.env.ADMIN_PASSWORD, 8);

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "moh-tender-app",
  cookieSecret: process.env.JWT_SECRET ?? "dev-insecure-secret",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction,
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Simple admin password authentication (no Manus OAuth required)
  adminPassword: process.env.ADMIN_PASSWORD ?? "admin123",
};
