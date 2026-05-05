import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/db/queries';
import { getAllUsers, getAllTeamsList } from '@/lib/db/admin-queries';

// --- Validation Schema ---
const FiltersSchema = z.object({
  search: z.string().optional(),
  role: z.string().optional(),
  teamId: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default('1'),
  perPage: z.string().regex(/^\d+$/).transform(Number).default('20'),
});

/**
 * Admin Users GET - List users with filters
 * Strictly restricted to admin role.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authorization Guard
    const user = await getUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 2. Query Parameter Validation
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const result = FiltersSchema.safeParse(searchParams);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: result.error.format() }, { status: 400 });
    }

    const filters = result.data;

    // 3. Execution
    const [userData, teams] = await Promise.all([
      getAllUsers({
        ...filters,
        teamId: filters.teamId // already validated as string, getAllUsers handles internal parse
      }),
      getAllTeamsList(),
    ]);

    // 4. Sanitized Response
    return NextResponse.json({
      success: true,
      ...userData,
      teams,
    });
  } catch (error: any) {
    console.error('[Admin Users API Error]', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
