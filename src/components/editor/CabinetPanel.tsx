"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  PRESET_HEIGHTS,
  type Cabinet,
  type CabinetPostType,
  type CableEntry,
  type DoorType,
  type PduMount,
} from "@/lib/types";
import { NotesEditor } from "./NotesEditor";

export function CabinetPanel({
  cabinet,
  readOnly,
  onChange,
  onClose,
}: {
  cabinet: Cabinet;
  readOnly: boolean;
  onChange: (patch: Partial<Cabinet>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(cabinet.name);
  const [location, setLocation] = useState(cabinet.location ?? "");

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold">Cabinet settings</h2>
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
            if (v && v !== cabinet.name) onChange({ name: v });
            else setName(cabinet.name);
          }}
        />
      </div>
      <div>
        <label className="label">Location</label>
        <input
          className="input"
          disabled={readOnly}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Row A, DC-East"
          onBlur={() => {
            const v = location.trim() || null;
            if (v !== cabinet.location) onChange({ location: v });
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Post type</label>
          <select
            className="select"
            disabled={readOnly}
            value={cabinet.post_type}
            onChange={(e) => {
              const post_type = e.target.value as CabinetPostType;
              onChange(
                post_type === "two_post" ? { post_type, door: "none" } : { post_type }
              );
            }}
          >
            <option value="four_post">4-post cabinet</option>
            <option value="two_post">2-post rack</option>
          </select>
        </div>
        <div>
          <label className="label">Height (U)</label>
          <select
            className="select"
            disabled={readOnly}
            value={PRESET_HEIGHTS.includes(cabinet.height_u as (typeof PRESET_HEIGHTS)[number]) ? String(cabinet.height_u) : "custom"}
            onChange={(e) => {
              if (e.target.value !== "custom") onChange({ height_u: Number(e.target.value) });
            }}
          >
            {PRESET_HEIGHTS.map((h) => (
              <option key={h} value={h}>
                {h}U
              </option>
            ))}
            <option value="custom">Custom…</option>
          </select>
          <input
            type="number"
            className="input mt-2"
            disabled={readOnly}
            min={4}
            max={60}
            value={cabinet.height_u}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 4 && v <= 60) onChange({ height_u: v });
            }}
          />
        </div>
        {cabinet.post_type === "four_post" && (
          <div>
            <label className="label">Door</label>
            <select
              className="select"
              disabled={readOnly}
              value={cabinet.door}
              onChange={(e) => onChange({ door: e.target.value as DoorType })}
            >
              <option value="none">Open (no door)</option>
              <option value="front">Front door</option>
              <option value="rear">Rear door</option>
              <option value="front_rear">Front + rear doors</option>
            </select>
          </div>
        )}
        <div>
          <label className="label">Vertical PDUs</label>
          <select
            className="select"
            disabled={readOnly}
            value={cabinet.pdu_mount}
            onChange={(e) => onChange({ pdu_mount: e.target.value as PduMount })}
          >
            <option value="none">None</option>
            <option value="front">Front-mounted</option>
            <option value="rear">Rear-mounted</option>
            <option value="front_rear">Front + rear</option>
          </select>
        </div>
        {cabinet.pdu_mount !== "none" && (
          <div>
            <label className="label">PDU sides</label>
            <select
              className="select"
              disabled={readOnly}
              value={cabinet.pdu_both_sides ? "both" : "one"}
              onChange={(e) => onChange({ pdu_both_sides: e.target.value === "both" })}
            >
              <option value="both">Both sides</option>
              <option value="one">One side</option>
            </select>
          </div>
        )}
        <div>
          <label className="label">Power feed</label>
          <select
            className="select"
            disabled={readOnly}
            value={cabinet.power_from_floor ? "floor" : "overhead"}
            onChange={(e) => onChange({ power_from_floor: e.target.value === "floor" })}
          >
            <option value="floor">Under raised floor</option>
            <option value="overhead">Overhead</option>
          </select>
        </div>
        <div>
          <label className="label">Cable entry</label>
          <select
            className="select"
            disabled={readOnly}
            value={cabinet.cable_entry}
            onChange={(e) => onChange({ cable_entry: e.target.value as CableEntry })}
          >
            <option value="bottom">Bottom</option>
            <option value="top">Top</option>
            <option value="both">Top + bottom</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">Cabinet notes</label>
        <NotesEditor
          content={cabinet.notes}
          readOnly={readOnly}
          onSave={(json, html) => onChange({ notes: json, notes_html: html })}
        />
      </div>
    </div>
  );
}
