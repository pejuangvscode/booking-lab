import { initTRPC, TRPCError } from "@trpc/server";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import { getAuth } from "@clerk/nextjs/server"; // Changed from auth to getAuth
import superjson from "superjson";
import { ZodError } from "zod";

import { db } from "~/server/db";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 */

export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const { req } = opts;
  
  // Get the auth context from Clerk using getAuth for Pages Router
  const session = getAuth(req);
  
  return {
    db,
    auth: session,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * 3. ROUTER & PROCEDURE
 *
 * These are the building blocks of your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

export const createTRPCRouter = t.router;

/**
 * Public procedure - available to anyone
 */
export const publicProcedure = t.procedure;

/**
 * Protected procedure - only available to authenticated users
 */
export const protectedProcedure = t.procedure.use(
  ({ ctx, next }) => {
    if (!ctx.auth || !ctx.auth.userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to access this resource",
      });
    }
    
    return next({
      ctx: {
        ...ctx,
        auth: ctx.auth,
      },
    });
  }
);