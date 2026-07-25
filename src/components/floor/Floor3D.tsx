"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { CabinetModel } from "@/components/editor/CabinetModel";
import {
  floorFootprint,
  type Cabinet,
  type Device,
  type Floor,
} from "@/lib/types";
import { U, BASE_H, TOP_H, TILE, FLOOR_DROP } from "@/lib/rack-dims";

interface Props {
  floor: Floor;
  cabinets: Cabinet[]; // placed only
  devicesByCabinet: Map<string, Device[]>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onOpen: (id: string) => void;
}

/** Rectangular raised floor with tile grid lines. */
function RoomFloor({ cols, rows }: { cols: number; rows: number }) {
  const w = cols * TILE;
  const d = rows * TILE;

  const gridPositions = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i <= cols; i++) {
      const x = -w / 2 + i * TILE;
      pts.push(x, 0, -d / 2, x, 0, d / 2);
    }
    for (let j = 0; j <= rows; j++) {
      const z = -d / 2 + j * TILE;
      pts.push(-w / 2, 0, z, w / 2, 0, z);
    }
    return new Float32Array(pts);
  }, [cols, rows, w, d]);

  const pedestals = useMemo(() => {
    const list: [number, number][] = [];
    for (let i = 0; i <= cols; i += 2)
      for (let j = 0; j <= rows; j += 2)
        list.push([-w / 2 + i * TILE, -d / 2 + j * TILE]);
    return list;
  }, [cols, rows, w, d]);

  return (
    <group>
      {/* sub-floor slab */}
      <mesh position={[0, -FLOOR_DROP - 0.03, 0]} receiveShadow>
        <boxGeometry args={[w + 1.2, 0.06, d + 1.2]} />
        <meshStandardMaterial color="#11141c" roughness={0.95} />
      </mesh>
      {/* translucent raised floor */}
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[w, 0.04, d]} />
        <meshStandardMaterial
          color="#39445c"
          transparent
          opacity={0.42}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>
      {/* tile grid */}
      <lineSegments position={[0, 0.003, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[gridPositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#5b6a8c" transparent opacity={0.6} />
      </lineSegments>
      {/* pedestals */}
      {pedestals.map(([x, z], i) => (
        <mesh key={i} position={[x, -FLOOR_DROP / 2, z]}>
          <cylinderGeometry args={[0.02, 0.03, FLOOR_DROP, 8]} />
          <meshStandardMaterial color="#232a3a" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function PlacedCabinet({
  cabinet,
  devices,
  floor,
  selected,
  onSelect,
  onOpen,
}: {
  cabinet: Cabinet;
  devices: Device[];
  floor: Floor;
  selected: boolean;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const fp = floorFootprint(cabinet);
  const w = floor.grid_cols * TILE;
  const d = floor.grid_rows * TILE;
  const x = -w / 2 + (cabinet.floor_x! + fp.w / 2) * TILE;
  const z = -d / 2 + (cabinet.floor_y! + fp.h / 2) * TILE;
  const yaw = (-cabinet.floor_rotation * Math.PI) / 180;
  const totalH = BASE_H + cabinet.height_u * U + TOP_H;

  return (
    <group position={[x, 0, z]}>
      <group
        rotation={[0, yaw, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(cabinet.id);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onOpen(cabinet.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <CabinetModel cabinet={cabinet} devices={devices} />
      </group>

      {/* selection ring */}
      {selected && (
        <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.5, 40]} />
          <meshBasicMaterial color="#f5a623" transparent opacity={0.9} />
        </mesh>
      )}

      {/* name label */}
      {selected && (
        <Html center distanceFactor={6} position={[0, totalH + 0.25, 0]}>
          <div
            style={{
              background: "var(--bg-raised)",
              border: "1px solid var(--accent)",
              color: "var(--text)",
              borderRadius: 8,
              padding: "3px 10px",
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            {cabinet.name} — double-click to open
          </div>
        </Html>
      )}
    </group>
  );
}

export default function Floor3D({
  floor,
  cabinets,
  devicesByCabinet,
  selectedId,
  onSelect,
  onOpen,
}: Props) {
  const w = floor.grid_cols * TILE;
  const d = floor.grid_rows * TILE;
  const span = Math.max(w, d);

  return (
    <Canvas
      shadows
      camera={{
        position: [span * 0.55, Math.max(2.6, span * 0.5), span * 0.85],
        fov: 45,
      }}
      onPointerMissed={() => onSelect(null)}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[span, span * 1.2, span]} intensity={1.3} castShadow />
      <directionalLight position={[-span, span * 0.7, -span]} intensity={0.45} />

      <RoomFloor cols={floor.grid_cols} rows={floor.grid_rows} />

      {cabinets.map((cab) => (
        <PlacedCabinet
          key={cab.id}
          cabinet={cab}
          devices={devicesByCabinet.get(cab.id) ?? []}
          floor={floor}
          selected={selectedId === cab.id}
          onSelect={onSelect}
          onOpen={onOpen}
        />
      ))}

      <OrbitControls
        target={[0, 0.8, 0]}
        maxPolarAngle={Math.PI / 2 - 0.02}
        minDistance={1.2}
        maxDistance={span * 3}
        enableDamping
      />
    </Canvas>
  );
}
