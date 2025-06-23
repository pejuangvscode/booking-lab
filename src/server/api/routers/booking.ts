import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

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
        if (ctx.userId) {
          userId = ctx.userId;
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
});