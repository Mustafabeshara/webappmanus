import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import {
  protectedMutationProcedure,
  publicProcedure,
  router,
} from "../_core/trpc";

export const authRouter = router({
  me: publicProcedure.query(opts => opts.ctx.user),
  logout: protectedMutationProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
});
