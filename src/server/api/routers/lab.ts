import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const labRouter = createTRPCRouter({
  // Get all labs
  getAll: publicProcedure.query(async ({ ctx }) => {
    try {
      const labs = await ctx.db.rooms.findMany({
        orderBy: { name: "asc" },
      });
      
      return labs.map(room => ({
        id: room.id,
        name: room.name || '',
        facilityId: room.id, // Using ID as facilityId if you don't have a separate field
        department: "Faculty of Information & Technology", // Default department
        type: room.type || "Unknown",
        capacity: room.capacity || 0,
      }));
    } catch (error) {
      console.error("Error fetching labs:", error);
      throw new Error("Failed to fetch laboratories");
    }
  }),
  
  // Get unique room types for filtering
  getRoomTypes: publicProcedure.query(async ({ ctx }) => {
    try {
      // Get distinct room types from the database
      const rooms = await ctx.db.rooms.findMany({
        select: { type: true },
        distinct: ['type'],
        where: {
          type: { not: null },
        },
      });
      
      // Extract and return the unique types
      return rooms
        .map(room => room.type)
        .filter(Boolean) as string[];
    } catch (error) {
      console.error("Error fetching room types:", error);
      throw new Error("Failed to fetch room types");
    }
  }),
});