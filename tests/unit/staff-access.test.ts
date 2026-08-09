import { describe, expect, it } from "vitest";
import { isStaffAllowedPath } from "@/lib/staff-access";

describe("staff scanner access", () => {
  it.each([
    "/dashboard",
    "/dashboard/scan",
    "/api/cards",
    "/api/cards/lookup",
    "/api/transactions/stamp",
    "/api/transactions/claim-reward",
    "/api/auth/session",
  ])("allows %s", (pathname) => {
    expect(isStaffAllowedPath(pathname)).toBe(true);
  });

  it.each([
    "/dashboard/clients",
    "/dashboard/campaigns",
    "/api/campaigns",
    "/api/cards/sensitive-action",
    "/admin",
  ])("rejects %s", (pathname) => {
    expect(isStaffAllowedPath(pathname)).toBe(false);
  });
});
