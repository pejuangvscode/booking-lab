import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[/api/auth/role] Request received:', {
    method: req.method,
    headers: {
      'x-user-id': req.headers['x-user-id'],
      'user-agent': req.headers['user-agent']
    }
  });

  if (req.method !== 'GET') {
    console.log('[/api/auth/role] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = req.headers['x-user-id'] as string | undefined;
  if (!userId) {
    console.log('[/api/auth/role] No user ID provided');
    return res.status(401).json({ error: 'No user ID provided' });
  }

  try {
    console.log('[/api/auth/role] Querying user:', userId);
    
    const user = await db.users.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      console.log('[/api/auth/role] User not found, creating with default role');
      try {
        const newUser = await db.users.create({
          data: {
            id: userId,
            role: 'user'
          },
          select: { role: true }
        });
        console.log('[/api/auth/role] Created new user with role:', newUser.role);
        return res.status(200).json({ role: newUser.role });
      } catch (createError) {
        console.error('[/api/auth/role] Error creating user:', createError);
        return res.status(500).json({ error: 'Failed to create user' });
      }
    }

    console.log('[/api/auth/role] Found user with role:', user.role);
    return res.status(200).json({ role: user.role });
  } catch (error) {
    console.error('[/api/auth/role] Database error:', error);
    return res.status(500).json({ 
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
