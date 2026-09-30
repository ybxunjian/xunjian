import type { User } from "@supabase/supabase-js";

const OFFLINE_IDENTITY_KEY = "night-inspection-offline-identity";

export type OfflineIdentity = Pick<User, "id" | "email" | "email_confirmed_at">;

export function saveOfflineIdentity(user: OfflineIdentity) {
  localStorage.setItem(OFFLINE_IDENTITY_KEY, JSON.stringify({
    id: user.id,
    email: user.email,
    email_confirmed_at: user.email_confirmed_at,
  }));
}

export function loadOfflineIdentity(): OfflineIdentity | null {
  try {
    const value = JSON.parse(localStorage.getItem(OFFLINE_IDENTITY_KEY) || "null") as unknown;
    if (!value || typeof value !== "object") return null;
    const identity = value as Partial<OfflineIdentity>;
    if (typeof identity.id !== "string" || !identity.id) return null;
    if (identity.email !== undefined && typeof identity.email !== "string") return null;
    if (
      identity.email_confirmed_at !== undefined &&
      typeof identity.email_confirmed_at !== "string"
    ) return null;
    return identity as OfflineIdentity;
  } catch {
    return null;
  }
}

export function clearOfflineIdentity() {
  localStorage.removeItem(OFFLINE_IDENTITY_KEY);
}

export function isRetryableAuthFailure(error: unknown) {
  return error instanceof Error && error.name === "AuthRetryableFetchError";
}
