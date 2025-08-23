import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const labRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    try {
      const labs = await ctx.db.lab.findMany({
        orderBy: { name: "asc" },
      });
      
      return labs.map(room => ({
        id: room.id,
        name: room.name || '',
        facilityId: room.facilityId,
        department: "Faculty of Information & Technology",
        type: room.type || "Unknown",
        capacity: room.capacity || 0,
        image: room.image || "",
      }));
    } catch (error) {
      console.error("Error fetching labs:", error);
      throw new Error("Failed to fetch laboratories");
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
        
        return lab;
      } catch (error) {
        console.error("Error fetching lab by ID:", error);
        throw new Error("Failed to fetch laboratory");
      }
    }),
});