import { NextResponse } from "next/server";
import { loadExportData, DEPTH_TEXT, safeFilename } from "@/lib/export/data";
import { tiptapToPlainText } from "@/lib/export/tiptap-text";
import { deviceTypeDef } from "@/lib/device-types";

function csvCell(value: string | number | null | undefined): string {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cabinetId: string }> }
) {
  const { cabinetId } = await params;
  const data = await loadExportData(cabinetId);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { cabinet, devices } = data;
  const rows: string[] = [];
  rows.push(
    [
      "cabinet",
      "u_position",
      "u_top",
      "name",
      "type",
      "height_u",
      "depth",
      "face",
      "manufacturer",
      "model",
      "serial_number",
      "asset_tag",
      "notes",
    ].join(",")
  );
  for (const d of devices) {
    rows.push(
      [
        csvCell(cabinet.name),
        d.position_u,
        d.position_u + d.height_u - 1,
        csvCell(d.name),
        csvCell(deviceTypeDef(d.device_type).label),
        d.height_u,
        csvCell(DEPTH_TEXT[d.depth]),
        d.face,
        csvCell(d.manufacturer),
        csvCell(d.model),
        csvCell(d.serial_number),
        csvCell(d.asset_tag),
        csvCell(tiptapToPlainText(d.notes)),
      ].join(",")
    );
  }

  return new NextResponse(rows.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeFilename(cabinet.name)}_devices.csv"`,
    },
  });
}
