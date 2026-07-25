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

export type AisleKind = "hot" | "cold";

/** Rectangular hot/cold aisle zone on the floor tile grid. */
export interface FloorZone {
  id: string;
  kind: AisleKind;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const AISLE_COLORS: Record<AisleKind, string> = {
  cold: "#3aa0ff",
  hot: "#ff5a4d",
};

export const AISLE_LABELS: Record<AisleKind, string> = {
  cold: "Cold aisle",
  hot: "Hot aisle",
};

export interface Floor {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  grid_cols: number;
  grid_rows: number;
  zones: FloorZone[];
  notes: unknown | null;
  notes_html: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type FloorRotation = 0 | 90 | 180 | 270;

export interface Cabinet {
  id: string;
  org_id: string;
  name: string;
  location: string | null;
  floor_id: string | null;
  floor_x: number | null;
  floor_y: number | null;
  floor_rotation: FloorRotation;
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

/** Footprint of a cabinet on the floor grid, in tiles (cols × rows).
 *  A 4-post cabinet is 1 tile wide × 2 deep; a 2-post rack is 1 × 1.
 *  Rotation 90/270 swaps the axes. */
export function floorFootprint(
  cabinet: Pick<Cabinet, "post_type" | "floor_rotation">
): { w: number; h: number } {
  const deep = cabinet.post_type === "four_post" ? 2 : 1;
  const rotated = cabinet.floor_rotation === 90 || cabinet.floor_rotation === 270;
  return rotated ? { w: deep, h: 1 } : { w: 1, h: deep };
}

export function floorPlacementCollides(
  cabinet: Pick<Cabinet, "id" | "post_type" | "floor_rotation">,
  x: number,
  y: number,
  others: Cabinet[]
): Cabinet | undefined {
  const fp = floorFootprint(cabinet);
  return others.find((o) => {
    if (o.id === cabinet.id || o.floor_x === null || o.floor_y === null) return false;
    const ofp = floorFootprint(o);
    return (
      x < o.floor_x + ofp.w &&
      o.floor_x < x + fp.w &&
      y < o.floor_y + ofp.h &&
      o.floor_y < y + fp.h
    );
  });
}

export function placementInBounds(
  cabinet: Pick<Cabinet, "post_type" | "floor_rotation">,
  x: number,
  y: number,
  floor: Pick<Floor, "grid_cols" | "grid_rows">
): boolean {
  const fp = floorFootprint(cabinet);
  return x >= 0 && y >= 0 && x + fp.w <= floor.grid_cols && y + fp.h <= floor.grid_rows;
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
