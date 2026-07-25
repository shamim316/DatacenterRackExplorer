import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId, roleInOrg, canEdit, type Membership } from "@/lib/org";
import { NewCabinetForm } from "@/components/NewCabinetForm";

export const metadata = { title: "New cabinet" };

export default async function NewCabinetPage() {
  const supabase = await createClient();
  const { data: membershipsRaw } = await supabase
    .from("organization_members")
    .select("org_id, role, organizations ( id, name )");
  const memberships = (membershipsRaw ?? []) as unknown as Membership[];
  const activeOrgId = await getActiveOrgId(memberships);
  const role = roleInOrg(memberships, activeOrgId);

  if (!activeOrgId || !canEdit(role)) redirect("/dashboard");

  return <NewCabinetForm orgId={activeOrgId} />;
}
