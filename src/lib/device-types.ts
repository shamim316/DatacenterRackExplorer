import type { DeviceDepth } from "./types";

export interface DeviceTypeDef {
  id: string;
  label: string;
  color: string; // hex used in 2D + 3D
  defaultHeightU: number;
  defaultDepth: DeviceDepth;
}

export const DEVICE_TYPES: DeviceTypeDef[] = [
  { id: "server", label: "Server", color: "#4f7cff", defaultHeightU: 1, defaultDepth: "full" },
  { id: "storage", label: "Storage array", color: "#7c5cff", defaultHeightU: 2, defaultDepth: "full" },
  { id: "switch", label: "Switch", color: "#00b8a9", defaultHeightU: 1, defaultDepth: "half" },
  { id: "router", label: "Router", color: "#00987f", defaultHeightU: 1, defaultDepth: "half" },
  { id: "firewall", label: "Firewall", color: "#e05263", defaultHeightU: 1, defaultDepth: "half" },
  { id: "patch_panel", label: "Patch panel", color: "#8a93a6", defaultHeightU: 1, defaultDepth: "short" },
  { id: "ups", label: "UPS", color: "#f5a623", defaultHeightU: 2, defaultDepth: "full" },
  { id: "pdu", label: "Rack PDU (horizontal)", color: "#d98e04", defaultHeightU: 1, defaultDepth: "short" },
  { id: "kvm", label: "KVM / console", color: "#5c8fa8", defaultHeightU: 1, defaultDepth: "half" },
  { id: "shelf", label: "Shelf", color: "#6b7280", defaultHeightU: 1, defaultDepth: "three_quarter" },
  { id: "blank", label: "Blanking panel", color: "#374151", defaultHeightU: 1, defaultDepth: "short" },
  { id: "other", label: "Other", color: "#9aa4b2", defaultHeightU: 1, defaultDepth: "full" },
];

export function deviceTypeDef(id: string): DeviceTypeDef {
  return DEVICE_TYPES.find((t) => t.id === id) ?? DEVICE_TYPES[DEVICE_TYPES.length - 1];
}

export function deviceColor(type: string, override?: string | null): string {
  return override || deviceTypeDef(type).color;
}
