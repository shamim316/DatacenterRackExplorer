import type { OrgRole } from "./types";

export function canEdit(role: OrgRole | null): boolean {
  return role === "owner" || role === "admin" || role === "editor";
}

export function canAdmin(role: OrgRole | null): boolean {
  return role === "owner" || role === "admin";
}
