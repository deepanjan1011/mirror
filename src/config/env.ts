import { z } from "zod";
const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  NEXT_PUBLIC_VAPI_PUBLIC_KEY: z.string().optional(),
});

const serverSchema = z.object({
  // Database
  MONGODB_URI: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Auth0 (Legacy)
  AUTH0_SECRET: z.string().optional(),
  AUTH0_BASE_URL: z.string().url().optional(),
  AUTH0_ISSUER_BASE_URL: z.string().url().optional(),
  AUTH0_CLIENT_ID: z.string().optional(),
  AUTH0_CLIENT_SECRET: z.string().optional(),

  // AI Services
  COHERE_API_KEY: z.string().min(1).optional(), // Make optional to prevent build crashes if missing locally
  OPENAI_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  VAPI_PRIVATE_KEY: z.string().optional(),

  // Node Env
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

// Helper to validate env vars based on environment
const validateEnv = () => {
  const isServer = typeof window === "undefined";

  const parsedClient = clientSchema.safeParse(process.env);

  if (!parsedClient.success) {
    console.error("❌ Invalid client environment variables:", parsedClient.error.format());
    throw new Error("Invalid client environment variables");
  }

  if (isServer) {
    const parsedServer = serverSchema.safeParse(process.env);
    if (!parsedServer.success) {
      console.error("❌ Invalid server environment variables:", parsedServer.error.format());
      throw new Error("Invalid server environment variables");
    }
    return { ...parsedClient.data, ...parsedServer.data };
  }

  return parsedClient.data;
};

const parsedEnv = validateEnv();
export const env = parsedEnv as any;
// casting to any temporarily to debug if the complex type inference is causing issues with webpack
