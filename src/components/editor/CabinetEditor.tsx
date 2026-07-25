"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings2, Trash2, Loader2, DoorOpen, DoorClosed } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deviceTypeDef, type DeviceTypeDef } from "@/lib/device-types";
import { findCollision, type Cabinet, type Device, type DeviceFace } from "@/lib/types";
import { RackElevation } from "./RackElevation";
import { DevicePalette } from "./DevicePalette";
import { DevicePanel } from "./DevicePanel";
import { CabinetPanel } from "./CabinetPanel";
import { ExportMenu } from "./ExportMenu";

const Rack3D = dynamic(() => import("./Rack3D"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-ink-faint text-sm gap-2">
      <Loader2 size={16} className="animate-spin" /> Loading 3D view…
    </div>
  ),
});

export function CabinetEditor({
  initialCabinet,
  initialDevices,
  readOnly,
}: {
  initialCabinet: Cabinet;
  initialDevices: Device[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [cabinet, setCabinet] = useState<Cabinet>(initialCabinet);
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [face, setFace] = useState<DeviceFace>("front");
  const [showCabinetPanel, setShowCabinetPanel] = useState(false);
  const [doorOpen, setDoorOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selected = devices.find((d) => d.id === selectedId) ?? null;

  const flagError = useCallback((message: string) => {
    setSaveError(message);
    setTimeout(() => setSaveError(null), 4000);
  }, []);

  // ---------- Cabinet ops ----------
  const updateCabinet = useCallback(
    async (patch: Partial<Cabinet>) => {
      setCabinet((c) => ({ ...c, ...patch }));
      const { error } = await supabase
        .from("cabinets")
        .update(patch)
        .eq("id", cabinet.id);
      if (error) flagError(`Save failed: ${error.message}`);
    },
    [supabase, cabinet.id, flagError]
  );

  const deleteCabinet = useCallback(async () => {
    if (!confirm(`Delete cabinet "${cabinet.name}" and all its devices?`)) return;
    const { error } = await supabase.from("cabinets").delete().eq("id", cabinet.id);
    if (error) flagError(error.message);
    else {
      router.push("/dashboard");
      router.refresh();
    }
  }, [supabase, cabinet.id, cabinet.name, router, flagError]);

  // ---------- Device ops ----------
  const updateDevice = useCallback(
    async (id: string, patch: Partial<Device>) => {
      const prev = devices;
      const next = devices.map((d) => (d.id === id ? { ...d, ...patch } : d));
      const moved = next.find((d) => d.id === id)!;

      if (
        patch.position_u !== undefined ||
        patch.height_u !== undefined ||
        patch.face !== undefined ||
        patch.depth !== undefined
      ) {
        if (moved.position_u < 1 || moved.position_u + moved.height_u - 1 > cabinet.height_u) {
          flagError("Device does not fit inside the cabinet.");
          return;
        }
        const hit = findCollision(moved, next, id);
        if (hit) {
          flagError(`Overlaps with "${hit.name}" at U${hit.position_u}.`);
          return;
        }
      }

      setDevices(next);
      const { error } = await supabase.from("devices").update(patch).eq("id", id);
      if (error) {
        setDevices(prev);
        flagError(`Save failed: ${error.message}`);
      }
    },
    [devices, cabinet.height_u, supabase, flagError]
  );

  const addDevice = useCallback(
    async (type: DeviceTypeDef) => {
      // find lowest free slot on the active face
      const h = type.defaultHeightU;
      let pos: number | null = null;
      for (let u = 1; u <= cabinet.height_u - h + 1; u++) {
        const candidate = {
          position_u: u,
          height_u: h,
          face,
          depth: type.defaultDepth,
        };
        if (!findCollision(candidate, devices)) {
          pos = u;
          break;
        }
      }
      if (pos === null) {
        flagError("No free space for this device on the current face.");
        return;
      }
      const count = devices.filter((d) => d.device_type === type.id).length;
      const insert = {
        cabinet_id: cabinet.id,
        name: `${type.label} ${count + 1}`,
        device_type: type.id,
        position_u: pos,
        height_u: h,
        depth: type.defaultDepth,
        face,
      };
      const { data, error } = await supabase
        .from("devices")
        .insert(insert)
        .select("*")
        .single();
      if (error) flagError(`Could not add device: ${error.message}`);
      else {
        setDevices((ds) => [...ds, data as Device]);
        setSelectedId(data.id);
        setShowCabinetPanel(false);
      }
    },
    [cabinet.id, cabinet.height_u, devices, face, supabase, flagError]
  );

  const deleteDevice = useCallback(
    async (id: string) => {
      const prev = devices;
      setDevices((ds) => ds.filter((d) => d.id !== id));
      if (selectedId === id) setSelectedId(null);
      const { error } = await supabase.from("devices").delete().eq("id", id);
      if (error) {
        setDevices(prev);
        flagError(error.message);
      }
    },
    [devices, selectedId, supabase, flagError]
  );

  const hasDoor = cabinet.post_type === "four_post" && cabinet.door !== "none";

  return (
    <div className="flex flex-col h-screen min-h-0">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-edge bg-raised">
        <Link href="/dashboard" className="btn btn-ghost !p-2" title="Back">
          <ArrowLeft size={16} />
        </Link>
        <div className="min-w-0">
          <h1 className="font-semibold truncate leading-tight">{cabinet.name}</h1>
          <p className="text-[11px] text-ink-faint leading-tight">
            {cabinet.height_u}U · {cabinet.post_type === "four_post" ? "4-post" : "2-post"}
            {cabinet.location ? ` · ${cabinet.location}` : ""}
            {readOnly ? " · view only" : ""}
          </p>
        </div>

        <div className="flex-1" />

        {saveError && (
          <span className="text-xs text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-1.5">
            {saveError}
          </span>
        )}

        {hasDoor && (
          <button
            className="btn btn-secondary !py-1.5"
            onClick={() => setDoorOpen((v) => !v)}
            title={doorOpen ? "Close door in 3D view" : "Open door in 3D view"}
          >
            {doorOpen ? <DoorOpen size={15} /> : <DoorClosed size={15} />}
            {doorOpen ? "Door open" : "Door closed"}
          </button>
        )}

        <ExportMenu cabinetId={cabinet.id} cabinetName={cabinet.name} />

        {!readOnly && (
          <>
            <button
              className={`btn ${showCabinetPanel ? "btn-primary" : "btn-secondary"} !py-1.5`}
              onClick={() => {
                setShowCabinetPanel((v) => !v);
                setSelectedId(null);
              }}
            >
              <Settings2 size={15} /> Cabinet
            </button>
            <button className="btn btn-danger !py-1.5 !px-2.5" onClick={deleteCabinet} title="Delete cabinet">
              <Trash2 size={15} />
            </button>
          </>
        )}
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left: palette + 2D elevation */}
        <div className="w-[340px] shrink-0 border-r border-edge bg-raised flex flex-col min-h-0">
          {!readOnly && <DevicePalette onAdd={addDevice} />}
          <div className="px-4 pt-3 pb-1 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Elevation
            </span>
            <div className="seg">
              {(["front", "rear"] as DeviceFace[]).map((f) => (
                <button key={f} data-active={face === f} onClick={() => setFace(f)}>
                  {f === "front" ? "Front" : "Rear"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
            <RackElevation
              cabinet={cabinet}
              devices={devices}
              face={face}
              selectedId={selectedId}
              readOnly={readOnly}
              onSelect={(id) => {
                setSelectedId(id);
                setShowCabinetPanel(false);
              }}
              onMove={(id, positionU) => updateDevice(id, { position_u: positionU })}
            />
          </div>
        </div>

        {/* Center: 3D */}
        <div className="flex-1 min-w-0 flex flex-col bg-sunken">
          <Rack3D
            cabinet={cabinet}
            devices={devices}
            selectedId={selectedId}
            doorOpen={doorOpen}
            onSelect={(id) => {
              setSelectedId(id);
              if (id) setShowCabinetPanel(false);
            }}
          />
        </div>

        {/* Right: panels */}
        {(selected || showCabinetPanel) && (
          <div className="w-[360px] shrink-0 border-l border-edge bg-raised overflow-y-auto">
            {selected ? (
              <DevicePanel
                key={selected.id}
                device={selected}
                cabinet={cabinet}
                readOnly={readOnly}
                onChange={(patch) => updateDevice(selected.id, patch)}
                onDelete={() => deleteDevice(selected.id)}
                onClose={() => setSelectedId(null)}
              />
            ) : (
              <CabinetPanel
                cabinet={cabinet}
                readOnly={readOnly}
                onChange={updateCabinet}
                onClose={() => setShowCabinetPanel(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function deviceLabelColor(device: Device): string {
  return deviceTypeDef(device.device_type).color;
}
