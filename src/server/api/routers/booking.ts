import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";

export const bookingRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({
      labId: z.string(),
      bookingDate: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      participants: z.number(),
      eventName: z.string(),
      eventType: z.string(),
      phone: z.string(),
      faculty: z.string(),
      userData: z.object({
        name: z.string(),
        nim: z.string()
      })
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // First ensure the user exists in the database
        let userId;
        
        // Check if user is authenticated
        if (ctx.auth && ctx.auth.userId) {
          userId = ctx.auth.userId;
        } else {
          // Try to find an existing user or create a new one
          const existingUser = await ctx.db.users.findFirst();
          
          if (existingUser) {
            userId = existingUser.id;
          } else {
            // Create a new user if none exists
            const newUser = await ctx.db.users.create({
              data: {}  // Just create with default values
            });
            userId = newUser.id;
          }
        }
        
        // Now create the booking with a valid userId and requester info
        const booking = await ctx.db.bookings.create({
          data: {
            userId: userId, // Use the valid userId we just ensured exists
            roomId: input.labId,
            bookingDate: new Date(input.bookingDate),
            startTime: input.startTime,
            endTime: input.endTime,
            participants: input.participants,
            eventName: input.eventName,
            eventType: input.eventType,
            phone: input.phone,
            faculty: input.faculty,
            status: "pending",
            // Tambahkan informasi pemohon dari userData
            requesterName: input.userData.name,
            requesterNIM: input.userData.nim
          }
        });
        
        return {
          success: true,
          bookingId: booking.id
        };
      } catch (error) {
        console.error("Error creating booking:", error);
        throw new Error("Failed to create booking. Please try again.");
      }
    }),
    
  // Tambahkan endpoint untuk mendapatkan daftar booking
  getAll: publicProcedure.query(async ({ ctx }) => {
    try {
      const bookings = await ctx.db.bookings.findMany({
        include: {
          room: true,  // Include room details
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      return bookings;
    } catch (error) {
      console.error("Error fetching bookings:", error);
      throw new Error("Failed to fetch bookings");
    }
  }),
  
  // Endpoint untuk mendapatkan booking berdasarkan ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const booking = await ctx.db.bookings.findUnique({
          where: { id: input.id },
          include: {
            room: true,
          },
        });
        
        if (!booking) {
          throw new Error("Booking not found");
        }
        
        return booking;
      } catch (error) {
        console.error("Error fetching booking:", error);
        throw new Error("Failed to fetch booking details");
      }
    }),

  // Get current user's active bookings
  getCurrentUserBookings: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        page: z.number().min(1).default(1),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { limit, page, search } = input;
        const skip = (page - 1) * limit;

        // Create search filter
        const searchFilter = search
          ? {
              OR: [
                { eventName: { contains: search } },
                { room: { name: { contains: search } } },
                { room: { facilityId: { contains: search } } },
              ],
            }
          : {};

        // Get active bookings (not completed or cancelled)
        const bookings = await ctx.db.bookings.findMany({
          where: {
            userId: ctx.auth.userId,
            status: {
              notIn: ["completed", "cancelled"],
            },
            ...searchFilter,
          },
          include: {
            room: {
              select: {
                name: true,
                facilityId: true,
              },
            },
          },
          orderBy: {
            bookingDate: "asc",
          },
          skip,
          take: limit,
        });

        // Get total count for pagination
        const total = await ctx.db.bookings.count({
          where: {
            userId: ctx.auth.userId,
            status: {
              notIn: ["completed", "cancelled"],
            },
            ...searchFilter,
          },
        });

        return {
          bookings,
          total,
        };
      } catch (error) {
        console.error("Error fetching current bookings:", error);
        throw new Error("Failed to fetch current bookings");
      }
    }),

  getCompletedUserBookings: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        page: z.number().min(1).default(1),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { limit, page, search } = input;
        const skip = (page - 1) * limit;

        const searchFilter = search
          ? {
              OR: [
                { eventName: { contains: search } },
                { room: { name: { contains: search } } },
                { room: { facilityId: { contains: search } } },
              ],
            }
          : {};

        // Get completed bookings
        const bookings = await ctx.db.bookings.findMany({
          where: {
            userId: ctx.auth.userId,
            status: {
              in: ["completed", "cancelled"],
            },
            ...searchFilter,
          },
          include: {
            room: {
              select: {
                name: true,
                facilityId: true,
              },
            },
          },
          orderBy: {
            bookingDate: "desc",
          },
          skip,
          take: limit,
        });

        // Get total count for pagination
        const total = await ctx.db.bookings.count({
          where: {
            userId: ctx.auth.userId,
            status: {
              in: ["completed", "cancelled"],
            },
            ...searchFilter,
          },
        });

        return {
          bookings,
          total,
        };
      } catch (error) {
        console.error("Error fetching completed bookings:", error);
        throw new Error("Failed to fetch completed bookings");
      }
    }),

  // Cancel a booking
  cancelBooking: protectedProcedure
  .input(z.object({ 
    id: z.union([z.string(), z.number()]) 
  }))
  .mutation(async ({ ctx, input }) => {
    try {
      // Convert the ID to the correct type based on your database schema
      // If your DB uses numeric IDs:
      const bookingId = typeof input.id === "string" ? parseInt(input.id) : input.id;
      
      const booking = await ctx.db.bookings.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        throw new Error("Booking not found");
      }

      if (booking.userId !== ctx.auth.userId) {
        throw new Error("You can only cancel your own bookings");
      }

      return ctx.db.bookings.update({
        where: { id: bookingId },
        data: { status: "cancelled" },
      });
    } catch (error) {
      console.error("Error cancelling booking:", error);
      throw new Error("Failed to cancel booking");
    }
  }),

  getAllBookings: publicProcedure.query(async ({ ctx }) => {
    try {
      const bookings = await ctx.db.bookings.findMany({
        include: {
          room: {
            select: {
              name: true,
              facilityId: true
            }
          },
          user: true
        },
        orderBy: {
          bookingDate: 'asc',
        },
      });
      
      // Make sure data is properly formatted for the client
      const formattedBookings = bookings.map(booking => ({
        ...booking,
        // Ensure consistent date format
        bookingDate: booking.bookingDate instanceof Date 
          ? booking.bookingDate.toISOString().split('T')[0]
          : booking.bookingDate
      }));
      
      return formattedBookings;
    } catch (error) {
      console.error("Error fetching all bookings:", error);
      throw new Error("Failed to fetch bookings for calendar");
    }
  }),

  // Add this to your booking router (src/server/api/routers/booking.ts)
