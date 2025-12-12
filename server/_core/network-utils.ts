/**
 * Network utility functions shared across the application
 * Extracts common functionality to avoid code duplication
 */

import type { Request } from "express";

/**
 * Extracts the client IP address from an incoming request.
 * Handles proxy headers (X-Forwarded-For, X-Real-IP) and fallbacks.
 *
 * @param req - Express Request object or compatible request with headers
 * @returns The client IP address string, or "unknown" if not determinable
 */
export function getClientIp(
  req: Request | { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }
): string {
  // Check X-Forwarded-For header (set by proxies/load balancers)
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    // Can be comma-separated list; take the first (original client)
    const forwardedStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    if (forwardedStr) {
      const firstIp = forwardedStr.split(",")[0]?.trim();
      if (firstIp) return firstIp;
    }
  }

  // Check X-Real-IP header (set by some proxies like nginx)
  const realIp = req.headers["x-real-ip"];
  if (realIp) {
    const realIpStr = Array.isArray(realIp) ? realIp[0] : realIp;
    if (realIpStr) return realIpStr.trim();
  }

  // Fallback to socket remote address
  if (req.socket?.remoteAddress) {
    return req.socket.remoteAddress;
  }

  return "unknown";
}

/**
 * Validates if a string is a valid IP address (IPv4 or IPv6)
 */
export function isValidIp(ip: string): boolean {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 pattern (simplified)
  const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  // IPv4-mapped IPv6
  const ipv4MappedPattern = /^::ffff:(\d{1,3}\.){3}\d{1,3}$/;

  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip) || ipv4MappedPattern.test(ip);
}

/**
 * Normalizes an IP address by removing IPv6 prefix for IPv4-mapped addresses
 */
export function normalizeIp(ip: string): string {
  if (ip.startsWith("::ffff:")) {
    return ip.substring(7);
  }
  return ip;
}

/**
 * Extracts user agent from request headers
 */
export function getUserAgent(
  req: Request | { headers: Record<string, string | string[] | undefined> }
): string {
  const ua = req.headers["user-agent"];
  if (ua) {
    return Array.isArray(ua) ? ua[0] || "unknown" : ua;
  }
  return "unknown";
}

/**
 * Creates a request fingerprint for session binding
 */
export function createRequestFingerprint(
  req: Request | { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }
): string {
  const ip = getClientIp(req);
  const ua = getUserAgent(req);
  return `${ip}:${ua}`;
}
