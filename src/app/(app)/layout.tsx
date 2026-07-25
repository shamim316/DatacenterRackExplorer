import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId, roleInOrg, type Membership } from "@/lib/org";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membershipsRaw } = await supabase
    .from("organization_members")
    .select("org_id, role, organizations ( id, name )")
    .order("created_at", { ascending: true });

  const memberships = (membershipsRaw ?? []) as unknown as Membership[];
  const activeOrgId = await getActiveOrgId(memberships);
  const role = roleInOrg(memberships, activeOrgId);

  const { data: invites } = await supabase
    .from("organization_invites")
    .select("id, org_id, email, role, created_at, organizations ( name )")
    .ilike("email", user.email ?? "");

  return (
    <AppShell
      user={{ id: user.id, email: user.email ?? "" }}
      memberships={memberships.map((m) => ({
        orgId: m.org_id,
        role: m.role,
        name: m.organizations?.name ?? "Untitled",
      }))}
      activeOrgId={activeOrgId}
      activeRole={role}
      pendingInvites={
        (invites ?? []).map((i) => ({
          id: i.id,
          orgName:
            (i as unknown as { organizations: { name: string } | null })
              .organizations?.name ?? "an organization",
          role: i.role,
        }))
      }
    >
      {children}
    </AppShell>
  );
}
