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
  pics: Array<{
    id: string;
    name: string;
    role: string;
  }>;
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

  getAllBookings: protectedProcedure
    .input(z.object({
      status: z.enum(["all", "pending", "accepted", "rejected", "completed", "cancelled"]).default("all"),
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
        const userId = ctx.userId;
        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          });
        }

        // Get user with their role
        const currentUser = await ctx.db.users.findUnique({
          where: { id: userId },
          select: {
            id: true,
            role: true,
          }
        });

        if (!currentUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        // Check if user has admin rights
        if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied. Admin role required.",
          });
        }

        // Get managed labs based on role
        let managedLabs: Array<{ id: string; name: string; facilityId: string }> = [];
        let canAccessAllLabs = false;

        if (currentUser.role === 'super_admin') {
          // Super admin can access all labs
          const allLabs = await ctx.db.lab.findMany({
            select: {
              id: true,
              name: true,
              facilityId: true
            }
          });
          managedLabs = allLabs;
          canAccessAllLabs = true;
        } else if (currentUser.role === 'admin') {
          // Admin can only access labs where they are PIC
          managedLabs = await ctx.db.$queryRaw`
            SELECT "id", "name", "facilityId" FROM "rooms" 
            WHERE "picIds"::jsonb ? ${userId}
          ` as Array<{ id: string; name: string; facilityId: string }>;
        }

        const skip = (input.page - 1) * input.limit;
        
        interface BookingWhereClause {
          status?: string;
          OR?: Array<{
            eventName?: { contains: string; mode: "insensitive" };
            requesterName?: { contains: string; mode: "insensitive" };
            faculty?: { contains: string; mode: "insensitive" };
            eventType?: { contains: string; mode: "insensitive" };
          }> | Array<{
            status?: string;
            AND?: Array<any>;
          }>;
          roomId?: { in: string[] };
          bookingDate?: { lt: Date } | { gte: Date };
          AND?: Array<any>;
        }
        
        const where: BookingWhereClause = {};
        
        if (input.status !== "all") {
          // Special handling for completed tab
          if (input.status === "completed") {
            // Show both:
            // 1. Bookings with status "completed"
            // 2. Accepted bookings that are more than 1 day past their booking date
            const oneDayAgo = new Date();
            oneDayAgo.setDate(oneDayAgo.getDate() - 1);
            oneDayAgo.setHours(23, 59, 59, 999); // End of the day 1 day ago
            
            where.OR = [
              { status: "completed" },
              {
                AND: [
                  { status: "accepted" },
                  { bookingDate: { lt: oneDayAgo } }
                ]
              }
            ];
          } else if (input.status === "accepted") {
            // Show only accepted bookings that haven't passed the 1-day completion threshold
            const oneDayAgo = new Date();
            oneDayAgo.setDate(oneDayAgo.getDate() - 1);
            oneDayAgo.setHours(23, 59, 59, 999);
            
            where.AND = [
              { status: "accepted" },
              { bookingDate: { gte: oneDayAgo } }
            ];
          } else {
            // For other statuses (pending, rejected, cancelled), show as normal
            where.status = input.status;
          }
        }
        
        if (input.search) {
          const searchConditions = [
            { eventName: { contains: input.search, mode: "insensitive" as const } },
            { requesterName: { contains: input.search, mode: "insensitive" as const } },
            { faculty: { contains: input.search, mode: "insensitive" as const } },
            { eventType: { contains: input.search, mode: "insensitive" as const } }
          ];

          if (where.OR && Array.isArray(where.OR) && where.OR.length > 0) {
            // If we already have OR conditions (like for completed tab), wrap everything in AND
            where.AND = [
              { OR: where.OR },
              { OR: searchConditions }
            ];
            delete where.OR;
          } else {
            // Normal search
            where.OR = searchConditions;
          }
        }

        // If user is not super_admin, filter by assigned labs only
        if (currentUser.role === 'admin') {
          const managedLabIds = managedLabs.map(lab => lab.id);
          
          if (managedLabIds.length === 0) {
            // Admin not assigned to any labs - return empty result
            return {
              bookings: [],
              pagination: {
                currentPage: input.page,
                totalPages: 0,
                totalItems: 0,
                hasNext: false,
                hasPrev: false,
              },
              userInfo: {
                role: currentUser.role,
                managedLabs: managedLabs,
                canAccessAllLabs: canAccessAllLabs
              }
            };
          }
          
          // Filter bookings by assigned labs
          where.roomId = {
            in: managedLabIds
          };
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
          },
          userInfo: {
            role: currentUser.role,
            managedLabs: managedLabs,
            canAccessAllLabs: canAccessAllLabs
          }
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),

  approveBooking: protectedProcedure
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
        const userId = ctx.userId;
        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          });
        }

        // Get user with their managed labs and role
        const currentUser = await ctx.db.users.findUnique({
          where: { id: userId },
          select: {
            id: true,
            role: true,
          }
        });

        // Get managed labs separately since picIds is stored as JSON
        const managedLabs = await ctx.db.$queryRaw`
          SELECT "id", "name", "facilityId" FROM "rooms" 
          WHERE "picIds"::jsonb ? ${userId}
        ` as Array<{ id: string; name: string; facilityId: string }>;

        if (!currentUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied. Admin role required.",
          });
        }

        const booking = await ctx.db.bookings.findUnique({
          where: { id: input.bookingId },
          include: {
            room: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });

        if (!booking) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Booking not found",
          });
        }

        // Check if admin has access to this lab (unless super_admin)
        if (currentUser.role === 'admin') {
          const managedLabIds = managedLabs.map(lab => lab.id);
          if (!managedLabIds.includes(booking.roomId)) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Access denied. You can only manage bookings for labs assigned to you.",
            });
          }
        }

        if (booking.status !== "pending") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only pending bookings can be accepted",
          });
        }

        const adminId = ctx.userId ?? "temp-admin-id";

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

  rejectBooking: protectedProcedure
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
        const userId = ctx.userId;
        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          });
        }

        // Get user with their managed labs and role
        const currentUser = await ctx.db.users.findUnique({
          where: { id: userId },
          select: {
            id: true,
            role: true,
          }
        });

        // Get managed labs separately since picIds is stored as JSON
        const managedLabs = await ctx.db.$queryRaw`
          SELECT "id", "name", "facilityId" FROM "rooms" 
          WHERE "picIds"::jsonb ? ${userId}
        ` as Array<{ id: string; name: string; facilityId: string }>;

        if (!currentUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied. Admin role required.",
          });
        }

        const booking = await ctx.db.bookings.findUnique({
          where: { id: input.bookingId },
          include: {
            room: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });

        if (!booking) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Booking not found",
          });
        }

        // Check if admin has access to this lab (unless super_admin)
        if (currentUser.role === 'admin') {
          const managedLabIds = managedLabs.map(lab => lab.id);
          if (!managedLabIds.includes(booking.roomId)) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Access denied. You can only manage bookings for labs assigned to you.",
            });
          }
        }

        if (booking.status !== "pending") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only pending bookings can be rejected",
          });
        }

        const adminId = ctx.userId ?? "temp-admin-id";

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

  cancelBooking: protectedProcedure
    .input(z.object({
      bookingId: z.number(),
      cancelReason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {      
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available",
        });
      }

      try {
        const userId = ctx.userId;
        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          });
        }

        // Get current user with their managed labs and role
        const currentUser = await ctx.db.users.findUnique({
          where: { id: userId },
          select: {
            id: true,
            role: true,
          }
        });

        // Get managed labs separately since picIds is stored as JSON
        const managedLabs = await ctx.db.$queryRaw`
          SELECT "id", "name", "facilityId" FROM "rooms" 
          WHERE "picIds"::jsonb ? ${userId}
        ` as Array<{ id: string; name: string; facilityId: string }>;

        if (!currentUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        const booking = await ctx.db.bookings.findUnique({
          where: { id: input.bookingId },
          include: {
            room: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });

        if (!booking) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Booking not found",
          });
        }

        // Check permissions:
        // 1. User can cancel their own accepted bookings
        // 2. Admin can cancel accepted bookings for their assigned labs
        // 3. Super admin can cancel any accepted booking
        const isOwner = booking.userId === userId;
        const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';
        const isSuper = currentUser.role === 'super_admin';
        
        let hasPermission = false;
        
        if (isOwner) {
          hasPermission = true;
        } else if (isSuper) {
          hasPermission = true;
        } else if (isAdmin) {
          const managedLabIds = managedLabs.map(lab => lab.id);
          hasPermission = managedLabIds.includes(booking.roomId);
        }

        if (!hasPermission) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied. You can only cancel your own bookings or bookings for labs you manage.",
          });
        }

        if (booking.status !== "accepted") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only accepted bookings can be cancelled",
          });
        }

        // Check if booking date is in the past (cannot cancel past bookings)
        const bookingDateTime = new Date(booking.bookingDate);
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Set to start of today
        
        if (bookingDateTime < now) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot cancel bookings for past dates",
          });
        }

        const updatedBooking = await ctx.db.bookings.update({
          where: { id: input.bookingId },
          data: {
            status: "cancelled",
            rejectedAt: new Date(), // Reuse rejectedAt field for cancelled timestamp
            rejectedBy: userId,
            rejectionReason: input.cancelReason ?? `Cancelled by ${isOwner ? 'user' : 'admin'}`,
          },
          include: {
            room: true
          }
        });

        return updatedBooking;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to cancel booking: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

        let labs: Awaited<ReturnType<typeof ctx.db.lab.findMany>>;
        if (user.role === 'super_admin') {
          // Super admin can access all labs
          labs = await ctx.db.lab.findMany({
            orderBy: { name: "asc" },
          });
        } else if (user.role === 'admin') {
          // Admin can only access labs where they are PIC
          labs = await ctx.db.$queryRaw`
            SELECT * FROM "rooms" 
            WHERE "picIds"::jsonb ? ${ctx.userId}
            ORDER BY "name" ASC
          ` as any;
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
            picIds: string[] | null;
          }>;

          const result = await Promise.all(labsArray.map(async (room) => {
            let picsWithNames: Array<{ id: string; name: string; role: string }> = [];
            if (room.picIds && Array.isArray(room.picIds)) {
              const picPromises = room.picIds.map(async (picId) => {
                try {
                  const clerkUser = await clerkClient.users.getUser(picId);
                  const fullName = `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim();
                  return {
                    id: picId,
                    name: fullName ?? clerkUser.username ?? 'Unknown User',
                    role: 'admin',
                  };
                } catch {
                  return {
                    id: picId,
                    name: `User ${picId.slice(0, 8)}`,
                    role: 'admin',
                  };
                }
              });
              picsWithNames = await Promise.all(picPromises);
            }

            return {
              id: room.id,
              name: room.name ?? '',
              facilityId: room.facilityId,
              department: "Faculty of Information & Technology",
              type: room.type ?? "Unknown",
              capacity: room.capacity ?? 0,
              image: room.image ?? "",
              pics: picsWithNames,
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
          const labs = await ctx.db.$queryRaw`
            SELECT * FROM "rooms" 
            WHERE "facilityId" = ${input.id} AND "picIds"::jsonb ? ${ctx.userId}
            LIMIT 1
          ` as any;
          lab = labs && (labs as any[]).length > 0 ? (labs as any[])[0] : null;
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
      picIds: z.array(z.string()),
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

        // Update user roles to admin for all PICs
        for (const picId of input.picIds) {
          await ctx.db.users.upsert({
            where: { id: picId },
            update: { role: "admin" },
            create: {
              id: picId,
              role: "admin",
            },
          });

          // Update Clerk metadata
          await clerkClient.users.updateUserMetadata(picId, {
            publicMetadata: {
              role: "admin"
            }
          });
        }

        // Update lab PICs
        const updatedLab = await ctx.db.lab.update({
          where: { id: input.labId },
          data: { picIds: input.picIds },
          select: {
            id: true,
            name: true,
            facilityId: true,
            picIds: true,
          }
        });

        return {
          success: true,
          lab: updatedLab,
          message: "Lab PICs updated successfully"
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error setting lab PICs:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to set lab PICs",
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

        // Get all admin users from database (only admin role, not super_admin)
        const dbAdmins = await ctx.db.users.findMany({
          where: {
            role: 'admin'
          },
          select: {
            id: true,
            role: true,
          },
          orderBy: { id: "asc" }, // alphabetical by ID
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
