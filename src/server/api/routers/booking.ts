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
      
        let userId;
        
      
        if (ctx && ctx.userId) {
          userId = ctx.userId;
        } else {
        
          const existingUser = await ctx.db.users.findFirst();
          
          if (existingUser) {
            userId = existingUser.id;
          } else {
          
            const newUser = await ctx.db.users.create({
            
            });
            userId = newUser.id;
          }
        }
        
      
        const booking = await ctx.db.bookings.create({
          data: {
            userId: userId,
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
    

  getAll: publicProcedure.query(async ({ ctx }) => {
    try {
      const bookings = await ctx.db.bookings.findMany({
        include: {
        
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      return bookings;
    } catch (error) {
      throw new Error("Failed to fetch bookings");
    }
  }),
  

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
        throw new Error("Failed to fetch booking details");
      }
    }),


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

      
        const searchFilter = search
          ? {
              OR: [
                { eventName: { contains: search } },
                { room: { name: { contains: search } } },
                { room: { facilityId: { contains: search } } },
              ],
            }
          : {};

      
        const bookings = await ctx.db.bookings.findMany({
          where: {
            userId: ctx.userId,
            status: {
              notIn: ["completed", "cancelled", "rejected"],
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

      
        const total = await ctx.db.bookings.count({
          where: {
            userId: ctx.userId,
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
        throw new Error("Failed to fetch current bookings");
      }
    }),
  getRejectionReason: protectedProcedure
    .input(z.object({ 
      id: z.number() 
    }))
    .query(async ({ ctx, input }) => {
      try {
        // Find the booking and verify user ownership
        const booking = await ctx.db.bookings.findFirst({
          where: { 
            id: input.id,
            userId: ctx.userId // Ensure user can only access their own bookings
          },
          select: {
            id: true,
            status: true,
            rejectionReason: true,
            eventName: true,
            bookingDate: true,
            startTime: true,
            endTime: true
          }
        });

        if (!booking) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Booking not found or you don't have permission to view it",
          });
        }

        // Check if booking is actually rejected
        if (booking.status.toLowerCase() !== 'rejected') {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This booking is not in rejected status",
          });
        }

        return {
          rejectionReason: booking.rejectionReason || "No rejection reason provided"
        };
      } catch (error) {      
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch rejection reason",
        });
      }
    }),

  getAcceptedReason: protectedProcedure
    .input(z.object({ 
      id: z.number() 
    }))
    .query(async ({ ctx, input }) => {
      try {
        // Find the booking and verify user ownership
        const booking = await ctx.db.bookings.findFirst({
          where: { 
            id: input.id,
            userId: ctx.userId
          },
          select: {
            id: true,
            status: true,
            adminNote: true,
            eventName: true,
            bookingDate: true,
            startTime: true,
            endTime: true,
            approvedAt: true
          }
        });

        if (!booking) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Booking not found or you don't have permission to view it",
          });
        }

        if (booking.status.toLowerCase() !== 'accepted') {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This booking is not in accepted status",
          });
        }

        return {
          adminNote: booking.adminNote || "No admin note provided",
          approvedAt: booking.approvedAt || "Not approved yet"
        };
      } catch (error) {      
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch rejection reason",
        });
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

      
        const bookings = await ctx.db.bookings.findMany({
          where: {
            userId: ctx.userId,
            status: {
              in: ["completed", "cancelled", "rejected"],
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

      
        const total = await ctx.db.bookings.count({
          where: {
            userId: ctx.userId,
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
        throw new Error("Failed to fetch completed bookings");
      }
    }),


  cancelBooking: protectedProcedure
  .input(z.object({ 
    id: z.number()
  }))
  .mutation(async ({ ctx, input }) => {
    try {
    
      const existingBooking = await ctx.db.bookings.findFirst({
        where: { 
          id: input.id,
          userId: ctx.userId
        }
      });

      if (!existingBooking) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found or you don't have permission to cancel it",
        });
      }

    
      if (existingBooking.status.toLowerCase() === 'cancelled') {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Booking is already cancelled",
        });
      }

    
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
      
    
      const formattedBookings = bookings.map(booking => ({
        ...booking,
      
        bookingDate: booking.bookingDate instanceof Date 
          ? booking.bookingDate.toISOString().split('T')[0]
          : booking.bookingDate
      }));
      
      return formattedBookings;
    } catch (error) {
      throw new Error("Failed to fetch bookings for calendar");
    }
  }),


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
      // Parse and validate date
      const inputDate = new Date(input.bookingDate);
      if (isNaN(inputDate.getTime())) {
        throw new Error("Invalid booking date provided");
      }
      
      // Format date for query
      const formattedDate = inputDate.toISOString().split('T')[0];
      
      // Handle exclude ID conversion
      const excludeId = input.excludeBookingId 
        ? (typeof input.excludeBookingId === 'string' 
            ? parseInt(input.excludeBookingId) 
            : input.excludeBookingId)
        : undefined;
      
      // Find room details
      const room = await ctx.db.lab.findUnique({
        where: { facilityId: input.labId }
      });
      
      if (!room) {
        throw new Error(`Room not found for facilityId: ${input.labId}`);
      }
      
      // Get all bookings on the same date - EXCLUDING rejected and cancelled bookings
      const allBookingsOnDate = await ctx.db.bookings.findMany({
        where: {
          roomId: input.labId, // Make sure we're checking the same room
          bookingDate: {
            gte: new Date(formattedDate + 'T00:00:00.000Z'),
            lt: new Date(formattedDate + 'T23:59:59.999Z')
          },
          // KEY CHANGE: Only consider bookings that are NOT rejected or cancelled
          status: {
            notIn: ['rejected', 'cancelled'] // Exclude rejected and cancelled bookings
          },
          // Exclude current booking if editing
          id: excludeId ? { not: excludeId } : undefined
        },
        orderBy: {
          startTime: 'asc'
        }
      });

      // Helper function to check if times overlap
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
      
        // Check for time overlap
        return start1Min < end2Min && end1Min > start2Min;
      };

      // Find overlapping bookings (only active ones - rejected/cancelled already filtered out)
      const overlappingBookings = allBookingsOnDate.filter(booking => {
        return timesOverlap(
          input.startTime, 
          input.endTime, 
          booking.startTime, 
          booking.endTime
        );
      });

      // If there are overlapping bookings, check for conflicts
      if (overlappingBookings.length > 0) {
        // Determine if new booking wants full room
        const newBookingIsFullRoom = input.bookingType === "full" || 
                                  (room.capacity > 0 && input.participants >= room.capacity);
        
        // Check each overlapping booking for conflicts
        for (const booking of overlappingBookings) {
          const existingIsFullRoom = room.capacity === 0 || booking.participants >= room.capacity;
          
          // If either booking is full room, there's a conflict
          if (newBookingIsFullRoom || existingIsFullRoom) {
            return {
              hasConflicts: true,
              conflictType: "FULL_ROOM_CONFLICT",
              conflictingBookings: [booking],
              message: newBookingIsFullRoom 
                ? `Cannot book full room: existing booking "${booking.eventName}" at ${booking.startTime}-${booking.endTime} (Status: ${booking.status})`
                : `Cannot book during this time: room is fully booked by "${booking.eventName}" at ${booking.startTime}-${booking.endTime} (Status: ${booking.status})`
            };
          }
        }

        // For partial bookings, check capacity limits
        if (!newBookingIsFullRoom && room.capacity > 0) {
          const totalExistingParticipants = overlappingBookings.reduce(
            (sum, booking) => sum + booking.participants, 0
          );

          const totalAfterNewBooking = totalExistingParticipants + input.participants;

          // Check if total exceeds room capacity
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

      // No conflicts found
      return {
        hasConflicts: false,
        conflictType: null,
        conflictingBookings: [],
        message: `Time slot is available. Note: Rejected and cancelled bookings do not block availability.`,
        roomInfo: {
          name: room.name || `Room ${input.labId}`,
          capacity: room.capacity,
          facilityId: room.facilityId
        }
      };
      
    } catch (error) {
      console.error("Error in checkConflicts:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to check booking conflicts: ${error.message}`);
      } else {
        throw new Error(`Failed to check booking conflicts: Unknown error`);
      }
    }
  }),
    
    updateBooking: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.string(),
      equipment: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const updateData: any = { 
          status: input.status 
        };
        
      
        if (input.equipment) {
          updateData.equipment = input.equipment;
        }

      

        const updatedBooking = await ctx.db.bookings.update({
          where: { id: input.id },
          data: updateData,
          include: {
            room: true
          }
        });
        return updatedBooking;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update booking",
        });
      }
    }),
});