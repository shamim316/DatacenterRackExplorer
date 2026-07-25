"use client";

import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import { DEVICE_TYPES, deviceTypeDef } from "@/lib/device-types";
import {
  DEPTH_LABELS,
  type Cabinet,
  type Device,
  type DeviceDepth,
  type DeviceFace,
} from "@/lib/types";
import { NotesEditor } from "./NotesEditor";

const DEPTHS: DeviceDepth[] = ["full", "three_quarter", "half", "short"];

export function DevicePanel({
  device,
  cabinet,
  readOnly,
  onChange,
  onDelete,
  onClose,
}: {
  device: Device;
  cabinet: Cabinet;
  readOnly: boolean;
  onChange: (patch: Partial<Device>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(device.name);
  const typeDef = deviceTypeDef(device.device_type);

  const text = (
    field: "manufacturer" | "model" | "serial_number" | "asset_tag",
    label: string,
    placeholder: string
  ) => (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        disabled={readOnly}
        defaultValue={device[field] ?? ""}
        placeholder={placeholder}
        onBlur={(e) => {
          const v = e.target.value.trim() || null;
          if (v !== device[field]) onChange({ [field]: v });
        }}
      />
    </div>
  );

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="h-3.5 w-3.5 rounded-sm shrink-0" style={{ background: device.color || typeDef.color }} />
          <h2 className="font-semibold truncate">{device.name}</h2>
        </div>
        <button className="btn btn-ghost !p-1.5" onClick={onClose} aria-label="Close panel">
          <X size={16} />
        </button>
      </div>

      <div>
        <label className="label">Name</label>
        <input
          className="input"
          disabled={readOnly}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            const v = name.trim();
            if (v && v !== device.name) onChange({ name: v });
            else setName(device.name);
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Type</label>
          <select
            className="select"
            disabled={readOnly}
            value={device.device_type}
            onChange={(e) => onChange({ device_type: e.target.value, color: null })}
          >
            {DEVICE_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Color</label>
          <input
            type="color"
            disabled={readOnly}
            className="input !p-1 h-[38px] cursor-pointer"
            value={device.color || typeDef.color}
            onChange={(e) => onChange({ color: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Bottom U (1–{cabinet.height_u})</label>
          <input
            type="number"
            className="input"
            disabled={readOnly}
            min={1}
            max={cabinet.height_u}
            value={device.position_u}
            onChange={(e) => onChange({ position_u: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="label">Height (U)</label>
          <input
            type="number"
            className="input"
            disabled={readOnly}
            min={1}
            max={24}
            value={device.height_u}
            onChange={(e) => onChange({ height_u: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="label">Mounted on</label>
          <select
            className="select"
            disabled={readOnly}
            value={device.face}
            onChange={(e) => onChange({ face: e.target.value as DeviceFace })}
          >
            <option value="front">Front face</option>
            <option value="rear">Rear face</option>
          </select>
        </div>
        <div>
          <label className="label">Depth</label>
          <select
            className="select"
            disabled={readOnly}
            value={device.depth}
            onChange={(e) => onChange({ depth: e.target.value as DeviceDepth })}
          >
            {DEPTHS.map((d) => (
              <option key={d} value={d}>
                {DEPTH_LABELS[d]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {text("manufacturer", "Manufacturer", "Dell, Cisco…")}
        {text("model", "Model", "R740, C9300…")}
        {text("serial_number", "Serial number", "SN…")}
        {text("asset_tag", "Asset tag", "ASSET-001")}
      </div>

      <div>
        <label className="label">Notes</label>
        <NotesEditor
          content={device.notes}
          readOnly={readOnly}
          placeholder="Device notes — warranty, IPs, port maps…"
          onSave={(json, html) => onChange({ notes: json, notes_html: html })}
        />
      </div>

      {!readOnly && (
        <button className="btn btn-danger w-full justify-center" onClick={onDelete}>
          <Trash2 size={15} /> Remove device
        </button>
      )}
    </div>
  );
}
