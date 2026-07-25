import { NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { loadExportData, safeFilename } from "@/lib/export/data";
import { CabinetPdf } from "@/lib/export/pdf-doc";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cabinetId: string }> }
) {
  const { cabinetId } = await params;
  const data = await loadExportData(cabinetId);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const doc = React.createElement(CabinetPdf, {
    cabinet: data.cabinet,
    devices: data.devices,
  }) as unknown as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeFilename(data.cabinet.name)}.pdf"`,
    },
  });
}
