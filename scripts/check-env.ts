import { z } from "zod";
import * as dotenv from "dotenv";
import { resolve } from "path";
import { existsSync, copyFileSync } from "fs";

// Load environment variables from .env file
const envPath = resolve(process.cwd(), ".env");

if (!existsSync(envPath)) {
  console.warn("⚠️  [Forensic Guard] .env file not found. Copying from .env.example...");
  try {
    copyFileSync(resolve(process.cwd(), ".env.example"), envPath);
    console.log("✅ [Forensic Guard] .env file created from template.");
  } catch (error) {
    console.error("❌ [Forensic Guard] Failed to create .env file. Please create it manually.");
    process.exit(1);
  }
}

dotenv.config({ path: envPath });

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  POSTGRES_URL: z.string().url("POSTGRES_URL must be a valid PostgreSQL URL"),
  BASE_URL: z.string().url("BASE_URL must be a valid URL (e.g., http://localhost:3000)"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters for security"),
  
  // Payment Gateways
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),
  
  // Communication
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  RESEND_FROM_EMAIL: z.string().email("RESEND_FROM_EMAIL must be a valid email"),
  
  // Voice/Pricing (Coerced numbers)
  VOICE_CALL_CREDIT_PRICE_CENTS: z.coerce.number().int().positive().default(500),
  VOICE_CALL_CREDITS_PER_PACK: z.coerce.number().int().positive().default(100),

  // Pusher (Optional)
  PUSHER_APP_ID: z.string().optional(),
  NEXT_PUBLIC_PUSHER_KEY: z.string().optional(),
  PUSHER_SECRET: z.string().optional(),
  NEXT_PUBLIC_PUSHER_CLUSTER: z.string().optional(),
  
  // Evolution API
  EVOLUTION_API_URL: z.string().url().optional().or(z.literal("")),
  EVOLUTION_API_KEY: z.string().optional(),
});

function validateEnv() {
  const result = schema.safeParse(process.env);

  if (!result.success) {
    console.error("\n❌ [Forensic Guard] Invalid environment configuration:");
    const formatted = result.error.format();
    
    for (const [key, value] of Object.entries(formatted)) {
      if (key !== "_errors") {
        console.error(`   - ${key}: ${(value as any)._errors.join(", ")}`);
      }
    }
    
    if (process.env.NODE_ENV === "production") {
      console.error("\nCRITICAL: Environment validation failed in production. Aborting.\n");
      process.exit(1);
    } else {
      console.warn("\nWARNING: Environment validation failed. Some features may not work correctly.\n");
    }
  } else {
    // Production Security Check
    if (process.env.NODE_ENV === "production" && !process.env.BASE_URL?.startsWith("https")) {
      console.error("❌ [Forensic Guard] CRITICAL: BASE_URL must use HTTPS in production!");
      process.exit(1);
    }
    console.log("✅ [Forensic Guard] Environment variables validated.");
  }
}

validateEnv();
