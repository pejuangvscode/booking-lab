import { z } from "zod";
import { toRoomStatus } from "~/lib/room-status";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

// Rooms marked not_available stay out of the lists people pick a room from.
const LISTED = { status: { not: "not_available" } };

export const labRouter = createTRPCRouter({
  // Every room, whatever its status: the booking calendar needs them all to
  // colour and size the bookings already made in rooms that have since closed.
  getAll: publicProcedure.query(async ({ ctx }) => {
    try {
      const labs = await ctx.db.lab.findMany({
        orderBy: { name: "asc" },
      });

      return labs.map(room => ({
        id: room.id,
        name: room.name || '',
        facilityId: room.facilityId,
        department: room.department,
        type: room.type || "Unknown",
        capacity: room.capacity || 0,
        image: room.image || "",
        roomType: room.roomType || "student_lab",
        status: toRoomStatus(room.status),
      }));
    } catch (error) {
      console.error("Error fetching labs:", error);
      throw new Error("Failed to fetch laboratories");
    }
  }),

  getStudentLabs: publicProcedure.query(async ({ ctx }) => {
    try {
      const labs = await ctx.db.lab.findMany({
        where: {
          roomType: "student_lab",
          ...LISTED,
        },
        orderBy: { name: "asc" },
      });

      return labs.map(room => ({
        id: room.id,
        name: room.name || '',
        facilityId: room.facilityId,
        department: room.department,
        type: room.type || "Unknown",
        capacity: room.capacity || 0,
        image: room.image || "",
        roomType: room.roomType || "student_lab",
        status: toRoomStatus(room.status),
      }));
    } catch (error) {
      console.error("Error fetching student labs:", error);
      throw new Error("Failed to fetch student laboratories");
    }
  }),

  getStaffRooms: publicProcedure.query(async ({ ctx }) => {
    try {
      const rooms = await ctx.db.lab.findMany({
        where: {
          roomType: "staff_room",
          ...LISTED,
        },
        orderBy: { name: "asc" },
      });

      return rooms.map(room => ({
        id: room.id,
        name: room.name || '',
        facilityId: room.facilityId,
        department: room.department,
        type: room.type || "Unknown",
        capacity: room.capacity || 0,
        image: room.image || "",
        roomType: room.roomType || "staff_room",
        status: toRoomStatus(room.status),
      }));
    } catch (error) {
      console.error("Error fetching staff rooms:", error);
      throw new Error("Failed to fetch staff rooms");
    }
  }),
  
  getRoomTypes: publicProcedure.query(async ({ ctx }) => {
    try {
      // Simplify the query to avoid issues with the 'not' operator
      const rooms = await ctx.db.lab.findMany({
        select: { type: true },
        distinct: ['type']
      });
      
      // Filter out null values after fetching the data
      return rooms
        .map(room => room.type)
        .filter(type => type !== null && type !== undefined) as string[];
    } catch (error) {
      console.error("Error fetching room types:", error);
      throw new Error("Failed to fetch room types");
    }
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const lab = await ctx.db.lab.findUnique({
          where: { facilityId: input.id },
        });
        
        if (!lab) {
          throw new Error("Lab not found");
        }
        
        return {
          id: lab.id,
          name: lab.name || '',
          facilityId: lab.facilityId,
          department: lab.department,
          type: lab.roomType || lab.type || "student_lab", // Return roomType as type
          capacity: lab.capacity || 0,
          image: lab.image || "",
          roomType: lab.roomType || "student_lab",
          // Returned for every status, so a direct link to a closed room can
          // explain why it cannot be booked instead of failing.
          status: toRoomStatus(lab.status),
        };
      } catch (error) {
        console.error("Error fetching lab by ID:", error);
        throw new Error("Failed to fetch laboratory");
      }
    }),
});