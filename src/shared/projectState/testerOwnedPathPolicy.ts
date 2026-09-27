/** Canonical repository-relative paths the restricted source-backed Tester may attribute. */
export function isTesterOwnedPath(value: string): boolean {
  if (typeof value !== "string" || value.length === 0 || value.length > 512 || value.includes("\\") || value.startsWith("/") ||
    value.includes(":") || /[\x00-\x1f]/.test(value)) return false;
  const parts = value.split("/");
  if (parts.some(part => !part || part === "." || part === "..") ||
    /(^|\/)(?:\.git|\.champcity|node_modules|dist|build|coverage|tmp|temp)(\/|$)/i.test(value) ||
    /(^|\/)(?:\.env(?:\..*)?|package(?:-lock)?\.json|yarn\.lock|pnpm-lock\.yaml)$/i.test(value)) return false;
  if (value === "validation/capability-map.json") return true;
  return value.startsWith("test/");
}
