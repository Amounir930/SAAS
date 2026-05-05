import type { Config } from 'drizzle-kit';

const databaseUrl = process.env.POSTGRES_URL;

if (!databaseUrl) {
  throw new Error("❌ POSTGRES_URL is missing in environment variables.");
}

export default {
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
