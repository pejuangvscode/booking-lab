import { initTRPC, TRPCError } from "@trpc/server";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import superjson from "superjson";
import { ZodError } from "zod";
import { getAuth } from "@clerk/nextjs/server";
import { db } from "~/server/db";

interface CreateContextOptions {
  userId: string | null;
  sessionId: string | null;
}

const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    userId: opts.userId,
    sessionId: opts.sessionId,
    db,
  };
};

export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const { req } = opts;

  try {
    let auth;
    try {
      auth = getAuth(req);
    } catch (authError) {
      auth = { userId: null, sessionId: null };
    }


    const context = {
      userId: auth.userId || null,
      sessionId: auth.sessionId || null,
      db: db,
    };

    return context;
  } catch (error) {
    
    return {
      userId: null,
      sessionId: null,
      db: db,
    };
  }
};

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

export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ 
      code: "UNAUTHORIZED",
      message: "Please sign in to access this feature. If you're already signed in, try refreshing the page."
    });
  }

  if (!ctx.db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR", 
      message: "Database connection unavailable. Please try again later."
    });
  }
  
  return next({
    ctx: {
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      db: ctx.db,
    },
  });
});

export const adminProcedure = t.procedure.use(({ ctx, next }) => {  
  if (!ctx.userId) {
    throw new TRPCError({ 
      code: "UNAUTHORIZED",
      message: "Authentication required for admin functions."
    });
  }

  return next({
    ctx: {
      userId: ctx.userId,
      sessionId: ctx.sessionId,
      db: ctx.db,
    },
  });
});