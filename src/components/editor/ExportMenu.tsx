"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileText, Table2, FileType } from "lucide-react";

export function ExportMenu({
  cabinetId,
  cabinetName,
}: {
  cabinetId: string;
  cabinetName: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const items = [
    { format: "markdown", label: "Markdown (.md)", icon: FileText },
    { format: "csv", label: "Device inventory (.csv)", icon: Table2 },
    { format: "pdf", label: "PDF report (.pdf)", icon: FileType },
  ];

  return (
    <div className="relative" ref={ref}>
      <button className="btn btn-secondary !py-1.5" onClick={() => setOpen((v) => !v)}>
        <Download size={15} /> Export
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 card p-1.5 w-56">
          {items.map((item) => (
            <a
              key={item.format}
              href={`/api/export/${cabinetId}/${item.format}`}
              download
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm hover:bg-sunken"
              title={`Export "${cabinetName}" as ${item.label}`}
            >
              <item.icon size={15} className="text-ink-muted" />
              {item.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
