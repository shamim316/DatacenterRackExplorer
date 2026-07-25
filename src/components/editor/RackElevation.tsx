"use client";

import { useRef, useState } from "react";
import { deviceColor } from "@/lib/device-types";
import {
  findCollision,
  DEPTH_LABELS,
  type Cabinet,
  type Device,
  type DeviceFace,
} from "@/lib/types";

const U_HEIGHT = 22; // px per U
const RAIL_W = 26; // px, numbered rail column
const WIDTH = 300; // total svg width

interface Props {
  cabinet: Cabinet;
  devices: Device[];
  face: DeviceFace;
  selectedId: string | null;
  readOnly: boolean;
  onSelect: (id: string | null) => void;
  onMove: (id: string, positionU: number) => void;
}

/** 2D front/rear rack elevation with drag-to-reposition. */
export function RackElevation({
  cabinet,
  devices,
  face,
  selectedId,
  readOnly,
  onSelect,
  onMove,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{
    id: string;
    grabOffsetU: number; // U-distance between device bottom and grab point
    previewU: number;
    valid: boolean;
  } | null>(null);

  const H = cabinet.height_u * U_HEIGHT;
  const innerX = RAIL_W;
  const innerW = WIDTH - RAIL_W * 2;

  // y for the TOP edge of a device occupying [posU, posU+h)
  const yForU = (posU: number, hU: number) => H - (posU - 1 + hU) * U_HEIGHT;

  const uFromClientY = (clientY: number): number => {
    const rect = svgRef.current!.getBoundingClientRect();
    const y = clientY - rect.top;
    return Math.floor((H - y) / U_HEIGHT) + 1; // U under the pointer
  };

  // devices shown on this face: matching face solid, full-depth other-face ghosted
  const visible = devices.filter(
    (d) => d.face === face || d.depth === "full"
  );

  function startDrag(e: React.PointerEvent, device: Device) {
    if (readOnly || device.face !== face) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const grabU = uFromClientY(e.clientY);
    setDrag({
      id: device.id,
      grabOffsetU: grabU - device.position_u,
      previewU: device.position_u,
      valid: true,
    });
    onSelect(device.id);
  }

  function moveDrag(e: React.PointerEvent) {
    if (!drag) return;
    const device = devices.find((d) => d.id === drag.id);
    if (!device) return;
    let pos = uFromClientY(e.clientY) - drag.grabOffsetU;
    pos = Math.max(1, Math.min(pos, cabinet.height_u - device.height_u + 1));
    const candidate = { ...device, position_u: pos };
    const valid = !findCollision(candidate, devices, device.id);
    setDrag({ ...drag, previewU: pos, valid });
  }

  function endDrag() {
    if (!drag) return;
    const device = devices.find((d) => d.id === drag.id);
    if (device && drag.valid && drag.previewU !== device.position_u) {
      onMove(drag.id, drag.previewU);
    }
    setDrag(null);
  }

  return (
    <svg
      ref={svgRef}
      width={WIDTH}
      height={H}
      viewBox={`0 0 ${WIDTH} ${H}`}
      className="select-none touch-none mx-auto block"
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onClick={(e) => {
        if (e.target === svgRef.current) onSelect(null);
      }}
    >
      {/* rack interior */}
      <rect
        x={innerX}
        y={0}
        width={innerW}
        height={H}
        fill="var(--rack-bg)"
        stroke="var(--border-strong)"
      />

      {/* U grid + numbered rails */}
      {Array.from({ length: cabinet.height_u }, (_, i) => {
        const u = i + 1;
        const y = H - u * U_HEIGHT;
        return (
          <g key={u}>
            <line
              x1={innerX}
              x2={innerX + innerW}
              y1={y}
              y2={y}
              stroke="var(--border)"
              strokeWidth={0.5}
            />
            <text
              x={RAIL_W / 2}
              y={y + U_HEIGHT / 2 + 3}
              textAnchor="middle"
              fontSize={9}
              fill="var(--text-faint)"
              fontFamily="var(--font-mono)"
            >
              {u}
            </text>
            <text
              x={WIDTH - RAIL_W / 2}
              y={y + U_HEIGHT / 2 + 3}
              textAnchor="middle"
              fontSize={9}
              fill="var(--text-faint)"
              fontFamily="var(--font-mono)"
            >
              {u}
            </text>
          </g>
        );
      })}

      {/* rails */}
      <rect x={0} y={0} width={RAIL_W} height={H} fill="var(--bg-sunken)" stroke="var(--border-strong)" />
      <rect x={WIDTH - RAIL_W} y={0} width={RAIL_W} height={H} fill="var(--bg-sunken)" stroke="var(--border-strong)" />

      {/* devices */}
      {visible.map((d) => {
        const isGhost = d.face !== face; // full-depth mounted on the other side
        const isDragging = drag?.id === d.id;
        const posU = isDragging ? drag.previewU : d.position_u;
        const y = yForU(posU, d.height_u);
        const color = deviceColor(d.device_type, d.color);
        const selectedNow = selectedId === d.id;
        return (
          <g
            key={d.id}
            opacity={isGhost ? 0.35 : isDragging && !drag.valid ? 0.6 : 1}
            style={{ cursor: readOnly || isGhost ? "pointer" : "grab" }}
            onPointerDown={(e) => startDrag(e, d)}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(d.id);
            }}
          >
            <rect
              x={innerX + 3}
              y={y + 1.5}
              width={innerW - 6}
              height={d.height_u * U_HEIGHT - 3}
              rx={3}
              fill={color}
              fillOpacity={isGhost ? 0.5 : 0.92}
              stroke={
                selectedNow
                  ? "var(--accent)"
                  : isDragging && !drag.valid
                    ? "var(--danger)"
                    : "rgba(0,0,0,0.35)"
              }
              strokeWidth={selectedNow ? 2 : 1}
              strokeDasharray={isGhost ? "4 3" : undefined}
            />
            <text
              x={innerX + 12}
              y={y + (d.height_u * U_HEIGHT) / 2 + 3.5}
              fontSize={10.5}
              fontWeight={600}
              fill="#fff"
              style={{ pointerEvents: "none" }}
            >
              {d.name.length > 26 ? d.name.slice(0, 25) + "…" : d.name}
            </text>
            {d.height_u >= 2 && (
              <text
                x={innerX + innerW - 10}
                y={y + d.height_u * U_HEIGHT - 7}
                fontSize={8.5}
                textAnchor="end"
                fill="rgba(255,255,255,0.75)"
                style={{ pointerEvents: "none" }}
              >
                {d.height_u}U · {DEPTH_LABELS[d.depth]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
