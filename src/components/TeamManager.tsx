"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MailPlus, Trash2, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { canAdmin } from "@/lib/roles";
import { ROLE_LABELS, type OrgInvite, type OrgMember, type OrgRole } from "@/lib/types";

const ASSIGNABLE: OrgRole[] = ["admin", "editor", "viewer"];

export function TeamManager({
  orgId,
  orgName,
  currentUserId,
  currentRole,
  members,
  invites,
}: {
  orgId: string;
  orgName: string;
  currentUserId: string;
  currentRole: OrgRole | null;
  members: OrgMember[];
  invites: OrgInvite[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const admin = canAdmin(currentRole);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("editor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const email = inviteEmail.trim().toLowerCase();

    const { error } = await supabase.from("organization_invites").insert({
      org_id: orgId,
      email,
      role: inviteRole,
      invited_by: currentUserId,
    });
    setBusy(false);
    if (error) {
      setError(
        error.code === "23505"
          ? "That email already has a pending invite."
          : error.message
      );
    } else {
      setInviteEmail("");
      setNotice(
        `Invite recorded for ${email}. When they sign in to RackDoc with that email, they'll be able to join ${orgName} (existing users see the invite in their sidebar).`
      );
      router.refresh();
    }
  }

  async function changeRole(userId: string, role: OrgRole) {
    await supabase
      .from("organization_members")
      .update({ role })
      .eq("org_id", orgId)
      .eq("user_id", userId);
    router.refresh();
  }

  async function removeMember(userId: string) {
    if (!confirm("Remove this member from the organization?")) return;
    await supabase
      .from("organization_members")
      .delete()
      .eq("org_id", orgId)
      .eq("user_id", userId);
    router.refresh();
  }

  async function revokeInvite(id: string) {
    await supabase.from("organization_invites").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="flex-1 p-8 max-w-4xl w-full mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Team</h1>
      <p className="text-sm text-ink-muted mb-8">
        Members of <span className="font-medium text-ink">{orgName}</span>
      </p>

      {admin && (
        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <MailPlus size={15} className="text-accent" /> Invite a teammate
          </h2>
          <form onSubmit={sendInvite} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-56">
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
              />
            </div>
            <div>
              <label className="label">Role</label>
              <select
                className="select !w-36"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as OrgRole)}
              >
                {ASSIGNABLE.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" disabled={busy}>
              {busy && <Loader2 size={15} className="animate-spin" />}
              Invite
            </button>
          </form>
          {error && <p className="text-sm text-danger mt-3">{error}</p>}
          {notice && <p className="text-sm text-success mt-3">{notice}</p>}
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-faint border-b border-edge">
              <th className="px-5 py-3 font-semibold">Member</th>
              <th className="px-5 py-3 font-semibold">Role</th>
              {admin && <th className="px-5 py-3 w-12" />}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const isSelf = m.user_id === currentUserId;
              const isOwner = m.role === "owner";
              return (
                <tr key={m.user_id} className="border-b border-edge last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sunken text-ink-faint">
                        <UserRound size={15} />
                      </span>
                      <div>
                        <p className="font-medium">
                          {m.profiles?.full_name || m.profiles?.email || m.user_id.slice(0, 8)}
                          {isSelf && <span className="text-ink-faint font-normal"> (you)</span>}
                        </p>
                        {m.profiles?.full_name && m.profiles?.email && (
                          <p className="text-xs text-ink-faint">{m.profiles.email}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {admin && !isOwner && !isSelf ? (
                      <select
                        className="select !w-32 !py-1.5"
                        value={m.role}
                        onChange={(e) => changeRole(m.user_id, e.target.value as OrgRole)}
                      >
                        {ASSIGNABLE.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="chip">{ROLE_LABELS[m.role]}</span>
                    )}
                  </td>
                  {admin && (
                    <td className="px-5 py-3">
                      {!isOwner && !isSelf && (
                        <button
                          onClick={() => removeMember(m.user_id)}
                          className="btn btn-ghost !p-1.5 text-danger"
                          title="Remove member"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {invites.map((inv) => (
              <tr key={inv.id} className="border-b border-edge last:border-0 opacity-70">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent">
                      <MailPlus size={14} />
                    </span>
                    <div>
                      <p className="font-medium">{inv.email}</p>
                      <p className="text-xs text-ink-faint">Invite pending</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className="chip">{ROLE_LABELS[inv.role]}</span>
                </td>
                {admin && (
                  <td className="px-5 py-3">
                    <button
                      onClick={() => revokeInvite(inv.id)}
                      className="btn btn-ghost !p-1.5 text-danger"
                      title="Revoke invite"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
