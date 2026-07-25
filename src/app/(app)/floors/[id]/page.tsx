import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleInOrg, canEdit, type Membership } from "@/lib/org";
import { FloorEditor } from "@/components/floor/FloorEditor";
import type { Cabinet, Device, Floor } from "@/lib/types";

export default async function FloorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: floor } = await supabase
    .from("floors")
    .select("*")
    .eq("id", id)
    .single();
  if (!floor) notFound();

  const [{ data: cabinets }, { data: membershipsRaw }] = await Promise.all([
    supabase
      .from("cabinets")
      .select("*")
      .eq("org_id", floor.org_id)
      .order("created_at", { ascending: true }),
    supabase
      .from("organization_members")
      .select("org_id, role, organizations ( id, name )"),
  ]);

  const placedIds = (cabinets ?? [])
    .filter((c) => c.floor_id === id)
    .map((c) => c.id);

  let devices: Device[] = [];
  if (placedIds.length > 0) {
    const { data } = await supabase
      .from("devices")
      .select("*")
      .in("cabinet_id", placedIds);
    devices = (data ?? []) as Device[];
  }

  const memberships = (membershipsRaw ?? []) as unknown as Membership[];
  const role = roleInOrg(memberships, floor.org_id);

  return (
    <FloorEditor
      initialFloor={floor as Floor}
      initialCabinets={(cabinets ?? []) as Cabinet[]}
      initialDevices={devices}
      readOnly={!canEdit(role)}
    />
  );
}
