import Link from "next/link";
import { Plus, Map as MapIcon, Server } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId, roleInOrg, canEdit, type Membership } from "@/lib/org";
import type { Floor } from "@/lib/types";

export const metadata = { title: "Floors" };

export default async function FloorsPage() {
  const supabase = await createClient();

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

  const { data: floors } = await supabase
    .from("floors")
    .select("*")
    .eq("org_id", activeOrgId)
    .order("created_at", { ascending: true });

  const cabinetCounts = new Map<string, number>();
  if (floors && floors.length > 0) {
    const { data: cabs } = await supabase
      .from("cabinets")
      .select("floor_id")
      .in("floor_id", floors.map((f) => f.id));
    for (const c of cabs ?? []) {
      if (c.floor_id)
        cabinetCounts.set(c.floor_id, (cabinetCounts.get(c.floor_id) ?? 0) + 1);
    }
  }

  return (
    <div className="flex-1 p-8 max-w-6xl w-full mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Floors</h1>
          <p className="text-sm text-ink-muted mt-1">
            Design room layouts and place your cabinets on the floor plan
          </p>
        </div>
        {canEdit(role) && (
          <Link href="/floors/new" className="btn btn-primary">
            <Plus size={16} /> New floor
          </Link>
        )}
      </div>

      {(floors ?? []).length === 0 ? (
        <div className="card p-12 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent mb-4">
            <MapIcon size={22} />
          </div>
          <h2 className="font-semibold mb-1">No floors yet</h2>
          <p className="text-sm text-ink-muted mb-5">
            A floor is a room-scale plan where you arrange multiple cabinets in 3D.
          </p>
          {canEdit(role) && (
            <Link href="/floors/new" className="btn btn-primary">
              <Plus size={16} /> Create floor
            </Link>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(floors as Floor[]).map((floor) => (
            <Link
              key={floor.id}
              href={`/floors/${floor.id}`}
              className="card p-5 hover:border-edge-strong transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <MapIcon size={18} />
                </div>
                <span className="chip">
                  {floor.grid_cols} × {floor.grid_rows} tiles
                </span>
              </div>
              <h3 className="font-semibold group-hover:text-accent transition-colors">
                {floor.name}
              </h3>
              {floor.description && (
                <p className="text-xs text-ink-muted mt-1 line-clamp-2">{floor.description}</p>
              )}
              <div className="flex items-center gap-2 mt-4">
                <span className="chip">
                  <Server size={11} /> {cabinetCounts.get(floor.id) ?? 0} cabinets
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
