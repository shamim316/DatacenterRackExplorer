"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function NewFloorForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cols, setCols] = useState(12);
  const [rows, setRows] = useState(8);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error } = await supabase
      .from("floors")
      .insert({
        org_id: orgId,
        name: name.trim(),
        description: description.trim() || null,
        grid_cols: cols,
        grid_rows: rows,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) setError(error.message);
    else router.push(`/floors/${data.id}`);
  }

  return (
    <div className="flex-1 p-8 max-w-xl w-full mx-auto">
      <Link
        href="/floors"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-6"
      >
        <ArrowLeft size={15} /> Back to floors
      </Link>
      <h1 className="text-2xl font-semibold mb-1">New floor</h1>
      <p className="text-sm text-ink-muted mb-8">
        The grid uses standard 600&nbsp;mm datacenter tiles. A 4-post cabinet
        occupies 1 × 2 tiles; a 2-post rack occupies 1 × 1.
      </p>

      <form onSubmit={submit} className="card p-6 space-y-4">
        <div>
          <label className="label">Floor name *</label>
          <input
            className="input"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="DC-East · Suite 2"
          />
        </div>
        <div>
          <label className="label">Description</label>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Main production room"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Width (tiles)</label>
            <input
              type="number"
              className="input"
              min={2}
              max={60}
              value={cols}
              onChange={(e) => setCols(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Depth (tiles)</label>
            <input
              type="number"
              className="input"
              min={2}
              max={60}
              value={rows}
              onChange={(e) => setRows(Number(e.target.value))}
            />
          </div>
        </div>
        <p className="text-xs text-ink-faint">
          {cols} × {rows} tiles ≈ {(cols * 0.6).toFixed(1)} m × {(rows * 0.6).toFixed(1)} m
        </p>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <Link href="/floors" className="btn btn-ghost">
            Cancel
          </Link>
          <button type="submit" disabled={busy || !name.trim()} className="btn btn-primary">
            {busy && <Loader2 size={16} className="animate-spin" />}
            Create floor
          </button>
        </div>
      </form>
    </div>
  );
}
