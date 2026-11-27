export function adminPageForPath(path) {
  const normalized = path.replace(/\/$/, "").replace(/\.html$/, "");
  if (normalized === "/admin" || normalized === "/admin/users") return "users";
  if (["/admin/labor-targets", "/admin-goals", "/admin/goals"].includes(normalized)) return "laborTargets";
  if (["/venues", "/venues/index"].includes(normalized)) return "venues";
  return null;
}
