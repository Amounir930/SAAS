import { compare, hash } from 'bcryptjs';
import { signToken, verifyToken, type SessionData } from './jwt';
export { signToken, verifyToken, type SessionData };
import { cookies } from 'next/headers';
import { NewUser } from '@/lib/db/schema';

if (!process.env.AUTH_SECRET) {
  throw new Error('AUTH_SECRET is not defined in environment variables');
}

const key = new TextEncoder().encode(process.env.AUTH_SECRET);
const SALT_ROUNDS = 10;

export async function hashPassword(password: string) {
  return hash(password, SALT_ROUNDS);
}

export async function comparePasswords(
  plainTextPassword: string,
  hashedPassword: string
) {
  return compare(plainTextPassword, hashedPassword);
}

export async function getSession() {
  const session = (await cookies()).get('session')?.value;
  if (!session) return null;
  try {
    return await verifyToken(session);
  } catch {
    return null;
  }
}

interface SessionUser {
  id: number;
  role?: string | null;
  teamId?: number | null;
}

export async function setSession(user: SessionUser) {
  const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session: SessionData = {
    user: { 
      id: user.id,
      role: user.role || 'member',
      teamId: user.teamId
    },
    expires: expiresInOneDay.toISOString(),
  };
  const encryptedSession = await signToken(session);
  (await cookies()).set('session', encryptedSession, {
    expires: expiresInOneDay,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });
}
