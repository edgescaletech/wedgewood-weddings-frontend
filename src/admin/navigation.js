export function adminPageForPath(path) {
  const normalized = path.replace(/\/$/, "").replace(/\.html$/, "");
  if (normalized === "/admin" || normalized === "/admin/users") return "users";
  if (normalized === "/admin/labor-targets") return "laborTargets";
  return null;
}
