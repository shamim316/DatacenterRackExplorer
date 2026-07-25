import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Cabinet, Device } from "@/lib/types";
import { describeCabinet, DEPTH_TEXT } from "./data";
import { tiptapToPlainText } from "./tiptap-text";
import { deviceTypeDef, deviceColor } from "@/lib/device-types";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9.5, fontFamily: "Helvetica", color: "#1a2030" },
  h1: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  sub: { fontSize: 9, color: "#6b7280", marginBottom: 18 },
  h2: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 16,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  metaRow: { flexDirection: "row", paddingVertical: 2.5 },
  metaKey: { width: 110, color: "#6b7280" },
  metaVal: { flex: 1, fontFamily: "Helvetica-Bold" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3.5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
    fontSize: 8,
  },
  notes: { lineHeight: 1.5, color: "#374151" },
});

const COLS: { key: string; label: string; width: number }[] = [
  { key: "u", label: "U", width: 34 },
  { key: "name", label: "Name", width: 110 },
  { key: "type", label: "Type", width: 70 },
  { key: "height", label: "Height", width: 36 },
  { key: "depth", label: "Depth", width: 52 },
  { key: "face", label: "Face", width: 34 },
  { key: "mfg", label: "Manufacturer", width: 70 },
  { key: "model", label: "Model", width: 70 },
  { key: "serial", label: "Serial", width: 60 },
];

function Elevation({
  cabinet,
  devices,
  face,
}: {
  cabinet: Cabinet;
  devices: Device[];
  face: "front" | "rear";
}) {
  const uH = Math.min(13, 560 / cabinet.height_u);
  const height = cabinet.height_u * uH;
  const width = 190;
  const visible = devices.filter((d) => d.face === face || d.depth === "full");

  return (
    <View style={{ width: width + 30 }}>
      <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 4 }}>
        {face === "front" ? "Front" : "Rear"}
      </Text>
      <View
        style={{
          flexDirection: "row",
          height,
        }}
      >
        {/* U numbers */}
        <View style={{ width: 18 }}>
          {Array.from({ length: cabinet.height_u }, (_, i) => {
            const u = cabinet.height_u - i;
            return (
              <Text
                key={u}
                style={{
                  fontSize: Math.min(6, uH - 2),
                  height: uH,
                  color: "#9ca3af",
                  textAlign: "right",
                  paddingRight: 3,
                }}
              >
                {u}
              </Text>
            );
          })}
        </View>
        {/* rack body */}
        <View
          style={{
            width,
            height,
            borderWidth: 1,
            borderColor: "#9ca3af",
            backgroundColor: "#f6f7fb",
            position: "relative",
          }}
        >
          {Array.from({ length: cabinet.height_u - 1 }, (_, i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                top: (i + 1) * uH,
                left: 0,
                right: 0,
                borderBottomWidth: 0.4,
                borderBottomColor: "#e2e4ee",
              }}
            />
          ))}
          {visible.map((d) => {
            const ghost = d.face !== face;
            const top = height - (d.position_u - 1 + d.height_u) * uH;
            return (
              <View
                key={d.id}
                style={{
                  position: "absolute",
                  top: top + 0.8,
                  left: 2,
                  right: 2,
                  height: d.height_u * uH - 1.6,
                  backgroundColor: deviceColor(d.device_type, d.color),
                  opacity: ghost ? 0.35 : 1,
                  borderRadius: 2,
                  justifyContent: "center",
                  paddingHorizontal: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: Math.min(6.5, Math.max(4.5, uH - 3)),
                    color: "#ffffff",
                  }}
                >
                  {d.name}
                  {ghost ? " (other face)" : ""}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export function CabinetPdf({
  cabinet,
  devices,
}: {
  cabinet: Cabinet;
  devices: Device[];
}) {
  const cabNotes = tiptapToPlainText(cabinet.notes);
  const devicesWithNotes = devices.filter((d) => tiptapToPlainText(d.notes));

  return (
    <Document title={`${cabinet.name} — RackDoc`} author="RackDoc">
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>{cabinet.name}</Text>
        <Text style={styles.sub}>
          Datacenter cabinet documentation · exported{" "}
          {new Date().toISOString().slice(0, 10)}
        </Text>

        <Text style={styles.h2}>Configuration</Text>
        {describeCabinet(cabinet).map(([k, v]) => (
          <View key={k} style={styles.metaRow}>
            <Text style={styles.metaKey}>{k}</Text>
            <Text style={styles.metaVal}>{v}</Text>
          </View>
        ))}

        {cabNotes ? (
          <>
            <Text style={styles.h2}>Cabinet notes</Text>
            <Text style={styles.notes}>{cabNotes}</Text>
          </>
        ) : null}
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Rack elevation</Text>
        <View style={{ flexDirection: "row", gap: 30, marginTop: 6 }}>
          <Elevation cabinet={cabinet} devices={devices} face="front" />
          <Elevation cabinet={cabinet} devices={devices} face="rear" />
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Device inventory ({devices.length})</Text>
        <View style={styles.tableHeader}>
          {COLS.map((c) => (
            <Text key={c.key} style={{ width: c.width }}>
              {c.label}
            </Text>
          ))}
        </View>
        {devices.map((d) => (
          <View key={d.id} style={styles.tableRow} wrap={false}>
            <Text style={{ width: COLS[0].width }}>
              {d.height_u > 1
                ? `${d.position_u}–${d.position_u + d.height_u - 1}`
                : String(d.position_u)}
            </Text>
            <Text style={{ width: COLS[1].width }}>{d.name}</Text>
            <Text style={{ width: COLS[2].width }}>{deviceTypeDef(d.device_type).label}</Text>
            <Text style={{ width: COLS[3].width }}>{d.height_u}U</Text>
            <Text style={{ width: COLS[4].width }}>{DEPTH_TEXT[d.depth]}</Text>
            <Text style={{ width: COLS[5].width }}>{d.face}</Text>
            <Text style={{ width: COLS[6].width }}>{d.manufacturer ?? ""}</Text>
            <Text style={{ width: COLS[7].width }}>{d.model ?? ""}</Text>
            <Text style={{ width: COLS[8].width }}>{d.serial_number ?? ""}</Text>
          </View>
        ))}

        {devicesWithNotes.length > 0 ? (
          <>
            <Text style={styles.h2}>Device notes</Text>
            {devicesWithNotes.map((d) => (
              <View key={d.id} style={{ marginBottom: 8 }} wrap={false}>
                <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2 }}>
                  {d.name} (U{d.position_u})
                </Text>
                <Text style={styles.notes}>{tiptapToPlainText(d.notes)}</Text>
              </View>
            ))}
          </>
        ) : null}
      </Page>
    </Document>
  );
}
