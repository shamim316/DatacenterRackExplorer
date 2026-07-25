"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, QuadraticBezierLine } from "@react-three/drei";
import * as THREE from "three";
import { deviceColor } from "@/lib/device-types";
import { DEPTH_FRACTION, type Cabinet, type Device } from "@/lib/types";

// ---- Real-world dimensions (meters) ----
const U = 0.04445;
const RACK_W = 0.6; // outer width
const RAIL_SPAN = 0.484; // usable width between rails
const DEPTH_4POST = 1.07;
const BASE_H = 0.09; // plinth under U-space
const TOP_H = 0.04;
const FLOOR_DROP = 0.42; // raised floor cavity depth

interface Props {
  cabinet: Cabinet;
  devices: Device[];
  selectedId: string | null;
  doorOpen: boolean;
  onSelect: (id: string | null) => void;
}

const steel = "#2a3242";

function frameMaterial(color = steel) {
  return <meshStandardMaterial color={color} metalness={0.6} roughness={0.5} />;
}

/** A single rack-mounted device box. */
function DeviceBox({
  device,
  cabinet,
  selected,
  onSelect,
}: {
  device: Device;
  cabinet: Cabinet;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const usableDepth = cabinet.post_type === "four_post" ? DEPTH_4POST - 0.14 : 0.75;
  const depth = usableDepth * DEPTH_FRACTION[device.depth];
  const h = device.height_u * U - 0.006;
  const y = BASE_H + (device.position_u - 1) * U + (device.height_u * U) / 2;

  // Front-mounted: flush with front plane; rear-mounted: flush with rear plane.
  const frontZ = cabinet.post_type === "four_post" ? DEPTH_4POST / 2 - 0.07 : usableDepth / 2;
  const z = device.face === "front" ? frontZ - depth / 2 : -frontZ + depth / 2;

  const color = deviceColor(device.device_type, device.color);

  return (
    <group position={[0, y, z]}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(device.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "";
        }}
      >
        <boxGeometry args={[RAIL_SPAN, h, depth]} />
        <meshStandardMaterial
          color={color}
          metalness={0.3}
          roughness={0.55}
          emissive={selected ? color : hovered ? color : "#000000"}
          emissiveIntensity={selected ? 0.45 : hovered ? 0.2 : 0}
        />
      </mesh>
      {/* faceplate accent */}
      <mesh position={[0, 0, device.face === "front" ? depth / 2 + 0.002 : -depth / 2 - 0.002]}>
        <planeGeometry args={[RAIL_SPAN - 0.02, Math.max(h - 0.008, 0.02)]} />
        <meshStandardMaterial
          color={new THREE.Color(color).multiplyScalar(0.75)}
          side={THREE.DoubleSide}
          metalness={0.2}
          roughness={0.8}
        />
      </mesh>
      {selected && (
        <Html center distanceFactor={3.2} position={[0, h / 2 + 0.05, 0]}>
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
            {device.name} · U{device.position_u}
            {device.height_u > 1 ? `–${device.position_u + device.height_u - 1}` : ""}
          </div>
        </Html>
      )}
    </group>
  );
}

