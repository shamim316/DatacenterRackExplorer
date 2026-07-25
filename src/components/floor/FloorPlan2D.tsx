"use client";

import { useRef, useState } from "react";
import {
  floorFootprint,
  floorPlacementCollides,
  placementInBounds,
  AISLE_COLORS,
  type AisleKind,
  type Cabinet,
  type Floor,
  type FloorZone,
} from "@/lib/types";

const MAX_W = 332; // fits the sidebar

export type PlanTool = "select" | "cold" | "hot" | "erase";

interface Props {
  floor: Floor;
  cabinets: Cabinet[]; // placed cabinets only
  zones: FloorZone[];
  tool: PlanTool;
  selectedId: string | null;
  readOnly: boolean;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onAddZone: (kind: AisleKind, x: number, y: number, w: number, h: number) => void;
  onRemoveZone: (id: string) => void;
}

/** Top-down floor plan on the tile grid; drag cabinets to reposition,
 *  drag with the hot/cold tools to mark aisle zones. */
export function FloorPlan2D({
  floor,
  cabinets,
  zones,
  tool,
  selectedId,
  readOnly,
  onSelect,
  onMove,
  onAddZone,
  onRemoveZone,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tile = Math.min(MAX_W / floor.grid_cols, 30);
  const W = floor.grid_cols * tile;
  const H = floor.grid_rows * tile;
  const drawingAisle = tool === "cold" || tool === "hot";

  const [drag, setDrag] = useState<{
    id: string;
    dx: number; // tile offset between anchor and grab point
    dy: number;
    x: number; // preview anchor
    y: number;
    valid: boolean;
  } | null>(null);

  const [zoneDraft, setZoneDraft] = useState<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  } | null>(null);

  function tileFromEvent(e: React.PointerEvent): { x: number; y: number } {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(floor.grid_cols - 1, Math.floor((e.clientX - rect.left) / tile))),
      y: Math.max(0, Math.min(floor.grid_rows - 1, Math.floor((e.clientY - rect.top) / tile))),
    };
  }

  function draftRect(d: { x0: number; y0: number; x1: number; y1: number }) {
    const x = Math.min(d.x0, d.x1);
    const y = Math.min(d.y0, d.y1);
    const w = Math.abs(d.x1 - d.x0) + 1;
    const h = Math.abs(d.y1 - d.y0) + 1;
    return { x, y, w, h };
  }

  // ---------- cabinet dragging ----------
  function startDrag(e: React.PointerEvent, cab: Cabinet) {
    if (readOnly || tool !== "select") return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const t = tileFromEvent(e);
    setDrag({
      id: cab.id,
      dx: t.x - (cab.floor_x ?? 0),
      dy: t.y - (cab.floor_y ?? 0),
      x: cab.floor_x ?? 0,
      y: cab.floor_y ?? 0,
      valid: true,
    });
    onSelect(cab.id);
  }

  function moveDrag(e: React.PointerEvent) {
    if (drag) {
      const cab = cabinets.find((c) => c.id === drag.id);
      if (!cab) return;
      const t = tileFromEvent(e);
      const fp = floorFootprint(cab);
      const x = Math.max(0, Math.min(t.x - drag.dx, floor.grid_cols - fp.w));
      const y = Math.max(0, Math.min(t.y - drag.dy, floor.grid_rows - fp.h));
      const valid =
        placementInBounds(cab, x, y, floor) &&
        !floorPlacementCollides(cab, x, y, cabinets);
      setDrag({ ...drag, x, y, valid });
      return;
    }
    if (zoneDraft) {
      const t = tileFromEvent(e);
      setZoneDraft({ ...zoneDraft, x1: t.x, y1: t.y });
    }
  }

  function endDrag() {
    if (drag) {
      const cab = cabinets.find((c) => c.id === drag.id);
      if (cab && drag.valid && (drag.x !== cab.floor_x || drag.y !== cab.floor_y)) {
        onMove(drag.id, drag.x, drag.y);
      }
      setDrag(null);
    }
    if (zoneDraft && drawingAisle) {
      const r = draftRect(zoneDraft);
      onAddZone(tool as AisleKind, r.x, r.y, r.w, r.h);
      setZoneDraft(null);
    } else if (zoneDraft) {
      setZoneDraft(null);
    }
  }

  // ---------- aisle drawing ----------
  function startZoneDraft(e: React.PointerEvent) {
    if (!drawingAisle) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const t = tileFromEvent(e);
    setZoneDraft({ x0: t.x, y0: t.y, x1: t.x, y1: t.y });
  }

  /** Front-edge line of the footprint rect for a given rotation. */
  function frontEdge(px: number, py: number, w: number, h: number, rotation: number) {
    switch (rotation) {
      case 0:
        return { x1: px, y1: py + h, x2: px + w, y2: py + h }; // south
      case 90:
        return { x1: px, y1: py, x2: px, y2: py + h }; // west
      case 180:
        return { x1: px, y1: py, x2: px + w, y2: py }; // north
      default:
        return { x1: px + w, y1: py, x2: px + w, y2: py + h }; // east
    }
  }

  const draft = zoneDraft ? draftRect(zoneDraft) : null;

  return (
    <svg
      ref={svgRef}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="select-none touch-none mx-auto block rounded-lg"
      style={{
        background: "var(--rack-bg)",
        border: "1px solid var(--border-strong)",
        cursor: drawingAisle ? "crosshair" : undefined,
      }}
      onPointerDown={startZoneDraft}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onClick={(e) => {
        if (e.target === svgRef.current && tool === "select") onSelect(null);
      }}
    >
      {/* aisle zones (under everything else) */}
      {zones.map((z) => (
        <g
          key={z.id}
          style={{
            pointerEvents: tool === "erase" ? "auto" : "none",
            cursor: tool === "erase" ? "pointer" : undefined,
          }}
          onClick={(e) => {
            if (tool !== "erase") return;
            e.stopPropagation();
            onRemoveZone(z.id);
          }}
        >
          <rect
            x={z.x * tile}
            y={z.y * tile}
            width={z.w * tile}
            height={z.h * tile}
            fill={AISLE_COLORS[z.kind]}
            fillOpacity={0.22}
            stroke={AISLE_COLORS[z.kind]}
            strokeOpacity={0.65}
            strokeWidth={1}
            strokeDasharray="5 3"
            rx={2}
          />
          {z.w * tile > 34 && z.h * tile > 12 && (
            <text
              x={(z.x + z.w / 2) * tile}
              y={(z.y + z.h / 2) * tile + 3}
              textAnchor="middle"
              fontSize={8.5}
              fontWeight={700}
              letterSpacing={1}
              fill={AISLE_COLORS[z.kind]}
              fillOpacity={0.9}
            >
              {z.kind === "cold" ? "COLD" : "HOT"}
            </text>
          )}
        </g>
      ))}

      {/* tile grid */}
      {Array.from({ length: floor.grid_cols + 1 }, (_, i) => (
        <line key={`v${i}`} x1={i * tile} y1={0} x2={i * tile} y2={H} stroke="var(--border)" strokeWidth={0.5} style={{ pointerEvents: "none" }} />
      ))}
      {Array.from({ length: floor.grid_rows + 1 }, (_, i) => (
        <line key={`h${i}`} x1={0} y1={i * tile} x2={W} y2={i * tile} stroke="var(--border)" strokeWidth={0.5} style={{ pointerEvents: "none" }} />
      ))}

      {/* zone draft preview */}
      {draft && drawingAisle && (
        <rect
          x={draft.x * tile}
          y={draft.y * tile}
          width={draft.w * tile}
          height={draft.h * tile}
          fill={AISLE_COLORS[tool as AisleKind]}
          fillOpacity={0.3}
          stroke={AISLE_COLORS[tool as AisleKind]}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          rx={2}
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* cabinets */}
      {cabinets.map((cab) => {
        const fp = floorFootprint(cab);
        const isDragging = drag?.id === cab.id;
        const ax = isDragging ? drag.x : cab.floor_x!;
        const ay = isDragging ? drag.y : cab.floor_y!;
        const px = ax * tile;
        const py = ay * tile;
        const w = fp.w * tile;
        const h = fp.h * tile;
        const selectedNow = selectedId === cab.id;
        const edge = frontEdge(px, py, w, h, cab.floor_rotation);
        return (
          <g
            key={cab.id}
            opacity={isDragging && !drag.valid ? 0.55 : 1}
            style={{
              cursor: drawingAisle
                ? "crosshair"
                : readOnly || tool === "erase"
                  ? "pointer"
                  : "grab",
              pointerEvents: drawingAisle ? "none" : "auto",
            }}
            onPointerDown={(e) => startDrag(e, cab)}
            onClick={(e) => {
              if (tool !== "select") return;
              e.stopPropagation();
              onSelect(cab.id);
            }}
          >
            <rect
              x={px + 1.5}
              y={py + 1.5}
              width={w - 3}
              height={h - 3}
              rx={3}
              fill={cab.post_type === "four_post" ? "#2f5cff" : "#00b8a9"}
              fillOpacity={0.85}
              stroke={
                selectedNow
                  ? "var(--accent)"
                  : isDragging && !drag.valid
                    ? "var(--danger)"
                    : "rgba(0,0,0,0.4)"
              }
              strokeWidth={selectedNow ? 2 : 1}
            />
            {/* front edge marker */}
            <line
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
              stroke="var(--accent)"
              strokeWidth={3}
              strokeLinecap="round"
              transform={`translate(${(edge.x1 === edge.x2 ? (edge.x1 === px ? 2.5 : -2.5) : 0)}, ${(edge.y1 === edge.y2 ? (edge.y1 === py ? 2.5 : -2.5) : 0)})`}
              style={{ pointerEvents: "none" }}
            />
            <text
              x={px + w / 2}
              y={py + h / 2 + 3}
              textAnchor="middle"
              fontSize={Math.min(9, tile / 2.6)}
              fontWeight={600}
              fill="#fff"
              style={{ pointerEvents: "none" }}
            >
              {cab.name.length > 10 ? cab.name.slice(0, 9) + "…" : cab.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
