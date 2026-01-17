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
  picIds: string[];
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
        // Auto-complete bookings that are 1 day past the booking date
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        oneDayAgo.setHours(23, 59, 59, 999); // Set to end of day

        await ctx.db.bookings.updateMany({
          where: {
            status: "accepted",
            bookingDate: {
              lt: oneDayAgo,
            },
          },
          data: {
            status: "completed",
          },
        });

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

        // Auto-complete bookings that are 1 day past the booking date
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        oneDayAgo.setHours(23, 59, 59, 999); // Set to end of day

        await ctx.db.bookings.updateMany({
          where: {
            status: "accepted",
            bookingDate: {
              lt: oneDayAgo,
            },
          },
          data: {
            status: "completed",
          },
        });

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
          where.status = input.status;
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

        let labs: Array<{
          id: string;
          name: string;
          facilityId: string;
          department: string;
          type: string;
          capacity: number;
          image: string | null;
          picIds: unknown;
        }>;

        if (user.role === 'super_admin') {
          // Super admin can access all labs
          labs = await ctx.db.lab.findMany({
            orderBy: { name: "asc" },
          });
        } else if (user.role === 'admin') {
          // Admin can access all labs (but booking behavior depends on PIC status)
          labs = await ctx.db.lab.findMany({
            orderBy: { name: "asc" },
          });
        } else {
          // Other roles cannot access any labs
          labs = [];
        }

        // Get labs with PIC info
        const labsWithPIC: LabWithPIC[] = await Promise.all(labs.map(async (room) => {
          let picsWithNames: Array<{ id: string; name: string; role: string }> = [];
          let picIdsArray: string[] = [];
          
          if (room.picIds) {
            try {
              // Parse picIds - it could be a JSON string or already parsed
              if (typeof room.picIds === 'string') {
                picIdsArray = JSON.parse(room.picIds) as string[];
              } else if (Array.isArray(room.picIds)) {
                picIdsArray = room.picIds as string[];
              }
              
              if (Array.isArray(picIdsArray) && picIdsArray.length > 0) {
                const picPromises = picIdsArray.map(async (picId) => {
                  try {
                    const clerkUser = await clerkClient.users.getUser(picId);
                    const fullName = `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim();
                    return {
                      id: picId,
                      name: fullName || clerkUser.username || 'Unknown User',
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
            } catch (error) {
              console.error("Error parsing picIds:", error);
            }
          }

          return {
            id: room.id,
            name: room.name,
            facilityId: room.facilityId,
            department: room.department,
            type: room.type,
            capacity: room.capacity,
            image: room.image,
            picIds: picIdsArray,
            pics: picsWithNames,
          };
        }));

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

        let lab: {
          id: string;
          name: string;
          facilityId: string;
          department: string;
          type: string;
          capacity: number;
          image: string | null;
        } | null = null;

        if (user.role === 'super_admin') {
          // Super admin can access any lab
          lab = await ctx.db.lab.findUnique({
            where: { facilityId: input.id },
          });
        } else if (user.role === 'admin') {
          // Admin can access all labs (booking behavior depends on PIC status)
          lab = await ctx.db.lab.findUnique({
            where: { facilityId: input.id },
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
          name: lab.name,
          facilityId: lab.facilityId,
          department: lab.department,
          type: lab.type,
          capacity: lab.capacity,
          image: lab.image ?? "",
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

          // Update Clerk metadata - check if user exists first
          try {
            const clerkUser = await clerkClient.users.getUser(picId);
            if (clerkUser) {
              await clerkClient.users.updateUserMetadata(picId, {
                publicMetadata: {
                  role: "admin"
                }
              });
            }
          } catch (clerkError) {
            // User might not exist in Clerk yet, skip metadata update
            console.warn(`Could not update Clerk metadata for user ${picId}:`, clerkError);
          }
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

        // Get admins from database first (more reliable than scanning all Clerk users)
        const dbAdmins = await ctx.db.users.findMany({
          where: {
            OR: [
              { role: 'admin' },
              { role: 'super_admin' }
            ]
          },
          select: {
            id: true,
            role: true,
          }
        });

        // Enrich with names from Clerk (batch get)
        const adminIds = dbAdmins.map(admin => admin.id);
        const adminsWithNames = await Promise.all(
          adminIds.map(async (adminId) => {
            try {
              const clerkUser = await clerkClient.users.getUser(adminId);
              const fullName = `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim();
              const email = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ?? '';
              const dbAdmin = dbAdmins.find(a => a.id === adminId);
              
              return {
                id: adminId,
                name: fullName || clerkUser.username || email || 'Unknown User',
                role: dbAdmin?.role ?? 'admin',
              };
            } catch (error) {
              console.error(`Failed to fetch Clerk user ${adminId}:`, error);
              // If Clerk fails, still return the admin with ID as name
              const dbAdmin = dbAdmins.find(a => a.id === adminId);
              return {
                id: adminId,
                name: `Admin ${adminId.slice(0, 8)}`,
                role: dbAdmin?.role ?? 'admin',
              };
            }
          })
        );

        return adminsWithNames.sort((a, b) => a.name.localeCompare(b.name));
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

  getAllUsers: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
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
            message: "Only super admin can view users",
          });
        }

        // Get all users from database with student/user role
        const dbUsers = await ctx.db.users.findMany({
          where: {
            role: 'user',
          },
          select: {
            id: true,
            role: true,
          },
          take: input.limit,
        });

        // Enrich with names from Clerk
        const usersWithNames = await Promise.all(
          dbUsers.map(async (dbUser) => {
            try {
              const clerkUser = await clerkClient.users.getUser(dbUser.id);
              const fullName = `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim();
              const email = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ?? '';
              
              return {
                id: dbUser.id,
                name: fullName || clerkUser.username || email || 'Unknown User',
                email: email,
                role: dbUser.role,
              };
            } catch (error) {
              console.error(`Failed to fetch Clerk user ${dbUser.id}:`, error);
              return {
                id: dbUser.id,
                name: `User ${dbUser.id.slice(0, 8)}`,
                email: '',
                role: dbUser.role,
              };
            }
          })
        );

        // Filter by search if provided
        let filteredUsers = usersWithNames;
        if (input.search) {
          const searchLower = input.search.toLowerCase();
          filteredUsers = usersWithNames.filter(
            user => 
              user.name.toLowerCase().includes(searchLower) ||
              user.email.toLowerCase().includes(searchLower)
          );
        }

        return filteredUsers.sort((a, b) => a.name.localeCompare(b.name));
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error fetching users:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch users",
        });
      }
    }),

  promoteToAdmin: protectedProcedure
    .input(z.object({
      userId: z.string(),
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
            message: "Only super admin can promote users to admin",
          });
        }

        // Check if target user exists
        const targetUser = await ctx.db.users.findUnique({
          where: { id: input.userId },
        });

        if (!targetUser) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }

        if (targetUser.role === 'admin' || targetUser.role === 'super_admin') {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User is already an admin",
          });
        }

        // Update user role to admin
        const updatedUser = await ctx.db.users.update({
          where: { id: input.userId },
          data: { role: 'admin' },
        });

        return {
          success: true,
          user: updatedUser,
          message: "User promoted to admin successfully",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error promoting user to admin:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to promote user to admin",
        });
      }
    }),
});
