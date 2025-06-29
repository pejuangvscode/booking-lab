import { createTRPCRouter } from "~/server/api/trpc";
import { userRouter } from "~/server/api/routers/user";
import { labRouter } from "~/server/api/routers/lab";
import { bookingRouter } from "./routers/booking";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  lab: labRouter,
  booking: bookingRouter
});

// export type definition of API
export type AppRouter = typeof appRouter;