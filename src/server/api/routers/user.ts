import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { clerkClient } from "@clerk/nextjs/server";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const userRouter = createTRPCRouter({
  // Sync the current user to the database
  syncUser: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.auth.userId;
    
    if (!userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in",
      });
    }

    try {
      // First, check if the user already exists in the database
      const existingUser = await ctx.db.users.findUnique({
        where: { id: userId },
      });

      // If the user exists, return the user data
      if (existingUser) {
        return existingUser;
      }

      // User doesn't exist, create a new record with just the ID
      try {
        
        // Create new user with just the ID field
        const newUser = await ctx.db.users.create({
          data: {
            id: userId,
            // No name field since it doesn't exist in the database
          },
        });
        
        return newUser;
        
      } catch (clerkError) {
        console.warn("Failed to get Clerk data:", clerkError);
        
        // Fallback: Create user with just the ID
        const newUser = await ctx.db.users.create({
          data: {
            id: userId,
            // No name field since it doesn't exist in the database
          },
        });
        
        return newUser;
      }
    } catch (error) {
      console.error("Error syncing user:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to sync user: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }),
});