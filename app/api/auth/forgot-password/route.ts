import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { users, passwordResetTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendPasswordResetEmail } from '@/lib/email';
import { randomUUID } from 'crypto';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: Request) {
  try {
    const limited = checkRateLimit(`auth:${getClientIp(request)}`, RATE_LIMITS.auth);
    if (limited) return limited;

    const json = await request.json();
    const result = ForgotPasswordSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const { email } = result.data;

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user) {
      const token = randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt,
      });

      try {
        await sendPasswordResetEmail(email, token);
        logger.info('[Auth] Password reset email sent', { userId: user.id });
      } catch (emailError) {
        logger.error('[Auth] Failed to send reset email', { userId: user.id, error: emailError instanceof Error ? emailError.message : 'Unknown' });
      }
    }

    // Generic success message to prevent user enumeration
    return NextResponse.json({
      success: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[Auth Forgot Password]', { error: msg });
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
