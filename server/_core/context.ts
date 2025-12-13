import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { csrfProtectionService } from "./csrf-protection";
import { sdk } from "./sdk";

export type AuthenticatedUser = User & { sessionId?: string };

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: AuthenticatedUser | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: AuthenticatedUser | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
    
    // Add CSRF token to response headers for authenticated users
    if (user && user.sessionId) {
      csrfProtectionService.addTokenToResponse(opts.res, user.sessionId);
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
