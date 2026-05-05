import { db } from '@/lib/db/drizzle';
import { apiKeys, teams } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getTeamForUser } from '@/lib/db/queries';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const TokenSchema = z.string().min(20).max(256);

export async function getAuthenticatedTeam(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  // Path 1: API Token Authentication
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const validated = TokenSchema.safeParse(token);
      
      if (!validated.success) {
        return null;
      }

      const apiKeyData = await db.query.apiKeys.findFirst({
        where: eq(apiKeys.key, validated.data),
        with: { team: true }
      });

      if (apiKeyData && apiKeyData.team) {
        // Non-blocking update for analytics/tracking
        db.update(apiKeys)
          .set({ lastUsedAt: new Date() })
          .where(eq(apiKeys.id, apiKeyData.id))
          .catch(err => console.error('Failed to update API key lastUsedAt:', err));
          
        return apiKeyData.team;
      }
      return null;
    } catch (error) {
      console.error('API Auth Error:', error);
      return null;
    }
  }

  // Path 2: Session Fallback
  try {
    return await getTeamForUser();
  } catch (err) {
    return null;
  }
}