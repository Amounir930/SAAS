import { NextResponse } from 'next/server';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import { logger } from '@/lib/logger';

/**
 * Team GET API - Fetch current team details
 * Strictly context-aware (only returns team for the authenticated user)
 */
export async function GET() {
  try {
    // 1. Authorization Check
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required', success: false }, { status: 401 });
    }

    // 2. Data Retrieval
    const team = await getTeamForUser();
    
    if (!team) {
      return NextResponse.json({ error: 'Team context not found', success: false }, { status: 404 });
    }

    // 3. Structured Success Response
    return NextResponse.json({
      success: true,
      data: team
    });
  } catch (error) {
    logger.error('API_TEAM_GET_ERROR', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({ 
      error: 'An unexpected error occurred while fetching team data',
      success: false 
    }, { status: 500 });
  }
}
