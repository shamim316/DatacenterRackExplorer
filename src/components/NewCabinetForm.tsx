"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  PRESET_HEIGHTS,
  type CabinetPostType,
  type DoorType,
  type PduMount,
  type CableEntry,
} from "@/lib/types";

function Seg<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          data-active={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function NewCabinetForm({ orgId }: { orgId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [postType, setPostType] = useState<CabinetPostType>("four_post");
  const [heightU, setHeightU] = useState(42);
  const [customHeight, setCustomHeight] = useState(false);
  const [door, setDoor] = useState<DoorType>("front");
  const [pduMount, setPduMount] = useState<PduMount>("rear");
  const [pduBothSides, setPduBothSides] = useState(true);
  const [powerFromFloor, setPowerFromFloor] = useState(true);
  const [cableEntry, setCableEntry] = useState<CableEntry>("bottom");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error } = await supabase
      .from("cabinets")
      .insert({
        org_id: orgId,
        name: name.trim(),
        location: location.trim() || null,
        post_type: postType,
        height_u: heightU,
        door: postType === "two_post" ? "none" : door,
        pdu_mount: pduMount,
        pdu_both_sides: pduBothSides,
        power_from_floor: powerFromFloor,
        cable_entry: cableEntry,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) setError(error.message);
    else router.push(`/cabinets/${data.id}`);
  }

  return (
    <div className="flex-1 p-8 max-w-2xl w-full mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink mb-6"
      >
        <ArrowLeft size={15} /> Back to cabinets
      </Link>
      <h1 className="text-2xl font-semibold mb-1">New cabinet</h1>
      <p className="text-sm text-ink-muted mb-8">
        Every option here is rendered in the 3D view and can be changed later.
      </p>

      <form onSubmit={submit} className="space-y-6">
        <div className="card p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Cabinet name *</label>
              <input
                className="input"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rack A1"
              />
            </div>
            <div>
              <label className="label">Location</label>
              <input
                className="input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Row A, DC-East"
              />
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-sm">Frame</h2>
          <div>
            <label className="label">Post type</label>
            <Seg
              value={postType}
              onChange={setPostType}
              options={[
                { value: "four_post", label: "4-post cabinet" },
                { value: "two_post", label: "2-post rack" },
              ]}
            />
          </div>
          <div>
            <label className="label">Height</label>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_HEIGHTS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    setHeightU(h);
                    setCustomHeight(false);
                  }}
                  className={`btn ${!customHeight && heightU === h ? "btn-primary" : "btn-secondary"} !px-3.5`}
                >
                  {h}U
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustomHeight(true)}
                className={`btn ${customHeight ? "btn-primary" : "btn-secondary"} !px-3.5`}
              >
                Custom
              </button>
              {customHeight && (
                <input
                  type="number"
                  min={4}
                  max={60}
                  value={heightU}
                  onChange={(e) => setHeightU(Number(e.target.value))}
                  className="input !w-24"
                />
              )}
            </div>
          </div>
          {postType === "four_post" && (
            <div>
              <label className="label">Door</label>
              <Seg
                value={door}
                onChange={setDoor}
                options={[
                  { value: "none", label: "Open (no door)" },
                  { value: "front", label: "Front" },
                  { value: "rear", label: "Rear" },
                  { value: "front_rear", label: "Front + rear" },
                ]}
              />
            </div>
          )}
        </div>

        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-sm">Power</h2>
          <div>
            <label className="label">Vertical PDU mounting</label>
            <Seg
              value={pduMount}
              onChange={setPduMount}
              options={[
                { value: "none", label: "None" },
                { value: "front", label: "Front" },
                { value: "rear", label: "Rear" },
                { value: "front_rear", label: "Front + rear" },
              ]}
            />
          </div>
          {pduMount !== "none" && (
            <div>
              <label className="label">PDU sides</label>
              <Seg
                value={pduBothSides ? "both" : "one"}
                onChange={(v) => setPduBothSides(v === "both")}
                options={[
                  { value: "both", label: "Both sides" },
                  { value: "one", label: "One side" },
                ]}
              />
            </div>
          )}
          <div>
            <label className="label">Power feed</label>
            <Seg
              value={powerFromFloor ? "floor" : "overhead"}
              onChange={(v) => setPowerFromFloor(v === "floor")}
              options={[
                { value: "floor", label: "From under raised floor" },
                { value: "overhead", label: "Overhead" },
              ]}
            />
          </div>
        </div>

        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-sm">Cabling</h2>
          <div>
            <label className="label">Cable entry</label>
            <Seg
              value={cableEntry}
              onChange={setCableEntry}
              options={[
                { value: "bottom", label: "Bottom" },
                { value: "top", label: "Top" },
                { value: "both", label: "Top + bottom" },
              ]}
            />
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-3">
          <Link href="/dashboard" className="btn btn-ghost">
            Cancel
          </Link>
          <button type="submit" disabled={busy || !name.trim()} className="btn btn-primary">
            {busy && <Loader2 size={16} className="animate-spin" />}
            Create cabinet
          </button>
        </div>
      </form>
    </div>
  );
}
