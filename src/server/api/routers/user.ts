import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { clerkClient } from "@clerk/clerk-sdk-node";

export const userRouter = createTRPCRouter({
  
  syncUser: protectedProcedure
    .query(async ({ ctx }) => {      
      
      if (!ctx) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Request context is unavailable.",
        });
      }

      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be signed in to sync user data.",
        });
      }

      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection is unavailable.",
        });
      }

      try {
        
        let user = await ctx.db.users.findUnique({
          where: { id: ctx.userId },
        });

        if (!user) {
          
          user = await ctx.db.users.create({
            data: {
              id: ctx.userId,
              
            },
          });
        } else {

        }

        return user;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to sync user data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  
  getCurrentUser: protectedProcedure
    .query(async ({ ctx }) => {
      
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be signed in.",
        });
      }

      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection is unavailable.",
        });
      }

      try {
        const user = await ctx.db.users.findUnique({
          where: { id: ctx.userId },
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found in database",
          });
        }
        return user;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch user data",
        });
      }
    }),

  
  setAdminRole: protectedProcedure
    .input(z.object({
      userId: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be signed in.",
        });
      }

      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection is unavailable.",
        });
      }

      const targetUserId = input.userId ?? ctx.userId;

      try {
        
        const user = await ctx.db.users.upsert({
          where: { id: targetUserId },
          update: { role: "admin" },
          create: {
            id: targetUserId,
            role: "admin",
          },
        });

        
        await clerkClient.users.updateUserMetadata(targetUserId, {
          publicMetadata: {
            role: "admin"
          }
        });

        return user;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to set admin role: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  
  removeAdminRole: protectedProcedure
    .input(z.object({
      userId: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be signed in.",
        });
      }

      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection is unavailable.",
        });
      }

      const targetUserId = input.userId ?? ctx.userId;

      try {
        
        const user = await ctx.db.users.upsert({
          where: { id: targetUserId },
          update: { role: "user" },
          create: {
            id: targetUserId,
            role: "user",
          },
        });

        
        await clerkClient.users.updateUserMetadata(targetUserId, {
          publicMetadata: {
            role: "user"
          }
        });

        return user;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to remove admin role: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),
});