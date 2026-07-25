"use client";

import { useRef, useState } from "react";
import {
  floorFootprint,
  floorPlacementCollides,
  placementInBounds,
  type Cabinet,
  type Floor,
} from "@/lib/types";

const MAX_W = 332; // fits the sidebar

interface Props {
  floor: Floor;
  cabinets: Cabinet[]; // placed cabinets only
  selectedId: string | null;
  readOnly: boolean;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
}

/** Top-down floor plan on the tile grid; drag cabinets to reposition. */
export function FloorPlan2D({
  floor,
  cabinets,
  selectedId,
  readOnly,
  onSelect,
  onMove,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tile = Math.min(MAX_W / floor.grid_cols, 30);
  const W = floor.grid_cols * tile;
  const H = floor.grid_rows * tile;

  const [drag, setDrag] = useState<{
    id: string;
    dx: number; // tile offset between anchor and grab point
    dy: number;
    x: number; // preview anchor
    y: number;
    valid: boolean;
  } | null>(null);

  function tileFromEvent(e: React.PointerEvent): { x: number; y: number } {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - rect.left) / tile),
      y: Math.floor((e.clientY - rect.top) / tile),
    };
  }

  function startDrag(e: React.PointerEvent, cab: Cabinet) {
    if (readOnly) return;
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
    if (!drag) return;
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
  }

  function endDrag() {
    if (!drag) return;
    const cab = cabinets.find((c) => c.id === drag.id);
    if (
      cab &&
      drag.valid &&
      (drag.x !== cab.floor_x || drag.y !== cab.floor_y)
    ) {
      onMove(drag.id, drag.x, drag.y);
    }
    setDrag(null);
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

  return (
    <svg
      ref={svgRef}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="select-none touch-none mx-auto block rounded-lg"
      style={{ background: "var(--rack-bg)", border: "1px solid var(--border-strong)" }}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onClick={(e) => {
        if (e.target === svgRef.current) onSelect(null);
      }}
    >
      {/* tile grid */}
      {Array.from({ length: floor.grid_cols + 1 }, (_, i) => (
        <line key={`v${i}`} x1={i * tile} y1={0} x2={i * tile} y2={H} stroke="var(--border)" strokeWidth={0.5} />
      ))}
      {Array.from({ length: floor.grid_rows + 1 }, (_, i) => (
        <line key={`h${i}`} x1={0} y1={i * tile} x2={W} y2={i * tile} stroke="var(--border)" strokeWidth={0.5} />
      ))}

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
            style={{ cursor: readOnly ? "pointer" : "grab" }}
            onPointerDown={(e) => startDrag(e, cab)}
            onClick={(e) => {
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
