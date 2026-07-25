"use client";

import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { DEVICE_TYPES, type DeviceTypeDef } from "@/lib/device-types";

export function DevicePalette({ onAdd }: { onAdd: (t: DeviceTypeDef) => void }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-b border-edge">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-faint hover:text-ink"
        onClick={() => setOpen((v) => !v)}
      >
        Add device
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 grid grid-cols-2 gap-1.5">
          {DEVICE_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => onAdd(t)}
              className="group flex items-center gap-2 rounded-lg border border-edge bg-sunken px-2.5 py-2 text-left text-xs font-medium hover:border-edge-strong"
              title={`Add ${t.label} (${t.defaultHeightU}U)`}
            >
              <span
                className="h-3 w-3 rounded-sm shrink-0"
                style={{ background: t.color }}
              />
              <span className="truncate flex-1">{t.label}</span>
              <Plus size={12} className="text-ink-faint opacity-0 group-hover:opacity-100 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
