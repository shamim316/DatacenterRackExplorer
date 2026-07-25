import Link from "next/link";
import { Plus, Server, MapPin, Boxes } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrgId, roleInOrg, canEdit, type Membership } from "@/lib/org";
import type { Cabinet } from "@/lib/types";

export const metadata = { title: "Cabinets" };

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: membershipsRaw } = await supabase
    .from("organization_members")
    .select("org_id, role, organizations ( id, name )");
  const memberships = (membershipsRaw ?? []) as unknown as Membership[];
  const activeOrgId = await getActiveOrgId(memberships);
  const role = roleInOrg(memberships, activeOrgId);

  if (!activeOrgId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent mb-5">
            <Boxes size={26} />
          </div>
          <h1 className="text-xl font-semibold mb-2">Welcome to RackDoc</h1>
          <p className="text-ink-muted text-sm leading-relaxed">
            Create an organization from the sidebar switcher (top-left) to start
            documenting cabinets, or accept a pending invite.
          </p>
        </div>
      </div>
    );
  }

  const { data: cabinets, count } = await supabase
    .from("cabinets")
    .select("*", { count: "exact" })
    .eq("org_id", activeOrgId)
    .order("created_at", { ascending: true });

  const deviceCounts = new Map<string, number>();
  if (cabinets && cabinets.length > 0) {
    const { data: devices } = await supabase
      .from("devices")
      .select("cabinet_id")
      .in("cabinet_id", cabinets.map((c) => c.id));
    for (const d of devices ?? []) {
      deviceCounts.set(d.cabinet_id, (deviceCounts.get(d.cabinet_id) ?? 0) + 1);
    }
  }

  return (
    <div className="flex-1 p-8 max-w-6xl w-full mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Cabinets</h1>
          <p className="text-sm text-ink-muted mt-1">
            {count ?? 0} cabinet{(count ?? 0) === 1 ? "" : "s"} in this organization
          </p>
        </div>
        {canEdit(role) && (
          <Link href="/cabinets/new" className="btn btn-primary">
            <Plus size={16} /> New cabinet
          </Link>
        )}
      </div>

      {(cabinets ?? []).length === 0 ? (
        <div className="card p-12 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent mb-4">
            <Server size={22} />
          </div>
          <h2 className="font-semibold mb-1">No cabinets yet</h2>
          <p className="text-sm text-ink-muted mb-5">
            Document your first rack — pick its height, posts, doors, PDUs and cabling.
          </p>
          {canEdit(role) && (
            <Link href="/cabinets/new" className="btn btn-primary">
              <Plus size={16} /> Create cabinet
            </Link>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(cabinets as Cabinet[]).map((cab) => (
            <Link
              key={cab.id}
              href={`/cabinets/${cab.id}`}
              className="card p-5 hover:border-edge-strong transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Server size={18} />
                </div>
                <span className="chip">{cab.height_u}U</span>
              </div>
              <h3 className="font-semibold group-hover:text-accent transition-colors">
                {cab.name}
              </h3>
              {cab.location && (
                <p className="flex items-center gap-1 text-xs text-ink-muted mt-1">
                  <MapPin size={11} /> {cab.location}
                </p>
              )}
              <div className="flex items-center gap-2 mt-4 text-xs text-ink-faint">
                <span className="chip">
                  {cab.post_type === "four_post" ? "4-post" : "2-post"}
                </span>
                <span className="chip">
                  {deviceCounts.get(cab.id) ?? 0} devices
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
