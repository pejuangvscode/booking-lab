import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = req.headers['x-user-id'] as string | undefined;
  if (!userId) {
    return res.status(401).json({ role: null });
  }

  try {
    const user = await db.users.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) {
      return res.status(404).json({ role: null });
    }
    return res.status(200).json({ role: user.role });
  } catch {
    return res.status(500).json({ role: null });
  }
}
