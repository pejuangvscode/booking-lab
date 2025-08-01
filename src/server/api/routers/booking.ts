import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

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
    id: z.number() // Should be z.number(), not z.string()
  }))
  .mutation(async ({ ctx, input }) => {
    try {
      // Check if booking exists and belongs to user
      const existingBooking = await ctx.db.bookings.findUnique({
        where: { 
          id: input.id, // input.id is now guaranteed to be a number
          userId: ctx.auth.userId
        }
      });

      if (!existingBooking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found or you don't have permission to cancel it",
        });
      }

      // Check if booking can be cancelled
      if (existingBooking.status.toLowerCase() === 'cancelled') {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Booking is already cancelled",
        });
      }

      // Update booking status to cancelled
      const cancelledBooking = await ctx.db.bookings.update({
        where: { id: input.id },
        data: { 
          status: 'cancelled',
        },
        include: {
          room: true
        }
      });

      return cancelledBooking;
    } catch (error) {
      console.error("Error cancelling booking:", error);
      
      if (error instanceof TRPCError) {
        throw error;
      }
      
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to cancel booking",
      });
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
      participants: z.number(),
      bookingType: z.enum(["full", "partial"]),
      excludeBookingId: z.union([z.string(), z.number()]).optional()
    }))
    .query(async ({ ctx, input }) => {
      try {
        
        // Validate and format the booking date
        const inputDate = new Date(input.bookingDate);
        if (isNaN(inputDate.getTime())) {
          throw new Error("Invalid booking date provided");
        }
        
        // Format date consistently
        const formattedDate = inputDate.toISOString().split('T')[0];
        
        // Convert excludeBookingId to number if provided
        const excludeId = input.excludeBookingId 
          ? (typeof input.excludeBookingId === 'string' 
              ? parseInt(input.excludeBookingId) 
              : input.excludeBookingId)
          : undefined;
        
        // Get room details using correct model name 'lab'
        const room = await ctx.db.lab.findUnique({
          where: { facilityId: input.labId }
        });
        
        if (!room) {
          throw new Error(`Room not found for facilityId: ${input.labId}`);
        }
        
        // Find ALL bookings for the same room and date
        const allBookingsOnDate = await ctx.db.bookings.findMany({
          where: {
            roomId: room.id, // Use the actual room ID, not facilityId
            bookingDate: {
              gte: new Date(formattedDate + 'T00:00:00.000Z'),
              lt: new Date(formattedDate + 'T23:59:59.999Z')
            },
            status: {
              in: ['pending', 'approved'] // Only check active bookings
            },
            id: excludeId ? { not: excludeId } : undefined
          },
          orderBy: {
            startTime: 'asc'
          }
        });


        // Helper function to check if two time ranges overlap
        const timesOverlap = (start1: string, end1: string, start2: string, end2: string) => {
          const timeToMinutes = (time: string) => {
            const [hours, minutes] = time.split(':').map(Number);
            if (typeof hours !== "number" || isNaN(hours) || typeof minutes !== "number" || isNaN(minutes)) {
              throw new Error(`Invalid time format: ${time}`);
            }
            return hours * 60 + minutes;
          };
          
          const start1Min = timeToMinutes(start1);
          const end1Min = timeToMinutes(end1);
          const start2Min = timeToMinutes(start2);
          const end2Min = timeToMinutes(end2);
        
          
          return start1Min < end2Min && end1Min > start2Min;
        };

        // Find overlapping bookings
        const overlappingBookings = allBookingsOnDate.filter(booking => {
          return timesOverlap(
            input.startTime, 
            input.endTime, 
            booking.startTime, 
            booking.endTime
          );
        });


        // **CRITICAL: If ANY overlapping booking exists, check conflicts**
        if (overlappingBookings.length > 0) {
          
          // **RULE 1: Full Room Conflict Check**
          const newBookingIsFullRoom = input.bookingType === "full" || 
                                    (room.capacity > 0 && input.participants >= room.capacity);
          
          
          for (const booking of overlappingBookings) {
            const existingIsFullRoom = room.capacity === 0 || booking.participants >= room.capacity;
            
            // If either booking is full room, there's a conflict
            if (newBookingIsFullRoom || existingIsFullRoom) {
              return {
                hasConflicts: true,
                conflictType: "FULL_ROOM_CONFLICT",
                conflictingBookings: [booking],
                message: newBookingIsFullRoom 
                  ? `Cannot book full room: existing booking "${booking.eventName}" at ${booking.startTime}-${booking.endTime}`
                  : `Cannot book during this time: room is fully booked by "${booking.eventName}" at ${booking.startTime}-${booking.endTime}`
              };
            }
          }

          // **RULE 2: Partial Booking Capacity Check**
          if (!newBookingIsFullRoom && room.capacity > 0) {
            const totalExistingParticipants = overlappingBookings.reduce(
              (sum, booking) => sum + booking.participants, 0
            );

            const totalAfterNewBooking = totalExistingParticipants + input.participants;


            if (totalAfterNewBooking > room.capacity) {
              return {
                hasConflicts: true,
                conflictType: "CAPACITY_EXCEEDED",
                conflictingBookings: overlappingBookings,
                message: `Capacity exceeded! Room: ${room.capacity} seats, currently booked: ${totalExistingParticipants}, requested: ${input.participants}`,
                capacityInfo: {
                  roomCapacity: room.capacity,
                  currentlyBooked: totalExistingParticipants,
                  requested: input.participants,
                  available: room.capacity - totalExistingParticipants
                }
              };
            }
          }
        }

        
        return {
          hasConflicts: false,
          conflictType: null,
          conflictingBookings: [],
          message: "Time slot is available"
        };
        
      } catch (error) {
        console.error("Error checking conflicts:", error);
        console.error("Error details:", {
          message: typeof error === "object" && error !== null && "message" in error ? (error as { message: string }).message : String(error),
          stack: typeof error === "object" && error !== null && "stack" in error ? (error as { stack?: string }).stack : undefined
        });
        throw new Error("Failed to check booking conflicts");
      }
    }),
    
    updateBooking: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.string(),
      equipment: z.string().optional() // Ubah dari equipment ke equipment
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const updateData: any = { 
          status: input.status 
        };
        
        // Add equipment if provided
        if (input.equipment) {
          updateData.equipment = input.equipment;
        }

        console.log("Updating booking with data:", updateData); // Add logging

        const updatedBooking = await ctx.db.bookings.update({
          where: { id: input.id },
          data: updateData,
          include: {
            room: true
          }
        });

        console.log("Updated booking result:", updatedBooking); // Add logging

        return updatedBooking;
      } catch (error) {
        console.error("Error updating booking:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update booking",
        });
      }
    }),
});