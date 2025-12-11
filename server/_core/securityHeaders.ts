/**
 * Security Headers Configuration
 *
 * Configures Helmet middleware for comprehensive HTTP security headers.
 * Protects against common web vulnerabilities like XSS, clickjacking,
 * content sniffing, and other attacks.
 */

import helmet from "helmet";
import type { Express } from "express";

/**
 * Content Security Policy directives
 */
const CSP_DIRECTIVES = {
  defaultSrc: ["'self'"],
  scriptSrc: [
    "'self'",
    "'unsafe-inline'", // Required for Vite HMR in development
    "'unsafe-eval'", // Required for some libraries
    "https://cdn.jsdelivr.net",
    "https://unpkg.com",
  ],
  styleSrc: [
    "'self'",
    "'unsafe-inline'", // Required for styled-components, emotion, etc.
    "https://fonts.googleapis.com",
  ],
  imgSrc: [
    "'self'",
    "data:",
    "blob:",
    "https:",
    "*.amazonaws.com", // S3 images
  ],
  fontSrc: [
    "'self'",
    "https://fonts.gstatic.com",
    "data:",
  ],
  connectSrc: [
    "'self'",
    "https://api.openai.com",
    "https://*.amazonaws.com",
    "wss:", // WebSocket connections
    "ws:", // Dev WebSocket
  ],
  frameSrc: ["'none'"],
  objectSrc: ["'none'"],
  mediaSrc: ["'self'", "blob:"],
  workerSrc: ["'self'", "blob:"],
  childSrc: ["'self'", "blob:"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
  baseUri: ["'self'"],
  upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
};

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
            directives: CSP_DIRECTIVES,
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
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }

    // X-Request-ID for request tracing
    const requestId = req.headers["x-request-id"] || generateRequestId();
    res.setHeader("X-Request-ID", requestId);

    next();
  });

  console.log(`[SECURITY] Security headers configured (${isDev ? "development" : "production"} mode)`);
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
  "Pragma": "no-cache",
  "Expires": "0",
};

/**
 * Apply API security headers to a response
 */
export function applyApiSecurityHeaders(res: any): void {
  Object.entries(apiSecurityHeaders).forEach(([header, value]) => {
    res.setHeader(header, value);
  });
}
