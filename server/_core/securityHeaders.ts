/**
 * Security Headers Configuration
 *
 * Configures Helmet middleware for comprehensive HTTP security headers.
 * Protects against common web vulnerabilities like XSS, clickjacking,
 * content sniffing, and other attacks.
 */

import type { Express } from "express";
import helmet from "helmet";

/**
 * Build Content Security Policy directives
 * - Development: allow inline/eval for Vite HMR convenience
 * - Production: remove unsafe-inline/unsafe-eval for stronger XSS protection
 */
function buildCspDirectives() {
  const isProd = process.env.NODE_ENV === "production";
  const base = {
    defaultSrc: ["'self'"],
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Often needed for runtime CSS-in-JS; acceptable with strict scriptSrc
      "https://fonts.googleapis.com",
    ],
    imgSrc: ["'self'", "data:", "blob:", "https:", "*.amazonaws.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
    connectSrc: ["'self'", "https://*.amazonaws.com", "wss:", "ws:"],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'", "blob:"],
    workerSrc: ["'self'", "blob:"],
    childSrc: ["'self'", "blob:"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    upgradeInsecureRequests: isProd ? [] : null,
  } as const;

  const devScriptSrc = [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    "https://cdn.jsdelivr.net",
    "https://unpkg.com",
  ];
  const prodScriptSrc = [
    "'self'",
    "https://cdn.jsdelivr.net",
    "https://unpkg.com",
  ];

  return {
    ...base,
    scriptSrc: isProd ? prodScriptSrc : devScriptSrc,
  };
}

/**
 * Configure security headers for the Express app
 */
export function configureSecurityHeaders(app: Express): void {
  const isDev = process.env.NODE_ENV !== "production";

  // Main Helmet configuration
  app.use(
    helmet({
      // Content Security Policy
      contentSecurityPolicy: isDev
        ? false // Disable in development for easier debugging
        : {
            directives: buildCspDirectives(),
            reportOnly: false,
          },

      // Cross-Origin Embedder Policy
      crossOriginEmbedderPolicy: isDev ? false : { policy: "require-corp" },

      // Cross-Origin Opener Policy
      crossOriginOpenerPolicy: { policy: "same-origin" },

      // Cross-Origin Resource Policy
      crossOriginResourcePolicy: { policy: "same-origin" },

      // DNS Prefetch Control
      dnsPrefetchControl: { allow: false },

      // Frameguard (X-Frame-Options)
      frameguard: { action: "deny" },

      // Hide Powered By
      hidePoweredBy: true,

      // HSTS (HTTP Strict Transport Security)
      hsts: isDev
        ? false
        : {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
          },

      // IE No Open
      ieNoOpen: true,

      // No Sniff (X-Content-Type-Options)
      noSniff: true,

      // Origin Agent Cluster
      originAgentCluster: true,

      // Permitted Cross-Domain Policies
      permittedCrossDomainPolicies: { permittedPolicies: "none" },

      // Referrer Policy
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },

      // XSS Filter (deprecated but still useful for older browsers)
      xssFilter: true,
    })
  );

  // Additional custom security headers
  app.use((req, res, next) => {
    // Permissions Policy (formerly Feature-Policy)
    res.setHeader(
      "Permissions-Policy",
      [
        "accelerometer=()",
        "camera=()",
        "geolocation=()",
        "gyroscope=()",
        "magnetometer=()",
        "microphone=()",
        "payment=()",
        "usb=()",
      ].join(", ")
    );

    // Cache-Control for sensitive pages
    if (req.path.startsWith("/api/")) {
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
      );
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }

    // X-Request-ID for request tracing
    const requestId = req.headers["x-request-id"] || generateRequestId();
    res.setHeader("X-Request-ID", requestId);

    next();
  });

  console.log(
    `[SECURITY] Security headers configured (${isDev ? "development" : "production"} mode)`
  );
}

/**
 * Generate a unique request ID for tracing
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Security headers for API responses
 */
export const apiSecurityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * Apply API security headers to a response
 */
export function applyApiSecurityHeaders(res: any): void {
  Object.entries(apiSecurityHeaders).forEach(([header, value]) => {
    res.setHeader(header, value);
  });
}
