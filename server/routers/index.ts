/**
 * Router Index - Combines all feature routers into the main appRouter
 *
 * Each router is split into its own file for maintainability:
 * - auth.router.ts - Authentication (login/logout)
 * - users.router.ts - User management (admin only)
 * - departments.router.ts - Department CRUD
 *
 * For the full list of routers, see the appRouter definition below.
 * Legacy routers remain in routers.ts until fully migrated.
 */

export { authRouter } from "./auth.router";
export { usersRouter } from "./users.router";
export { departmentsRouter } from "./departments.router";
export { adminProcedure, checkPermission } from "./shared";
