import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const adminRouter = createTRPCRouter({
  testConnection: publicProcedure
    .query(async ({ ctx }) => {      
      try {
        const userCount = await ctx.db.users.count();
        const bookingCount = await ctx.db.bookings.count();
        
        return {
          success: true,
          userCount,
          bookingCount,
          message: "Database connection working!"
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection test failed",
        });
      }
    }),

  getPendingBookings: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(10),
      page: z.number().min(1).default(1),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {      
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available",
        });
      }

      try {
        const skip = (input.page - 1) * input.limit;
        
        const where: any = {
          status: "pending"
        };
        
        if (input.search) {
          where.OR = [
            { eventName: { contains: input.search, mode: "insensitive" } },
            { requesterName: { contains: input.search, mode: "insensitive" } },
            { faculty: { contains: input.search, mode: "insensitive" } }
          ];
        }

        const [bookings, total] = await Promise.all([
          ctx.db.bookings.findMany({
            where,
            include: {
              room: {
                select: {
                  id: true,
                  name: true,
                  facilityId: true,
                  capacity: true
                }
              }
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: input.limit,
          }),
          ctx.db.bookings.count({ where })
        ]);

        return {
          bookings,
          pagination: {
            currentPage: input.page,
            totalPages: Math.ceil(total / input.limit),
            totalItems: total,
            hasNext: input.page * input.limit < total,
            hasPrev: input.page > 1,
          }
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  getAllBookings: publicProcedure
    .input(z.object({
      status: z.enum(["all", "pending", "accepted", "rejected", "completed"]).default("all"),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(10),
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {      
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available",
        });
      }

      try {
        const skip = (input.page - 1) * input.limit;
        
        const where: any = {};
        
        if (input.status !== "all") {
          where.status = input.status;
        }
        
        if (input.search) {
          where.OR = [
            { eventName: { contains: input.search, mode: "insensitive" } },
            { requesterName: { contains: input.search, mode: "insensitive" } },
            { faculty: { contains: input.search, mode: "insensitive" } },
            { eventType: { contains: input.search, mode: "insensitive" } }
          ];
        }

        const [bookings, total] = await Promise.all([
          ctx.db.bookings.findMany({
            where,
            include: {
              room: {
                select: {
                  id: true,
                  name: true,
                  facilityId: true,
                  capacity: true
                }
              }
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: input.limit,
          }),
          ctx.db.bookings.count({ where })
        ]);

        return {
          bookings,
          pagination: {
            currentPage: input.page,
            totalPages: Math.ceil(total / input.limit),
            totalItems: total,
            hasNext: input.page * input.limit < total,
            hasPrev: input.page > 1,
          }
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  approveBooking: publicProcedure
    .input(z.object({
      bookingId: z.number(),
      adminNote: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {      
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available",
        });
      }

      try {
        const booking = await ctx.db.bookings.findUnique({
          where: { id: input.bookingId },
        });

        if (!booking) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Booking not found",
          });
        }

        if (booking.status !== "pending") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only pending bookings can be accepted",
          });
        }

        const adminId = ctx.userId || "temp-admin-id";

        const updatedBooking = await ctx.db.bookings.update({
          where: { id: input.bookingId },
          data: {
            status: "accepted",
            approvedAt: new Date(),
            approvedBy: adminId,
            adminNote: input.adminNote,
          },
          include: {
            room: true
          }
        });

        return updatedBooking;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to accept booking: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  rejectBooking: publicProcedure
    .input(z.object({
      bookingId: z.number(),
      rejectionReason: z.string().min(1, "Rejection reason is required"),
    }))
    .mutation(async ({ ctx, input }) => {      
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available",
        });
      }

      try {
        const booking = await ctx.db.bookings.findUnique({
          where: { id: input.bookingId },
        });

        if (!booking) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Booking not found",
          });
        }

        if (booking.status !== "pending") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only pending bookings can be rejected",
          });
        }

        const adminId = ctx.userId || "temp-admin-id";

        const updatedBooking = await ctx.db.bookings.update({
          where: { id: input.bookingId },
          data: {
            status: "rejected",
            rejectedAt: new Date(),
            rejectedBy: adminId,
            rejectionReason: input.rejectionReason,
          },
          include: {
            room: true
          }
        });

        return updatedBooking;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to reject booking: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  debugAuth: publicProcedure
    .query(async ({ ctx }) => {
      return {
        userId: ctx.userId,
        sessionId: ctx.sessionId,
        hasDb: !!ctx.db,
        message: ctx.userId ? "Authentication working!" : "No authentication found"
      };
    }),
});