checkConflicts: publicProcedure
  .input(z.object({
    labId: z.string(),
    bookingDate: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    excludeBookingId: z.union([z.string(), z.number()]).optional()
  }))
  .query(async ({ ctx, input }) => {
    try {
      // Validate and format the booking date
      const inputDate = new Date(input.bookingDate);
      if (isNaN(inputDate.getTime())) {
        throw new Error("Invalid booking date provided");
      }
      
      const formattedDate = inputDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Convert excludeBookingId to number if provided
      const excludeId = input.excludeBookingId 
        ? (typeof input.excludeBookingId === 'string' 
            ? parseInt(input.excludeBookingId) 
            : input.excludeBookingId)
        : undefined;
      
      // Validate excludeId if provided
      if (excludeId !== undefined && isNaN(excludeId)) {
        throw new Error("Invalid excludeBookingId provided");
      }
      
      // Find any overlapping bookings for the same lab
      const conflictingBookings = await ctx.db.bookings.findMany({
        where: {
          roomId: input.labId,
          bookingDate: formattedDate ? new Date(formattedDate) : undefined, // Now guaranteed to be a valid date string
          status: {
            notIn: ['cancelled', 'rejected']
          },
          id: excludeId ? {
            not: excludeId
          } : undefined,
          // Check for time overlap
          OR: [
            // Case 1: New booking starts during an existing booking
            {
              startTime: {
                lte: input.startTime
              },
              endTime: {
                gt: input.startTime
              }
            },
            // Case 2: New booking ends during an existing booking
            {
              startTime: {
                lt: input.endTime
              },
              endTime: {
                gte: input.endTime
              }
            },
            // Case 3: New booking completely contains an existing booking
            {
              startTime: {
                gte: input.startTime
              },
              endTime: {
                lte: input.endTime
              }
            }
          ]
        }
      });
      
      return {
        hasConflicts: conflictingBookings.length > 0,
        conflictingBookings
      };
    } catch (error) {
      console.error("Error checking conflicts:", error);
      throw new Error("Failed to check booking conflicts");
    }
  }),
  
});