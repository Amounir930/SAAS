import { SignJWT, jwtVerify } from 'jose';

if (!process.env.AUTH_SECRET) {
  throw new Error('AUTH_SECRET is not defined in environment variables');
}

const key = new TextEncoder().encode(process.env.AUTH_SECRET);

export type SessionData = {
  user: { 
    id: number;
    role: string;
    teamId?: number | null;
  };
  expires: string;
};

export async function signToken(payload: SessionData) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1 day')
    .sign(key);
}

export async function verifyToken(input: string) {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  });
  return payload as SessionData;
}
