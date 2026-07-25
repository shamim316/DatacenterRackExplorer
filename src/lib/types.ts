export type OrgRole = "owner" | "admin" | "editor" | "viewer";
export type CabinetPostType = "two_post" | "four_post";
export type DoorType = "none" | "front" | "rear" | "front_rear";
export type PduMount = "none" | "front" | "rear" | "front_rear";
export type CableEntry = "top" | "bottom" | "both";
export type DeviceDepth = "full" | "three_quarter" | "half" | "short";
export type DeviceFace = "front" | "rear";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
}

export interface Organization {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
}

export interface OrgMember {
  org_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
  profiles?: Profile | null;
}

export interface OrgInvite {
  id: string;
  org_id: string;
  email: string;
  role: OrgRole;
  created_at: string;
}

export interface Cabinet {
  id: string;
  org_id: string;
  name: string;
  location: string | null;
  post_type: CabinetPostType;
  height_u: number;
  door: DoorType;
  pdu_mount: PduMount;
  pdu_both_sides: boolean;
  power_from_floor: boolean;
  cable_entry: CableEntry;
  notes: unknown | null;
  notes_html: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  cabinet_id: string;
  name: string;
  device_type: string;
  position_u: number; // bottom-most U the device occupies (1-based)
  height_u: number;
  depth: DeviceDepth;
  face: DeviceFace;
  color: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  asset_tag: string | null;
  notes: unknown | null;
  notes_html: string | null;
  created_at: string;
  updated_at: string;
}

export const PRESET_HEIGHTS = [48, 45, 42, 36, 24, 18, 12] as const;

export const DEPTH_LABELS: Record<DeviceDepth, string> = {
  full: "Full depth",
  three_quarter: "3/4 depth",
  half: "1/2 depth",
  short: "Short",
};

export const DEPTH_FRACTION: Record<DeviceDepth, number> = {
  full: 1,
  three_quarter: 0.75,
  half: 0.5,
  short: 0.3,
};

export const ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

/** Devices occupying U-ranges collide when they overlap and share a face
 *  (full-depth devices occupy both faces). */
export function devicesCollide(
  a: Pick<Device, "position_u" | "height_u" | "face" | "depth">,
  b: Pick<Device, "position_u" | "height_u" | "face" | "depth">
): boolean {
  const overlap =
    a.position_u < b.position_u + b.height_u &&
    b.position_u < a.position_u + a.height_u;
  if (!overlap) return false;
  const sameFace = a.face === b.face;
  const eitherFull = a.depth === "full" || b.depth === "full";
  return sameFace || eitherFull;
}

export function findCollision(
  device: Pick<Device, "position_u" | "height_u" | "face" | "depth">,
  others: Device[],
  ignoreId?: string
): Device | undefined {
  return others.find(
    (d) => d.id !== ignoreId && devicesCollide(device, d)
  );
}
