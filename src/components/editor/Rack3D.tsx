"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, QuadraticBezierLine } from "@react-three/drei";
import type { Cabinet, Device } from "@/lib/types";
import { U, BASE_H, TOP_H, FLOOR_DROP } from "@/lib/rack-dims";
import { CabinetModel, pduLayout } from "./CabinetModel";

interface Props {
  cabinet: Cabinet;
  devices: Device[];
  selectedId: string | null;
  doorOpen: boolean;
  onSelect: (id: string | null) => void;
}

/** Bundle of curved cables. */
function CableBundle({
  from,
  to,
  mid,
  color,
  count = 4,
  spread = 0.05,
}: {
  from: [number, number, number];
  to: [number, number, number];
  mid: [number, number, number];
  color: string;
  count?: number;
  spread?: number;
}) {
  const offsets = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        return [Math.cos(a) * spread, 0, Math.sin(a) * spread] as const;
      }),
    [count, spread]
  );
  return (
    <>
      {offsets.map((o, i) => (
        <QuadraticBezierLine
          key={i}
          start={[from[0] + o[0], from[1], from[2] + o[2]]}
          end={[to[0] + o[0] * 0.5, to[1], to[2] + o[2] * 0.5]}
          mid={[mid[0] + o[0], mid[1], mid[2] + o[2]]}
          color={color}
          lineWidth={2.5}
        />
      ))}
    </>
  );
}

export function RaisedFloor({ size = 7 }: { size?: number }) {
  const pedestalCoords = useMemo(() => {
    const step = 0.6;
    const half = Math.floor(size / 2 / step) * step - step;
    const coords: number[] = [];
    for (let v = -half; v <= half + 0.001; v += step * 2) coords.push(Number(v.toFixed(2)));
    return coords;
  }, [size]);

  return (
    <group>
      {/* sub-floor slab */}
      <mesh position={[0, -FLOOR_DROP - 0.03, 0]} receiveShadow>
        <boxGeometry args={[size, 0.06, size]} />
        <meshStandardMaterial color="#11141c" roughness={0.95} />
      </mesh>
      {/* translucent raised floor tiles */}
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[size, 0.04, size]} />
        <meshStandardMaterial
          color="#39445c"
          transparent
          opacity={0.4}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>
      <gridHelper
        args={[size, Math.round(size / 0.6), "#5b6a8c", "#46516b"]}
        position={[0, 0.002, 0]}
      />
      {/* pedestals */}
      {pedestalCoords.map((x) =>
        pedestalCoords.map((z) => (
          <mesh key={`${x}:${z}`} position={[x, -FLOOR_DROP / 2, z]}>
            <cylinderGeometry args={[0.02, 0.03, FLOOR_DROP, 8]} />
            <meshStandardMaterial color="#232a3a" roughness={0.8} />
          </mesh>
        ))
      )}
    </group>
  );
}

export function SolidFloor({ size = 7 }: { size?: number }) {
  return (
    <group>
      <mesh position={[0, -0.03, 0]} receiveShadow>
        <boxGeometry args={[size, 0.06, size]} />
        <meshStandardMaterial color="#1a1f2c" roughness={0.9} />
      </mesh>
      <gridHelper
        args={[size, Math.round(size / 0.6), "#3a4358", "#2a3245"]}
        position={[0, 0.002, 0]}
      />
    </group>
  );
}

/** Power feed + data cabling visuals for one cabinet (at the origin). */
export function CabinetServices({ cabinet }: { cabinet: Cabinet }) {
  const height = cabinet.height_u * U;
  const totalH = BASE_H + height + TOP_H;
  const { positions: pduPositions, pduHeight, pduY0 } = pduLayout(cabinet);

  return (
    <>
      {/* power feed */}
      {pduPositions.length > 0 &&
        (cabinet.power_from_floor
          ? pduPositions.map((p, i) => (
              <CableBundle
                key={`pw${i}`}
                from={[p.x * 1.2, -FLOOR_DROP, p.z + (p.z >= 0 ? 0.5 : -0.5)]}
                mid={[p.x, -FLOOR_DROP / 2, p.z]}
                to={[p.x, pduY0 + 0.02, p.z]}
                color="#f5a623"
                count={3}
                spread={0.02}
              />
            ))
          : pduPositions.map((p, i) => (
              <CableBundle
                key={`pw${i}`}
                from={[p.x * 1.4, totalH + 0.8, p.z * 1.5]}
                mid={[p.x, totalH + 0.35, p.z]}
                to={[p.x, pduY0 + pduHeight - 0.02, p.z]}
                color="#f5a623"
                count={3}
                spread={0.02}
              />
            )))}

      {/* overhead power tray */}
      {!cabinet.power_from_floor && (
        <mesh position={[0, totalH + 0.82, 0]}>
          <boxGeometry args={[1.6, 0.04, 0.3]} />
          <meshStandardMaterial color="#33405a" metalness={0.5} roughness={0.6} wireframe />
        </mesh>
      )}

      {/* data cabling */}
      {(cabinet.cable_entry === "top" || cabinet.cable_entry === "both") && (
        <>
          <CableBundle
            from={[0.9, totalH + 0.8, -0.35]}
            mid={[0.25, totalH + 0.3, -0.15]}
            to={[0.12, totalH - 0.02, -0.1]}
            color="#00b8a9"
            count={5}
            spread={0.035}
          />
          {/* top cable tray */}
          <mesh position={[0.9, totalH + 0.82, -0.35]}>
            <boxGeometry args={[1.4, 0.04, 0.25]} />
            <meshStandardMaterial color="#2b5f5a" metalness={0.4} roughness={0.7} wireframe />
          </mesh>
        </>
      )}
      {(cabinet.cable_entry === "bottom" || cabinet.cable_entry === "both") && (
        <CableBundle
          from={[-0.7, -FLOOR_DROP, -0.8]}
          mid={[-0.18, -FLOOR_DROP / 2, -0.3]}
          to={[-0.12, BASE_H + 0.06, -0.1]}
          color="#00b8a9"
          count={5}
          spread={0.035}
        />
      )}
    </>
  );
}

function Scene({ cabinet, devices, selectedId, doorOpen, onSelect }: Props) {
  const showRaisedFloor = cabinet.power_from_floor || cabinet.cable_entry !== "top";

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 6, 4]} intensity={1.4} castShadow />
      <directionalLight position={[-4, 3, -4]} intensity={0.5} />

      {showRaisedFloor ? <RaisedFloor /> : <SolidFloor />}

      <CabinetModel
        cabinet={cabinet}
        devices={devices}
        selectedDeviceId={selectedId}
        doorOpen={doorOpen}
        onSelectDevice={onSelect}
      />
      <CabinetServices cabinet={cabinet} />
    </>
  );
}

export default function Rack3D(props: Props) {
  const camY = (props.cabinet.height_u * U) / 2 + 0.4;
  return (
    <Canvas
      shadows
      camera={{ position: [2.4, camY + 0.9, 2.9], fov: 42 }}
      onPointerMissed={() => props.onSelect(null)}
      style={{ background: "transparent" }}
    >
      <Scene {...props} />
      <OrbitControls
        target={[0, camY, 0]}
        maxPolarAngle={Math.PI / 2 + 0.15}
        minDistance={0.8}
        maxDistance={8}
        enableDamping
      />
    </Canvas>
  );
}
