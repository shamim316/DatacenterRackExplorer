"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Server,
  LayoutGrid,
  Users,
  Plus,
  LogOut,
  ChevronDown,
  Check,
  MailPlus,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "./ThemeToggle";
import { ROLE_LABELS, type OrgRole } from "@/lib/types";

interface ShellProps {
  user: { id: string; email: string };
  memberships: { orgId: string; role: OrgRole; name: string }[];
  activeOrgId: string | null;
  activeRole: OrgRole | null;
  pendingInvites: { id: string; orgName: string; role: OrgRole }[];
  children: React.ReactNode;
}

function setOrgCookie(orgId: string) {
  document.cookie = `rackdoc-org=${orgId}; path=/; max-age=31536000; samesite=lax`;
}

export function AppShell({
  user,
  memberships,
  activeOrgId,
  activeRole,
  pendingInvites,
  children,
}: ShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  const activeOrg = memberships.find((m) => m.orgId === activeOrgId);

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("organizations")
      .insert({ name: newOrgName.trim(), created_by: user.id })
      .select("id")
      .single();
    setBusy(false);
    if (!error && data) {
      setOrgCookie(data.id);
      setCreatingOrg(false);
      setNewOrgName("");
      setOrgMenuOpen(false);
      router.refresh();
    }
  }

  async function acceptInvite(inviteId: string) {
    setBusy(true);
    await supabase.rpc("accept_invite", { p_invite: inviteId });
    setBusy(false);
    router.refresh();
  }

  function switchOrg(orgId: string) {
    setOrgCookie(orgId);
    setOrgMenuOpen(false);
    router.push("/dashboard");
    router.refresh();
  }

  const nav = [
    { href: "/dashboard", label: "Cabinets", icon: LayoutGrid },
    { href: "/org", label: "Team", icon: Users },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-edge bg-raised flex flex-col">
        <div className="p-4 border-b border-edge">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-ink">
              <Server size={16} />
            </span>
            RackDoc
          </Link>
        </div>

        {/* Org switcher */}
        <div className="p-3 border-b border-edge relative">
          <button
            onClick={() => setOrgMenuOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 rounded-lg border border-edge bg-sunken px-3 py-2 text-sm hover:border-edge-strong"
          >
            <span className="truncate font-medium">
              {activeOrg?.name ?? "No organization"}
            </span>
            <ChevronDown size={14} className="text-ink-faint shrink-0" />
          </button>
          {activeOrg && (
            <p className="text-[11px] text-ink-faint mt-1.5 px-1">
              Your role: {ROLE_LABELS[activeOrg.role]}
            </p>
          )}

          {orgMenuOpen && (
            <div className="absolute left-3 right-3 top-full z-30 mt-1 card p-1.5">
              {memberships.map((m) => (
                <button
                  key={m.orgId}
                  onClick={() => switchOrg(m.orgId)}
                  className="w-full flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-sunken"
                >
                  <span className="truncate">{m.name}</span>
                  {m.orgId === activeOrgId && <Check size={14} className="text-accent" />}
                </button>
              ))}
              <div className="h-px bg-edge my-1.5" />
              {creatingOrg ? (
                <form onSubmit={createOrg} className="p-1.5 space-y-2">
                  <input
                    autoFocus
                    className="input !text-sm"
                    placeholder="Organization name"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button type="submit" disabled={busy} className="btn btn-primary flex-1 justify-center !py-1.5 !text-xs">
                      {busy && <Loader2 size={12} className="animate-spin" />} Create
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreatingOrg(false)}
                      className="btn btn-ghost !py-1.5 !text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setCreatingOrg(true)}
                  className="w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-ink-muted hover:bg-sunken"
                >
                  <Plus size={14} /> New organization
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <div className="p-3 border-b border-edge space-y-2">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="rounded-lg bg-accent-soft border border-accent/30 p-2.5 text-xs">
                <p className="flex items-center gap-1.5 font-medium mb-1.5">
                  <MailPlus size={13} className="text-accent" />
                  Invited to {inv.orgName}
                </p>
                <button
                  onClick={() => acceptInvite(inv.id)}
                  disabled={busy}
                  className="btn btn-primary w-full justify-center !py-1 !text-xs"
                >
                  Join as {ROLE_LABELS[inv.role]}
                </button>
              </div>
            ))}
          </div>
        )}

        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-ink-muted hover:bg-sunken hover:text-ink"
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-edge flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{user.email}</p>
            {activeRole && (
              <p className="text-[11px] text-ink-faint">{ROLE_LABELS[activeRole]}</p>
            )}
          </div>
          <div className="flex items-center">
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <button className="btn btn-ghost !p-2" title="Sign out" aria-label="Sign out">
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">{children}</main>
    </div>
  );
}