/** Hinged door that swings open/closed. */
function Door({
  side,
  width,
  height,
  z,
  open,
}: {
  side: "front" | "rear";
  width: number;
  height: number;
  z: number;
  open: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const dir = side === "front" ? 1 : -1;
  useFrame(() => {
    if (!group.current) return;
    const target = open ? dir * -Math.PI * 0.62 : 0;
    group.current.rotation.y += (target - group.current.rotation.y) * 0.12;
  });

  return (
    // hinge on the left edge
    <group position={[-width / 2, height / 2, z]}>
      <group ref={group}>
        <mesh position={[width / 2, 0, 0]}>
          <boxGeometry args={[width, height, 0.015]} />
          <meshStandardMaterial
            color="#1c2433"
            metalness={0.7}
            roughness={0.35}
            transparent
            opacity={0.55}
          />
        </mesh>
        {/* door frame + handle */}
        <mesh position={[width / 2, 0, dir * 0.002]}>
          <boxGeometry args={[width, height, 0.004]} />
          <meshStandardMaterial color="#0f1522" wireframe />
        </mesh>
        <mesh position={[width - 0.05, 0, dir * 0.018]}>
          <boxGeometry args={[0.02, 0.14, 0.02]} />
          <meshStandardMaterial color="#8a93a6" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

/** Vertical zero-U PDU strip with outlets. */
function VerticalPdu({
  x,
  z,
  height,
  y0,
}: {
  x: number;
  z: number;
  height: number;
  y0: number;
}) {
  const outlets = Math.max(3, Math.floor(height / 0.09));
  return (
    <group position={[x, y0 + height / 2, z]}>
      <mesh>
        <boxGeometry args={[0.055, height, 0.055]} />
        <meshStandardMaterial color="#f5a623" metalness={0.35} roughness={0.5} />
      </mesh>
      {Array.from({ length: outlets }, (_, i) => (
        <mesh
          key={i}
          position={[0, -height / 2 + (i + 0.5) * (height / outlets), z >= 0 ? 0.029 : -0.029]}
        >
          <boxGeometry args={[0.028, 0.02, 0.004]} />
          <meshStandardMaterial color="#221a08" />
        </mesh>
      ))}
    </group>
  );
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

function Scene({ cabinet, devices, selectedId, doorOpen, onSelect }: Props) {
  const height = cabinet.height_u * U;
  const totalH = BASE_H + height + TOP_H;
  const isFourPost = cabinet.post_type === "four_post";
  const depth = isFourPost ? DEPTH_4POST : 0.16;
  const showRaisedFloor =
    cabinet.power_from_floor || cabinet.cable_entry !== "top";

  const postGeom: [number, number, number] = [0.05, height, 0.05];
  const postY = BASE_H + height / 2;
  const postX = RACK_W / 2 - 0.04;
  const postZ = depth / 2 - 0.05;

  const pduHeight = height * 0.78;
  const pduY0 = BASE_H + height * 0.06;
  const pduZ = depth / 2 - 0.1;
  const pduPositions: { x: number; z: number }[] = [];
  if (cabinet.pdu_mount !== "none") {
    const sides = cabinet.pdu_both_sides ? [-1, 1] : [1];
    const faces: number[] = [];
    if (cabinet.pdu_mount === "front" || cabinet.pdu_mount === "front_rear") faces.push(1);
    if (cabinet.pdu_mount === "rear" || cabinet.pdu_mount === "front_rear") faces.push(-1);
    for (const f of faces)
      for (const s of sides)
        pduPositions.push({ x: s * (RACK_W / 2 - 0.045), z: f * (isFourPost ? pduZ : 0.06) });
  }

  const doorW = RACK_W - 0.02;

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 6, 4]} intensity={1.4} castShadow />
      <directionalLight position={[-4, 3, -4]} intensity={0.5} />

      {/* ---------- Floor ---------- */}
      {showRaisedFloor ? (
        <group>
          {/* sub-floor slab */}
          <mesh position={[0, -FLOOR_DROP - 0.03, 0]} receiveShadow>
            <boxGeometry args={[7, 0.06, 7]} />
            <meshStandardMaterial color="#11141c" roughness={0.95} />
          </mesh>
          {/* translucent raised floor tiles */}
          <mesh position={[0, -0.02, 0]} receiveShadow>
            <boxGeometry args={[7, 0.04, 7]} />
            <meshStandardMaterial
              color="#39445c"
              transparent
              opacity={0.4}
              roughness={0.4}
              metalness={0.2}
            />
          </mesh>
          <gridHelper args={[7, 12, "#5b6a8c", "#46516b"]} position={[0, 0.002, 0]} />
          {/* pedestals */}
          {[-1.5, -0.9, -0.3, 0.3, 0.9, 1.5].map((x) =>
            [-1.5, -0.9, -0.3, 0.3, 0.9, 1.5].map((z) => (
              <mesh key={`${x}:${z}`} position={[x, -FLOOR_DROP / 2, z]}>
                <cylinderGeometry args={[0.02, 0.03, FLOOR_DROP, 8]} />
                <meshStandardMaterial color="#232a3a" roughness={0.8} />
              </mesh>
            ))
          )}
        </group>
      ) : (
        <group>
          <mesh position={[0, -0.03, 0]} receiveShadow>
            <boxGeometry args={[7, 0.06, 7]} />
            <meshStandardMaterial color="#1a1f2c" roughness={0.9} />
          </mesh>
          <gridHelper args={[7, 12, "#3a4358", "#2a3245"]} position={[0, 0.002, 0]} />
        </group>
      )}

      {/* ---------- Cabinet ---------- */}
      <group>
        {/* plinth */}
        <mesh position={[0, BASE_H / 2, 0]} castShadow>
          <boxGeometry args={[RACK_W, BASE_H, isFourPost ? depth : 0.5]} />
          {frameMaterial("#1b2230")}
        </mesh>

        {isFourPost ? (
          <>
            {/* 4 posts */}
            {[
              [-postX, postZ],
              [postX, postZ],
              [-postX, -postZ],
              [postX, -postZ],
            ].map(([x, z], i) => (
              <mesh key={i} position={[x, postY, z]} castShadow>
                <boxGeometry args={postGeom} />
                {frameMaterial()}
              </mesh>
            ))}
            {/* mounting rails (inner) */}
            {[
              [-RAIL_SPAN / 2 - 0.012, depth / 2 - 0.075],
              [RAIL_SPAN / 2 + 0.012, depth / 2 - 0.075],
              [-RAIL_SPAN / 2 - 0.012, -depth / 2 + 0.075],
              [RAIL_SPAN / 2 + 0.012, -depth / 2 + 0.075],
            ].map(([x, z], i) => (
              <mesh key={`rail${i}`} position={[x, postY, z]}>
                <boxGeometry args={[0.018, height, 0.04]} />
                {frameMaterial("#39435a")}
              </mesh>
            ))}
            {/* top frame */}
            <mesh position={[0, BASE_H + height + TOP_H / 2, 0]} castShadow>
              <boxGeometry args={[RACK_W, TOP_H, depth]} />
              {frameMaterial("#1b2230")}
            </mesh>
            {/* side panels */}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * (RACK_W / 2 - 0.005), postY, 0]}>
                <boxGeometry args={[0.01, height, depth - 0.02]} />
                <meshStandardMaterial
                  color="#1f2736"
                  metalness={0.5}
                  roughness={0.6}
                  transparent
                  opacity={0.35}
                />
              </mesh>
            ))}
            {/* doors */}
            {(cabinet.door === "front" || cabinet.door === "front_rear") && (
              <Door side="front" width={doorW} height={height} z={depth / 2 + 0.012} open={doorOpen} />
            )}
            {(cabinet.door === "rear" || cabinet.door === "front_rear") && (
              <Door side="rear" width={doorW} height={height} z={-depth / 2 - 0.012} open={doorOpen} />
            )}
          </>
        ) : (
          <>
            {/* 2 posts (channel uprights) */}
            {[-1, 1].map((s) => (
              <group key={s}>
                <mesh position={[s * postX, postY, 0]} castShadow>
                  <boxGeometry args={[0.06, height, 0.12]} />
                  {frameMaterial()}
                </mesh>
                {/* channel flanges */}
                <mesh position={[s * (postX - 0.045), postY, 0]}>
                  <boxGeometry args={[0.03, height, 0.04]} />
                  {frameMaterial("#39435a")}
                </mesh>
              </group>
            ))}
            {/* top tie bar */}
            <mesh position={[0, BASE_H + height + 0.015, 0]}>
              <boxGeometry args={[RACK_W, 0.03, 0.1]} />
              {frameMaterial("#1b2230")}
            </mesh>
          </>
        )}

        {/* U tick marks on left front post */}
        {/* devices */}
        {devices.map((d) => (
          <DeviceBox
            key={d.id}
            device={d}
            cabinet={cabinet}
            selected={selectedId === d.id}
            onSelect={onSelect}
          />
        ))}

        {/* vertical PDUs */}
        {pduPositions.map((p, i) => (
          <VerticalPdu key={i} x={p.x} z={p.z} height={pduHeight} y0={pduY0} />
        ))}
      </group>

      {/* ---------- Power feed ---------- */}
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

      {/* ---------- Data cabling ---------- */}
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
