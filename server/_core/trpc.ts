import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { auditLogger } from "./auditLogger";
import type { TrpcContext } from "./context";
import { csrfProtectionService } from "./csrf-protection";
import { inputValidationService } from "./input-validation";
import {
  RATE_LIMITS,
  getClientId,
  isRateLimited,
  type RateLimitConfig,
} from "./rate-limiting";

// Re-export rate limit config for convenience
export { RATE_LIMITS } from "./rate-limiting";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;

/**
 * Extract request information for audit logging
 */
function extractRequestInfo(ctx: TrpcContext) {
  return {
    ipAddress:
      ctx.req.ip || ctx.req.headers["x-forwarded-for"]?.toString() || "unknown",
    userAgent: ctx.req.headers["user-agent"] || "unknown",
    endpoint: ctx.req.url || "unknown",
    userId: ctx.user?.id,
  };
}

/**
 * Validate string input for security threats
 */
async function validateStringInput(
  input: string,
  requestInfo: ReturnType<typeof extractRequestInfo>
): Promise<void> {
  const { userId, ipAddress, userAgent, endpoint } = requestInfo;

  if (inputValidationService.detectSqlInjection(input)) {
    await auditLogger.logSqlInjectionAttempt(
      input,
      userId,
      ipAddress,
      userAgent,
      endpoint
    );

    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Potential SQL injection detected in input",
    });
  }

  if (inputValidationService.detectXssPayload(input)) {
    await auditLogger.logXssAttempt(
      input,
      userId,
      ipAddress,
      userAgent,
      endpoint
    );

    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Potential XSS payload detected in input",
    });
  }
}

/**
 * Input validation middleware
 * Validates all inputs for security threats before processing
 */
const inputValidationMiddleware = t.middleware(async opts => {
  const { input, ctx, next } = opts;
  const requestInfo = extractRequestInfo(ctx);

  // Validate input for security threats if input exists
  if (input !== undefined && input !== null) {
    try {
      // Check for SQL injection and XSS in string inputs
      if (typeof input === "string") {
        await validateStringInput(input, requestInfo);
      }

      // Recursively check object inputs
      if (typeof input === "object" && input !== null) {
        await checkObjectForThreats(input, requestInfo);
      }
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Input validation failed",
      });
    }
  }

  return next();
});

/**
 * Validate object property for security threats
 */
async function validateObjectProperty(
  key: string,
  value: string,
  requestInfo: ReturnType<typeof extractRequestInfo>
): Promise<void> {
  const { userId, ipAddress, userAgent, endpoint } = requestInfo;

  if (inputValidationService.detectSqlInjection(value)) {
    await auditLogger.logSqlInjectionAttempt(
      value,
      userId,
      ipAddress,
      userAgent,
      endpoint
    );

    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Potential SQL injection detected in field: ${key}`,
    });
  }

  if (inputValidationService.detectXssPayload(value)) {
    await auditLogger.logXssAttempt(
      value,
      userId,
      ipAddress,
      userAgent,
      endpoint
    );

    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Potential XSS payload detected in field: ${key}`,
    });
  }
}

/**
 * Recursively check object properties for security threats
 */
async function checkObjectForThreats(
  obj: any,
  requestInfo: ReturnType<typeof extractRequestInfo>
): Promise<void> {
  if (typeof obj !== "object" || obj === null) {
    return;
  }

  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      const value = obj[key];

      if (typeof value === "string") {
        await validateObjectProperty(key, value, requestInfo);
      } else if (typeof value === "object" && value !== null) {
        await checkObjectForThreats(value, requestInfo);
      }
    }
  }
}

/**
 * CSRF protection middleware for state-changing operations
 * Disabled in development for easier testing
 */
const csrfProtectionMiddleware = t.middleware(async opts => {
  const { ctx, next } = opts;

  // Skip CSRF validation in development
  if (process.env.NODE_ENV !== "production") {
    return next();
  }

  // Get CSRF tokens from headers and cookies
  const tokenFromHeader = csrfProtectionService.getTokenFromHeaders(ctx);
  const tokenFromCookie = csrfProtectionService.getTokenFromCookies(ctx);

  // Validate CSRF tokens
  const csrfContext = { user: ctx.user ? { sessionId: undefined } : undefined };
  if (
    !csrfProtectionService.validateToken(tokenFromHeader, tokenFromCookie, csrfContext)
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Invalid CSRF token. Please refresh the page and try again.",
    });
  }

  return next();
});

export const publicProcedure = t.procedure.use(inputValidationMiddleware);

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

/**
 * Protected procedure with CSRF protection for mutations
 */
export const protectedMutationProcedure = t.procedure
  .use(inputValidationMiddleware)
  .use(requireUser)
  .use(csrfProtectionMiddleware);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user?.role || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  })
);

/**
 * Admin procedure with CSRF protection for mutations
 */
export const adminMutationProcedure = t.procedure
  .use(inputValidationMiddleware)
  .use(requireUser)
  .use(csrfProtectionMiddleware)
  .use(
    t.middleware(async opts => {
      const { ctx, next } = opts;

      if (!ctx.user?.role || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
      }

      return next({
        ctx: {
          ...ctx,
          user: ctx.user,
        },
      });
    })
  );

/**
 * Rate limiting middleware factory
 * Creates a middleware that enforces rate limits based on the config
 */
function createRateLimitMiddleware(
  config: RateLimitConfig,
  endpointName: string
) {
  return t.middleware(async opts => {
    const { ctx, next } = opts;
    const clientId = getClientId(ctx.req);
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
export const uploadProcedure = protectedMutationProcedure.use(
  createRateLimitMiddleware(RATE_LIMITS.upload, "upload")
);

/**
 * Rate-limited protected procedure for sensitive operations
 * Limits sensitive operations to 30 per minute
 */
export const sensitiveProcedure = protectedMutationProcedure.use(
  createRateLimitMiddleware(RATE_LIMITS.sensitive, "sensitive")
);

/**
 * Rate-limited protected procedure for general mutations
 * Limits mutations to 100 per minute
 */
export const rateLimitedProcedure = protectedMutationProcedure.use(
  createRateLimitMiddleware(RATE_LIMITS.mutation, "mutation")
);
