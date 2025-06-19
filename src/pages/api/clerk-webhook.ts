// src/pages/api/clerk-webhooks.ts
import { WebhookEvent } from "@clerk/nextjs/server";
import { buffer } from "micro";
import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "~/server/db";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  // Get the raw request body
  const rawBody = await buffer(req);
  
  // Verify webhook (see Clerk documentation for proper verification)
  const headerSignature = req.headers["svix-signature"] as string;
  const headerTimestamp = req.headers["svix-timestamp"] as string;
  
  if (!headerSignature || !headerTimestamp) {
    return res.status(400).json({ error: "Missing signature headers" });
  }

  try {
    // Parse and process the webhook payload
    const payload = JSON.parse(rawBody.toString());
    const event: WebhookEvent = payload;

    // Handle user creation events
    if (event.type === "user.created") {
      const { id, first_name, last_name } = event.data;

      // Save user to your database
      await db.users.upsert({
        where: { id: id },
        create: {
          id: id,
          name: `${first_name || ''} ${last_name || ''}`.trim() || 'User',
        },
        update: {
          name: `${first_name || ''} ${last_name || ''}`.trim() || 'User',
        },
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error handling webhook:", error);
    return res.status(400).json({ error: "Invalid payload" });
  }
}