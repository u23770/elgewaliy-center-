import test from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_FUNCTION_URL,
  buildAdminRequest,
  requireAdminToken,
} from "../lib/admin-gateway.ts";

test("rejects an empty admin token", () => {
  assert.throws(() => requireAdminToken("   "), /required/);
});

test("builds an authenticated admin request without exposing the token in the URL", () => {
  const request = buildAdminRequest(" demo-token ", { action: "dashboard" });

  assert.equal(request.url, ADMIN_FUNCTION_URL);
  assert.equal(request.init.headers["x-admin-token"], "demo-token");
  assert.equal(request.url.includes("demo-token"), false);
  assert.equal(request.init.method, "POST");
});
