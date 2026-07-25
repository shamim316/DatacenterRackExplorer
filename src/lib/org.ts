import { cookies } from "next/headers";
import type { OrgRole } from "./types";

export const ORG_COOKIE = "rackdoc-org";

export interface Membership {
  org_id: string;
  role: OrgRole;
  organizations: { id: string; name: string } | null;
}

export async function getActiveOrgId(
  memberships: Membership[]
): Promise<string | null> {
  if (memberships.length === 0) return null;
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(ORG_COOKIE)?.value;
  if (fromCookie && memberships.some((m) => m.org_id === fromCookie)) {
    return fromCookie;
  }
  return memberships[0].org_id;
}

export function roleInOrg(
  memberships: Membership[],
  orgId: string | null
): OrgRole | null {
  return memberships.find((m) => m.org_id === orgId)?.role ?? null;
}

export { canEdit, canAdmin } from "./roles";
