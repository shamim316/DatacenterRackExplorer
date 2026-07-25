import { NextResponse } from "next/server";
import { loadExportData, describeCabinet, DEPTH_TEXT, safeFilename } from "@/lib/export/data";
import { tiptapToMarkdown } from "@/lib/export/tiptap-text";
import { deviceTypeDef } from "@/lib/device-types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cabinetId: string }> }
) {
  const { cabinetId } = await params;
  const data = await loadExportData(cabinetId);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { cabinet, devices } = data;
  const lines: string[] = [];

  lines.push(`# ${cabinet.name}`);
  lines.push("");
  lines.push(`> Datacenter cabinet documentation — exported ${new Date().toISOString().slice(0, 10)}`);
  lines.push("");
  lines.push("## Configuration");
  lines.push("");
  lines.push("| Property | Value |");
  lines.push("| --- | --- |");
  for (const [k, v] of describeCabinet(cabinet)) lines.push(`| ${k} | ${v} |`);
  lines.push("");

  const cabNotes = tiptapToMarkdown(cabinet.notes);
  if (cabNotes) {
    lines.push("## Cabinet notes");
    lines.push("");
    lines.push(cabNotes);
    lines.push("");
  }

  // ASCII elevation (front)
  lines.push("## Rack elevation");
  lines.push("");
  lines.push("```");
  for (let u = cabinet.height_u; u >= 1; u--) {
    const dev = devices.find(
      (d) =>
        u >= d.position_u &&
        u < d.position_u + d.height_u &&
        (d.face === "front" || d.depth === "full")
    );
    const label = dev
      ? u === d3Top(dev)
        ? ` ${dev.name}${dev.face === "rear" ? " (rear)" : ""}`
        : " │"
      : " · empty";
    lines.push(`U${String(u).padStart(2, "0")} │${label}`);
  }
  lines.push("```");
  lines.push("");

  lines.push("## Devices");
  lines.push("");
  if (devices.length === 0) {
    lines.push("_No devices._");
  } else {
    lines.push("| U | Name | Type | Height | Depth | Face | Manufacturer | Model | Serial | Asset tag |");
    lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
    for (const d of devices) {
      const range =
        d.height_u > 1 ? `${d.position_u}–${d.position_u + d.height_u - 1}` : `${d.position_u}`;
      lines.push(
        `| ${range} | ${d.name} | ${deviceTypeDef(d.device_type).label} | ${d.height_u}U | ${DEPTH_TEXT[d.depth]} | ${d.face} | ${d.manufacturer ?? ""} | ${d.model ?? ""} | ${d.serial_number ?? ""} | ${d.asset_tag ?? ""} |`
      );
    }
  }
  lines.push("");

  for (const d of devices) {
    const notes = tiptapToMarkdown(d.notes);
    if (notes) {
      lines.push(`### Notes — ${d.name}`);
      lines.push("");
      lines.push(notes);
      lines.push("");
    }
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeFilename(cabinet.name)}.md"`,
    },
  });
}

function d3Top(d: { position_u: number; height_u: number }): number {
  return d.position_u + d.height_u - 1;
}
