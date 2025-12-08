import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { isRateLimited, getClientId, RATE_LIMITS, type RateLimitConfig } from "./rateLimit";

// Re-export rate limit config for convenience
export { RATE_LIMITS } from "./rateLimit";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

/**
 * Rate limiting middleware factory
 * Creates a middleware that enforces rate limits based on the config
 */
function createRateLimitMiddleware(config: RateLimitConfig, endpointName: string) {
  return t.middleware(async opts => {
    const { ctx, next } = opts;
    const clientId = getClientId(ctx.req, ctx.user?.id);
    const key = `${clientId}:${endpointName}`;
    const { limited, resetIn } = isRateLimited(key, config);

    if (limited) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `${config.message || "Too many requests."} Retry after ${Math.ceil(resetIn / 1000)} seconds.`,
      });
    }

    return next();
  });
}

/**
 * Rate-limited protected procedure for file uploads
 * Limits uploads to 20 per minute per user/IP
 */
export const uploadProcedure = protectedProcedure.use(
  createRateLimitMiddleware(RATE_LIMITS.upload, "upload")
);

/**
 * Rate-limited protected procedure for sensitive operations
 * Limits sensitive operations to 30 per minute
 */
export const sensitiveProcedure = protectedProcedure.use(
  createRateLimitMiddleware(RATE_LIMITS.sensitive, "sensitive")
);

/**
 * Rate-limited protected procedure for general mutations
 * Limits mutations to 100 per minute
 */
export const rateLimitedProcedure = protectedProcedure.use(
  createRateLimitMiddleware(RATE_LIMITS.mutation, "mutation")
);
