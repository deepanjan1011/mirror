import { z } from "zod";

const envSchema = z.object({
  // Database
  MONGODB_URI: z.string().url().optional(), // Optional as we migrate to Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Auth0 (Kept for now during transition)
  AUTH0_SECRET: z.string().optional(),
  AUTH0_BASE_URL: z.string().url().optional(),
  AUTH0_ISSUER_BASE_URL: z.string().url().optional(),
  AUTH0_CLIENT_ID: z.string().optional(),
  AUTH0_CLIENT_SECRET: z.string().optional(),

  // AI Services
  COHERE_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().optional(), // Optional if using Cohere primarily
  NEXT_PUBLIC_VAPI_PUBLIC_KEY: z.string().optional(),
  VAPI_PRIVATE_KEY: z.string().optional(),

  // Node Env
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  throw new Error("Invalid environment variables");
}

export const env = _env.data;
