import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../../../server/routers";

// React hooks client (for components)
export const trpc = createTRPCReact<AppRouter>();

// Vanilla client for imperative calls (async functions, event handlers)
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
    }),
  ],
});
