"use client";

import Link from "next/link";
import {
  X,
  RotateCcw,
  RotateCw,
  ExternalLink,
  Server,
  Unlink,
} from "lucide-react";
import type { Cabinet } from "@/lib/types";

export function CabinetCard({
  cabinet,
  deviceCount,
  readOnly,
  onRotate,
  onRemove,
  onClose,
}: {
  cabinet: Cabinet;
  deviceCount: number;
  readOnly: boolean;
  onRotate: (dir: 1 | -1) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <div className="p-5 space-y-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <Server size={15} />
          </span>
          <h2 className="font-semibold truncate">{cabinet.name}</h2>
        </div>
        <button className="btn btn-ghost !p-1.5" onClick={onClose} aria-label="Close panel">
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="chip">{cabinet.height_u}U</span>
        <span className="chip">{cabinet.post_type === "four_post" ? "4-post" : "2-post"}</span>
        <span className="chip">{deviceCount} devices</span>
        <span className="chip">
          Tile {cabinet.floor_x! + 1}, {cabinet.floor_y! + 1} · {cabinet.floor_rotation}°
        </span>
      </div>

      {cabinet.location && (
        <p className="text-xs text-ink-muted">Location: {cabinet.location}</p>
      )}

      {!readOnly && (
        <div>
          <label className="label">Orientation</label>
          <div className="flex gap-2">
            <button className="btn btn-secondary flex-1 justify-center" onClick={() => onRotate(-1)}>
              <RotateCcw size={15} /> Rotate left
            </button>
            <button className="btn btn-secondary flex-1 justify-center" onClick={() => onRotate(1)}>
              <RotateCw size={15} /> Rotate right
            </button>
          </div>
          <p className="text-[11px] text-ink-faint mt-1.5">
            The amber edge on the plan (and the door side in 3D) is the cabinet front.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Link
          href={`/cabinets/${cabinet.id}`}
          className="btn btn-primary w-full justify-center"
        >
          <ExternalLink size={15} /> Open cabinet
        </Link>
        {!readOnly && (
          <button className="btn btn-danger w-full justify-center" onClick={onRemove}>
            <Unlink size={15} /> Remove from floor
          </button>
        )}
      </div>
    </div>
  );
}
