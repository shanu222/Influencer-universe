import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/response";
import { apiLogger } from "@/lib/api/logger";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, error: jsonError("Unauthorized", 401) };
  }

  return { supabase, user, error: null };
}

/**
 * Use for mutation routes. Returns service-role client that bypasses RLS
 * after verifying the user is authenticated. Authorization checks must
 * happen in route handlers / services before writes.
 */
export async function requireAuthMutation() {
  const auth = await requireAuth();
  if (auth.error) return auth;

  const supabase = await createServiceClient();
  return { supabase, user: auth.user, readSupabase: auth.supabase, error: null };
}

export async function requireAdmin() {
  const result = await requireAuth();
  if (result.error) return result;

  const adminIds = (process.env.ADMIN_USER_IDS ?? "").split(",").filter(Boolean);
  const { data: profile } = await result.supabase
    .from("users")
    .select("is_admin")
    .eq("id", result.user!.id)
    .single();

  const isAdmin = profile?.is_admin || adminIds.includes(result.user!.id);
  if (!isAdmin) {
    apiLogger.warn("Admin access denied", { userId: result.user!.id });
    return { ...result, error: jsonError("Forbidden", 403) };
  }

  return result;
}

export async function requireAdminMutation() {
  const auth = await requireAdmin();
  if (auth.error) return auth;

  const supabase = await createServiceClient();
  return { supabase, user: auth.user, readSupabase: auth.supabase, error: null };
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/** In-memory rate limit — use Upstash Redis in multi-instance production. */
export function rateLimit(key: string, limit = 30, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    apiLogger.warn("Rate limit exceeded", { key });
    return false;
  }
  entry.count++;
  return true;
}

export { jsonError, jsonSuccess } from "@/lib/api/response";

export function logRoute(
  route: string,
  userId: string | undefined,
  startMs: number,
  extra?: Record<string, unknown>
) {
  apiLogger.info("API request completed", {
    route,
    userId,
    durationMs: Date.now() - startMs,
    ...extra,
  });
}

export type AuthSupabase = SupabaseClient;
