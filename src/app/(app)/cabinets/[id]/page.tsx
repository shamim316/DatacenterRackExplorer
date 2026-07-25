import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleInOrg, canEdit, type Membership } from "@/lib/org";
import { CabinetEditor } from "@/components/editor/CabinetEditor";
import type { Cabinet, Device } from "@/lib/types";

export default async function CabinetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: cabinet } = await supabase
    .from("cabinets")
    .select("*")
    .eq("id", id)
    .single();
  if (!cabinet) notFound();

  const [{ data: devices }, { data: membershipsRaw }] = await Promise.all([
    supabase
      .from("devices")
      .select("*")
      .eq("cabinet_id", id)
      .order("position_u", { ascending: false }),
    supabase
      .from("organization_members")
      .select("org_id, role, organizations ( id, name )"),
  ]);

  const memberships = (membershipsRaw ?? []) as unknown as Membership[];
  const role = roleInOrg(memberships, cabinet.org_id);

  return (
    <CabinetEditor
      initialCabinet={cabinet as Cabinet}
      initialDevices={(devices ?? []) as Device[]}
      readOnly={!canEdit(role)}
    />
  );
}
