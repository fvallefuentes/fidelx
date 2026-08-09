const STAFF_EXACT_PATHS = new Set([
  "/dashboard",
  "/dashboard/scan",
  "/api/cards",
  "/api/cards/lookup",
  "/api/transactions/claim-reward",
]);

const STAFF_PATH_PREFIXES = [
  "/api/transactions/stamp",
  "/api/programs",
  "/api/auth",
  "/_next",
  "/favicon",
];

export function isStaffAllowedPath(pathname: string) {
  return (
    STAFF_EXACT_PATHS.has(pathname) ||
    STAFF_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}
