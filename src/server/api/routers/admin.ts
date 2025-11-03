import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { clerkClient } from "@clerk/clerk-sdk-node";

interface LabWithPIC {
  id: string;
  name: string;
  facilityId: string;
  department: string;
  type: string;
  capacity: number;
  image: string | null;
  pic: {
    id: string;
    name: string;
    role: string;
  } | null;
}

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

  getAccessibleLabs: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      try {
        // Get user role
        const user = await ctx.db.users.findUnique({
          where: { id: ctx.userId },
          select: { role: true },
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        let labs: Awaited<ReturnType<typeof ctx.db.lab.findMany<{ include: { pic: { select: { id: true; role: true } } } }>>>;
        if (user.role === 'super_admin') {
          // Super admin can access all labs
          labs = await ctx.db.lab.findMany({
            include: {
              pic: {
                select: {
                  id: true,
                  role: true,
                }
              }
            },
            orderBy: { name: "asc" },
          });
        } else if (user.role === 'admin') {
          // Admin can only access labs where they are PIC
          labs = await ctx.db.lab.findMany({
            where: { picId: ctx.userId },
            include: {
              pic: {
                select: {
                  id: true,
                  role: true,
                }
              }
            },
            orderBy: { name: "asc" },
          });
        } else {
          // Other roles cannot access any labs
          labs = [];
        }

        // Get labs with PIC info
        const labsWithPIC: LabWithPIC[] = await (async (): Promise<LabWithPIC[]> => {
          // Type assertion for Prisma query result
          const labsArray = labs as Array<{
            id: string;
            name: string | null;
            facilityId: string;
            type: string | null;
            capacity: number | null;
            image: string | null;
            pic: {
              id: string;
              role: string;
            } | null;
          }>;

          const result = await Promise.all(labsArray.map(async (room) => {
            let picWithName = null;
            if (room.pic) {
              try {
                const clerkUser = await clerkClient.users.getUser(room.pic.id);
                const fullName = `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim();
                picWithName = {
                  id: room.pic.id,
                  name: fullName ?? clerkUser.username ?? 'Unknown User',
                  role: room.pic.role,
                };
              } catch {
                // If Clerk user not found, use fallback name
                picWithName = {
                  id: room.pic.id,
                  name: `User ${room.pic.id.slice(0, 8)}`,
                  role: room.pic.role,
                };
              }
            }

            return {
              id: room.id,
              name: room.name ?? '',
              facilityId: room.facilityId,
              department: "Faculty of Information & Technology",
              type: room.type ?? "Unknown",
              capacity: room.capacity ?? 0,
              image: room.image ?? "",
              pic: picWithName,
            };
          }));
          return result;
        })();

        return labsWithPIC;
      } catch (error) {
        console.error("Error fetching accessible labs:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch accessible laboratories",
        });
      }
    }),

  getAccessibleLabById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      try {
        // Get user role
        const user = await ctx.db.users.findUnique({
          where: { id: ctx.userId },
          select: { role: true },
        });

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        let lab;
        if (user.role === 'super_admin') {
          // Super admin can access any lab
          lab = await ctx.db.lab.findUnique({
            where: { facilityId: input.id },
          });
        } else if (user.role === 'admin') {
          // Admin can only access labs where they are PIC
          lab = await ctx.db.lab.findFirst({
            where: {
              facilityId: input.id,
              picId: ctx.userId
            },
          });
        } else {
          // Other roles cannot access any labs
          lab = null;
        }

        if (!lab) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Lab not found or access denied",
          });
        }

        return {
          id: lab.id,
          name: lab.name || '',
          facilityId: lab.facilityId,
          department: "Faculty of Information & Technology",
          type: lab.type || "Unknown",
          capacity: lab.capacity || 0,
          image: lab.image || "",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error fetching accessible lab by ID:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch laboratory details",
        });
      }
    }),

  setLabPIC: protectedProcedure
    .input(z.object({
      labId: z.string(),
      picId: z.string().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      try {
        // Check if user is super admin
        const user = await ctx.db.users.findUnique({
          where: { id: ctx.userId },
          select: { role: true },
        });

        if (!user || user.role !== 'super_admin') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only super admin can set lab PIC",
          });
        }

        // If setting a PIC, make sure they have admin role
        if (input.picId) {
          // Update user role to admin if not already
          await ctx.db.users.upsert({
            where: { id: input.picId },
            update: { role: "admin" },
            create: {
              id: input.picId,
              role: "admin",
            },
          });

          // Update Clerk metadata
          await clerkClient.users.updateUserMetadata(input.picId, {
            publicMetadata: {
              role: "admin"
            }
          });
        }

        // Update lab PIC
        const updatedLab = await ctx.db.lab.update({
          where: { id: input.labId },
          data: { picId: input.picId },
          select: {
            id: true,
            name: true,
            facilityId: true,
            pic: {
              select: {
                id: true,
                role: true,
              }
            }
          }
        });

        return {
          success: true,
          lab: updatedLab,
          message: "Lab PIC updated successfully"
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error setting lab PIC:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to set lab PIC",
        });
      }
    }),

  getAdmins: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      try {
        // Check if user is super admin
        const user = await ctx.db.users.findUnique({
          where: { id: ctx.userId },
          select: { role: true },
        });

        if (!user || user.role !== 'super_admin') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only super admin can view admins",
          });
        }

        // Get all admin users from database
        const dbAdmins = await ctx.db.users.findMany({
          where: {
            role: {
              in: ['admin', 'super_admin']
            }
          },
          select: {
            id: true,
            role: true,
          },
          orderBy: { role: "desc" }, // super_admin first
        });

        // Get user details from Clerk for each admin (with better error handling)
        const adminsWithNames = await Promise.all(
          dbAdmins.map(async (admin) => {
            try {
              const clerkUser = await clerkClient.users.getUser(admin.id);
              const fullName = `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim();
              return {
                id: admin.id,
                name: fullName ?? clerkUser.username ?? 'Unknown User',
                role: admin.role,
              };
            } catch {
              // If Clerk user not found or other error, return with ID only (silent handling)
              return {
                id: admin.id,
                name: `User ${admin.id.slice(0, 8)}`,
                role: admin.role,
              };
            }
          })
        );

        return adminsWithNames;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error fetching admins:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch admins",
        });
      }
    }),
});