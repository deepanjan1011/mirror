import { MongoClient } from "mongodb";
import { getUserDatabaseName } from "./auth";
import { env } from "@/config/env";

let cached: { client: MongoClient } | null = null;

/**
 * @deprecated Migrating to Supabase.
 */
export async function getMongoClient() {
  if (cached?.client) return cached.client;
  const uri = env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing");
  const client = new MongoClient(uri, { maxPoolSize: 10 });
  await client.connect();
  cached = { client };
  return client;
}

/**
 * Get database instance for a specific user
 * @param auth0Id - User's Auth0 ID
 * @returns MongoDB database instance for the user
 * @deprecated Migrating to Supabase.
 */
export async function getUserDb(auth0Id: string) {
  const client = await getMongoClient();
  const dbName = getUserDatabaseName(auth0Id);
  return client.db(dbName);
}

/**
 * Legacy function - kept for backward compatibility
 * @deprecated Use getUserDb() instead for user-specific data
 */
export async function getDb() {
  const client = await getMongoClient();
  const dbName = process.env.MONGODB_DB || "tunnel";
  return client.db(dbName);
}
