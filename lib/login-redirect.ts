export function getSafeAdminRedirect(nextPath: string | null) {
  if (nextPath === "/admin" || nextPath?.startsWith("/admin/")) {
    return nextPath;
  }

  return "/admin";
}
