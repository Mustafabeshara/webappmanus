import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import * as db from "../db";

/**
 * Settings Router
 * Handles system-wide settings management (admin only)
 */
export const settingsRouter = router({
  /**
   * List all system settings (admin only)
   * Returns all configuration settings in the system
   */
  list: adminProcedure.query(async () => {
    return await db.getAllSettings();
  }),

  /**
   * Get a specific setting by key (admin only)
   * @param key - The setting key to retrieve
   */
  get: adminProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      return await db.getSetting(input.key);
    }),

  /**
   * Update or create a setting (admin only)
   * Uses upsert logic to create if not exists or update if exists
   * @param key - Setting key
   * @param value - Setting value
   * @param category - Setting category for organization
   * @param description - Optional description of the setting
   */
  update: adminProcedure
    .input(
      z.object({
        key: z.string(),
        value: z.string(),
        category: z.string(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await db.upsertSetting({
        ...input,
        updatedBy: ctx.user.id,
      } as any);
      return { success: true };
    }),
});
