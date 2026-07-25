import { createClient } from "@/lib/supabase/server";
import type { Cabinet, Device } from "@/lib/types";

export interface ExportData {
  cabinet: Cabinet;
  devices: Device[];
}

/** Loads a cabinet + devices for export. RLS guarantees org membership. */
export async function loadExportData(cabinetId: string): Promise<ExportData | null> {
  const supabase = await createClient();
  const { data: cabinet } = await supabase
    .from("cabinets")
    .select("*")
    .eq("id", cabinetId)
    .single();
  if (!cabinet) return null;
  const { data: devices } = await supabase
    .from("devices")
    .select("*")
    .eq("cabinet_id", cabinetId)
    .order("position_u", { ascending: false });
  return { cabinet: cabinet as Cabinet, devices: (devices ?? []) as Device[] };
}

export function describeCabinet(cabinet: Cabinet): [string, string][] {
  return [
    ["Height", `${cabinet.height_u}U`],
    ["Frame", cabinet.post_type === "four_post" ? "4-post cabinet" : "2-post rack"],
    [
      "Door",
      { none: "None (open)", front: "Front", rear: "Rear", front_rear: "Front + rear" }[
        cabinet.door
      ],
    ],
    [
      "Vertical PDUs",
      cabinet.pdu_mount === "none"
        ? "None"
        : `${{ front: "Front-mounted", rear: "Rear-mounted", front_rear: "Front + rear" }[cabinet.pdu_mount]}, ${
            cabinet.pdu_both_sides ? "both sides" : "one side"
          }`,
    ],
    ["Power feed", cabinet.power_from_floor ? "Under raised floor" : "Overhead"],
    [
      "Cable entry",
      { top: "Top", bottom: "Bottom", both: "Top + bottom" }[cabinet.cable_entry],
    ],
    ["Location", cabinet.location || "—"],
  ];
}

export const DEPTH_TEXT: Record<Device["depth"], string> = {
  full: "Full depth",
  three_quarter: "3/4 depth",
  half: "1/2 depth",
  short: "Short",
};

export function safeFilename(name: string): string {
  return name.replace(/[^a-z0-9-_]+/gi, "_").replace(/^_+|_+$/g, "") || "cabinet";
}
