import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId, roleInOrg, type Membership } from "@/lib/org";
import { TeamManager } from "@/components/TeamManager";
import type { OrgInvite, OrgMember } from "@/lib/types";

export const metadata = { title: "Team" };

export default async function OrgPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membershipsRaw } = await supabase
    .from("organization_members")
    .select("org_id, role, organizations ( id, name )");
  const memberships = (membershipsRaw ?? []) as unknown as Membership[];
  const activeOrgId = await getActiveOrgId(memberships);
  const role = roleInOrg(memberships, activeOrgId);

  if (!activeOrgId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-sm text-ink-muted">
        Create or join an organization first.
      </div>
    );
  }

  const orgName =
    memberships.find((m) => m.org_id === activeOrgId)?.organizations?.name ?? "";

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("org_id, user_id, role, created_at, profiles ( id, email, full_name )")
      .eq("org_id", activeOrgId)
      .order("created_at", { ascending: true }),
    supabase
      .from("organization_invites")
      .select("id, org_id, email, role, created_at")
      .eq("org_id", activeOrgId)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <TeamManager
      orgId={activeOrgId}
      orgName={orgName}
      currentUserId={user?.id ?? ""}
      currentRole={role}
      members={(members ?? []) as unknown as OrgMember[]}
      invites={(invites ?? []) as OrgInvite[]}
    />
  );
}
