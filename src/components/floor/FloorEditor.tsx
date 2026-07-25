"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Settings2,
  Trash2,
  Loader2,
  Plus,
  Server,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  floorPlacementCollides,
  placementInBounds,
  type Cabinet,
  type Device,
  type Floor,
  type FloorRotation,
} from "@/lib/types";
import { FloorPlan2D } from "./FloorPlan2D";
import { FloorPanel } from "./FloorPanel";
import { CabinetCard } from "./CabinetCard";

const Floor3D = dynamic(() => import("./Floor3D"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-ink-faint text-sm gap-2">
      <Loader2 size={16} className="animate-spin" /> Loading 3D view…
    </div>
  ),
});

export function FloorEditor({
  initialFloor,
  initialCabinets,
  initialDevices,
  readOnly,
}: {
  initialFloor: Floor;
  initialCabinets: Cabinet[];
  initialDevices: Device[];
  readOnly: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [floor, setFloor] = useState<Floor>(initialFloor);
  const [cabinets, setCabinets] = useState<Cabinet[]>(initialCabinets);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showFloorPanel, setShowFloorPanel] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const devicesByCabinet = useMemo(() => {
    const map = new Map<string, Device[]>();
    for (const d of initialDevices) {
      const list = map.get(d.cabinet_id) ?? [];
      list.push(d);
      map.set(d.cabinet_id, list);
    }
    return map;
  }, [initialDevices]);

  const placed = useMemo(
    () =>
      cabinets.filter(
        (c) => c.floor_id === floor.id && c.floor_x !== null && c.floor_y !== null
      ),
    [cabinets, floor.id]
  );
  const available = useMemo(
    () => cabinets.filter((c) => c.floor_id === null),
    [cabinets]
  );
  const selected = placed.find((c) => c.id === selectedId) ?? null;

  const flagError = useCallback((message: string) => {
    setSaveError(message);
    setTimeout(() => setSaveError(null), 4000);
  }, []);

  // ---------- Floor ops ----------
  const updateFloor = useCallback(
    async (patch: Partial<Floor>) => {
      setFloor((f) => ({ ...f, ...patch }));
      const { error } = await supabase.from("floors").update(patch).eq("id", floor.id);
      if (error) flagError(`Save failed: ${error.message}`);
    },
    [supabase, floor.id, flagError]
  );

  const deleteFloor = useCallback(async () => {
    if (!confirm(`Delete floor "${floor.name}"? Cabinets stay, but lose their placement.`))
      return;
    const { error } = await supabase.from("floors").delete().eq("id", floor.id);
    if (error) flagError(error.message);
    else {
      router.push("/floors");
      router.refresh();
    }
  }, [supabase, floor.id, floor.name, router, flagError]);

  // ---------- Placement ops ----------
  const patchCabinet = useCallback(
    async (id: string, patch: Partial<Cabinet>) => {
      const prev = cabinets;
      setCabinets((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
      const { error } = await supabase.from("cabinets").update(patch).eq("id", id);
      if (error) {
        setCabinets(prev);
        flagError(`Save failed: ${error.message}`);
      }
    },
    [cabinets, supabase, flagError]
  );

  const moveCabinet = useCallback(
    (id: string, x: number, y: number) => {
      const cab = cabinets.find((c) => c.id === id);
      if (!cab) return;
      if (!placementInBounds(cab, x, y, floor)) {
        flagError("Placement is outside the floor.");
        return;
      }
      const hit = floorPlacementCollides(cab, x, y, placed);
      if (hit) {
        flagError(`Overlaps with "${hit.name}".`);
        return;
      }
      patchCabinet(id, { floor_x: x, floor_y: y });
    },
    [cabinets, placed, floor, patchCabinet, flagError]
  );

  const rotateCabinet = useCallback(
    (id: string, dir: 1 | -1) => {
      const cab = cabinets.find((c) => c.id === id);
      if (!cab || cab.floor_x === null || cab.floor_y === null) return;
      const rotation = (((cab.floor_rotation + dir * 90) % 360) + 360) % 360 as FloorRotation;
      const probe = { ...cab, floor_rotation: rotation };
      if (!placementInBounds(probe, cab.floor_x, cab.floor_y, floor)) {
        flagError("No room to rotate here — move the cabinet first.");
        return;
      }
      if (floorPlacementCollides(probe, cab.floor_x, cab.floor_y, placed)) {
        flagError("Rotation would overlap a neighbor.");
        return;
      }
      patchCabinet(id, { floor_rotation: rotation });
    },
    [cabinets, placed, floor, patchCabinet, flagError]
  );

  const addToFloor = useCallback(
    (id: string) => {
      const cab = cabinets.find((c) => c.id === id);
      if (!cab) return;
      const probe = { ...cab, floor_rotation: 0 as FloorRotation };
      for (let y = 0; y < floor.grid_rows; y++) {
        for (let x = 0; x < floor.grid_cols; x++) {
          if (
            placementInBounds(probe, x, y, floor) &&
            !floorPlacementCollides(probe, x, y, placed)
          ) {
            patchCabinet(id, {
              floor_id: floor.id,
              floor_x: x,
              floor_y: y,
              floor_rotation: 0,
            });
            setSelectedId(id);
            return;
          }
        }
      }
      flagError("No free space on the floor for this cabinet.");
    },
    [cabinets, placed, floor, patchCabinet, flagError]
  );

  const removeFromFloor = useCallback(
    (id: string) => {
      patchCabinet(id, { floor_id: null, floor_x: null, floor_y: null, floor_rotation: 0 });
      if (selectedId === id) setSelectedId(null);
    },
    [patchCabinet, selectedId]
  );

  return (
    <div className="flex flex-col h-screen min-h-0">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-edge bg-raised">
        <Link href="/floors" className="btn btn-ghost !p-2" title="Back">
          <ArrowLeft size={16} />
        </Link>
        <div className="min-w-0">
          <h1 className="font-semibold truncate leading-tight">{floor.name}</h1>
          <p className="text-[11px] text-ink-faint leading-tight">
            {floor.grid_cols} × {floor.grid_rows} tiles · {placed.length} cabinet
            {placed.length === 1 ? "" : "s"}
            {readOnly ? " · view only" : ""}
          </p>
        </div>

        <div className="flex-1" />

        {saveError && (
          <span className="text-xs text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-1.5">
            {saveError}
          </span>
        )}

        {!readOnly && (
          <>
            <button
              className={`btn ${showFloorPanel ? "btn-primary" : "btn-secondary"} !py-1.5`}
              onClick={() => {
                setShowFloorPanel((v) => !v);
                setSelectedId(null);
              }}
            >
              <Settings2 size={15} /> Floor
            </button>
            <button className="btn btn-danger !py-1.5 !px-2.5" onClick={deleteFloor} title="Delete floor">
              <Trash2 size={15} />
            </button>
          </>
        )}
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Left: 2D plan + available cabinets */}
        <div className="w-[380px] shrink-0 border-r border-edge bg-raised flex flex-col min-h-0">
          <div className="px-4 pt-3 pb-1 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Floor plan
            </span>
            <span className="text-[11px] text-ink-faint">drag to move · tile = 600 mm</span>
          </div>
          <div className="min-h-0 overflow-auto px-4 pb-2 grow-0 shrink">
            <FloorPlan2D
              floor={floor}
              cabinets={placed}
              selectedId={selectedId}
              readOnly={readOnly}
              onSelect={(id) => {
                setSelectedId(id);
                setShowFloorPanel(false);
              }}
              onMove={moveCabinet}
            />
          </div>

          <div className="border-t border-edge px-4 pt-3 pb-1 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Available cabinets
            </span>
            {!readOnly && (
              <Link href={`/cabinets/new?floor=${floor.id}`} className="btn btn-ghost !py-1 !px-2 !text-xs">
                <Plus size={13} /> New
              </Link>
            )}
          </div>
          <div className="flex-1 min-h-16 overflow-y-auto px-4 pb-4 space-y-1.5 pt-2">
            {available.length === 0 ? (
              <p className="text-xs text-ink-faint">
                No unassigned cabinets. Create one to place it here.
              </p>
            ) : (
              available.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 rounded-lg border border-edge bg-sunken px-2.5 py-2"
                >
                  <Server size={14} className="text-ink-faint shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{c.name}</p>
                    <p className="text-[10px] text-ink-faint">
                      {c.height_u}U · {c.post_type === "four_post" ? "4-post" : "2-post"}
                    </p>
                  </div>
                  {!readOnly && (
                    <button
                      className="btn btn-secondary !py-1 !px-2 !text-xs"
                      onClick={() => addToFloor(c.id)}
                    >
                      Place
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Center: 3D room */}
        <div className="flex-1 min-w-0 flex flex-col bg-sunken">
          <Floor3D
            floor={floor}
            cabinets={placed}
            devicesByCabinet={devicesByCabinet}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              if (id) setShowFloorPanel(false);
            }}
            onOpen={(id) => router.push(`/cabinets/${id}`)}
          />
        </div>

        {/* Right: panels */}
        {(selected || showFloorPanel) && (
          <div className="w-[340px] shrink-0 border-l border-edge bg-raised overflow-y-auto">
            {selected ? (
              <CabinetCard
                cabinet={selected}
                deviceCount={devicesByCabinet.get(selected.id)?.length ?? 0}
                readOnly={readOnly}
                onRotate={(dir) => rotateCabinet(selected.id, dir)}
                onRemove={() => removeFromFloor(selected.id)}
                onClose={() => setSelectedId(null)}
              />
            ) : (
              <FloorPanel
                floor={floor}
                readOnly={readOnly}
                onChange={updateFloor}
                onClose={() => setShowFloorPanel(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
