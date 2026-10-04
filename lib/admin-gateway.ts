export const ADMIN_FUNCTION_URL =
  (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "") +
  "/functions/v1/elgewaliy-admin";

export function requireAdminToken(token: string) {
  const normalized = token.trim();
  if (!normalized) {
    throw new Error("Admin access token is required.");
  }
  return normalized;
}

export function buildAdminRequest(
  token: string,
  body: Record<string, unknown>,
) {
  return {
    url: ADMIN_FUNCTION_URL,
    init: {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-token": requireAdminToken(token),
      },
      body: JSON.stringify(body),
    },
  };
}

export async function callAdmin<T>(
  token: string,
  body: Record<string, unknown>,
): Promise<T> {
  const request = buildAdminRequest(token, body);
  const response = await fetch(request.url, request.init);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : "تعذر تنفيذ العملية في لوحة الإدارة.",
    );
  }

  return payload as T;
}
