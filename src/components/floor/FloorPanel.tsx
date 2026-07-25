"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Floor } from "@/lib/types";
import { NotesEditor } from "@/components/editor/NotesEditor";

export function FloorPanel({
  floor,
  readOnly,
  onChange,
  onClose,
}: {
  floor: Floor;
  readOnly: boolean;
  onChange: (patch: Partial<Floor>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(floor.name);
  const [description, setDescription] = useState(floor.description ?? "");

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold">Floor settings</h2>
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
            if (v && v !== floor.name) onChange({ name: v });
            else setName(floor.name);
          }}
        />
      </div>
      <div>
        <label className="label">Description</label>
        <input
          className="input"
          disabled={readOnly}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => {
            const v = description.trim() || null;
            if (v !== floor.description) onChange({ description: v });
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Width (tiles)</label>
          <input
            type="number"
            className="input"
            disabled={readOnly}
            min={2}
            max={60}
            value={floor.grid_cols}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 2 && v <= 60) onChange({ grid_cols: v });
            }}
          />
        </div>
        <div>
          <label className="label">Depth (tiles)</label>
          <input
            type="number"
            className="input"
            disabled={readOnly}
            min={2}
            max={60}
            value={floor.grid_rows}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 2 && v <= 60) onChange({ grid_rows: v });
            }}
          />
        </div>
      </div>
      <p className="text-xs text-ink-faint -mt-2">
        ≈ {(floor.grid_cols * 0.6).toFixed(1)} m × {(floor.grid_rows * 0.6).toFixed(1)} m.
        Shrinking the grid does not move cabinets that end up outside — drag them back in.
      </p>

      <div>
        <label className="label">Floor notes</label>
        <NotesEditor
          content={floor.notes}
          readOnly={readOnly}
          placeholder="Room notes — access, cooling, power circuits…"
          onSave={(json, html) => onChange({ notes: json, notes_html: html })}
        />
      </div>
    </div>
  );
}
