"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiClientError } from "@/lib/api-client";
import {
  Avatar,
  Button,
  Card,
  ErrorNote,
  Input,
  Label,
  RoleBadge,
  Select,
} from "@/components/ui";

export interface MemberRow {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
}

export interface InviteRow {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  expiresAt: string;
}

export function SettingsClient({
  workspaceId,
  workspaceName,
  ownerId,
  currentUserId,
  myRole,
  members,
  invites,
  canManageMembers,
}: {
  workspaceId: string;
  workspaceName: string;
  ownerId: string;
  currentUserId: string;
  myRole: string;
  members: MemberRow[];
  invites: InviteRow[];
  canManageMembers: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(workspaceName);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [newOwnerId, setNewOwnerId] = useState("");

  const isOwner = myRole === "OWNER";
  const canEdit = myRole === "OWNER" || myRole === "ADMIN";

  async function run(fn: () => Promise<void>, okMsg?: string) {
    setError(null);
    setNotice(null);
    try {
      await fn();
      if (okMsg) setNotice(okMsg);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings & members</h1>
        <p className="text-sm text-ink-400">
          Your role in this workspace: <span className="text-ink-200">{myRole}</span>
        </p>
      </div>

      <ErrorNote message={error} />
      {notice && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {notice}
        </p>
      )}

      <Card className="p-5">
        <h2 className="text-sm font-semibold">Workspace</h2>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(
              () => api(`/api/workspaces/${workspaceId}`, { method: "PATCH", json: { name } }),
              "Workspace renamed.",
            );
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
          <Button type="submit" disabled={!canEdit}>
            Save
          </Button>
        </form>
        {!canEdit && (
          <p className="mt-2 text-xs text-ink-400">Only owners and admins can rename the workspace.</p>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold">Members</h2>
        <ul className="mt-3 divide-y divide-ink-800">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
              <Avatar name={m.user.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {m.user.name}
                  {m.user.id === currentUserId && <span className="text-ink-400"> (you)</span>}
                </p>
                <p className="truncate text-xs text-ink-400">{m.user.email}</p>
              </div>
              <RoleBadge role={m.role} />
              {canManageMembers && m.role !== "OWNER" && m.user.id !== currentUserId && (
                <>
                  <Select
                    value={m.role}
                    aria-label={`Role for ${m.user.name}`}
                    onChange={(e) =>
                      void run(() =>
                        api(`/api/workspaces/${workspaceId}/members/${m.id}`, {
                          method: "PATCH",
                          json: { role: e.target.value },
                        }),
                      )
                    }
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="MEMBER">Member</option>
                  </Select>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      void run(
                        () =>
                          api(`/api/workspaces/${workspaceId}/members/${m.id}`, {
                            method: "DELETE",
                          }),
                        "Member removed.",
                      )
                    }
                  >
                    Remove
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {canManageMembers && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold">Invite by email</h2>
          <p className="mt-1 text-xs text-ink-400">
            This demo has no email provider: the invite creates a shareable accept link.
            The invited person must register (or sign in) with the same email, then open the link.
          </p>
          <form
            className="mt-3 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const res = await api<{ acceptPath: string }>(
                  `/api/workspaces/${workspaceId}/invites`,
                  { method: "POST", json: { email: inviteEmail, role: inviteRole } },
                );
                setLastInviteLink(`${window.location.origin}${res.acceptPath}`);
                setInviteEmail("");
              }, "Invite created.");
            }}
          >
            <div className="min-w-56 flex-1">
              <Input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teammate@company.com"
              />
            </div>
            <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </Select>
            <Button type="submit">Send invite</Button>
          </form>
          {lastInviteLink && (
            <p className="mt-3 break-all rounded-lg bg-ink-850 px-3 py-2 text-xs text-ink-300">
              Share this link: <span className="text-indigo-300">{lastInviteLink}</span>
            </p>
          )}
          {invites.length > 0 && (
            <ul className="mt-4 divide-y divide-ink-800">
              {invites.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <span className="flex-1">{inv.email}</span>
                  <RoleBadge role={inv.role} />
                  <span className="text-xs text-ink-400">{inv.status}</span>
                  {inv.status === "PENDING" && (
                    <Button
                      variant="ghost"
                      onClick={() =>
                        void run(
                          () =>
                            api(`/api/workspaces/${workspaceId}/invites/${inv.id}`, {
                              method: "DELETE",
                            }),
                          "Invite revoked.",
                        )
                      }
                    >
                      Revoke
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {isOwner && (
        <Card className="border-red-500/20 p-5">
          <h2 className="text-sm font-semibold text-red-300">Danger zone</h2>
          <div className="mt-3">
            <Label>Transfer ownership</Label>
            <div className="flex gap-2">
              <Select value={newOwnerId} onChange={(e) => setNewOwnerId(e.target.value)}>
                <option value="">Select a member…</option>
                {members
                  .filter((m) => m.user.id !== currentUserId && m.user.id !== ownerId)
                  .map((m) => (
                    <option key={m.id} value={m.user.id}>
                      {m.user.name} ({m.user.email})
                    </option>
                  ))}
              </Select>
              <Button
                variant="secondary"
                disabled={!newOwnerId}
                onClick={() =>
                  void run(async () => {
                    await api(`/api/workspaces/${workspaceId}/transfer`, {
                      method: "POST",
                      json: { newOwnerId },
                    });
                  }, "Ownership transferred. You are now an admin.")
                }
              >
                Transfer
              </Button>
            </div>
          </div>
          <div className="mt-5 border-t border-ink-800 pt-4">
            <Button
              variant="danger"
              onClick={() => {
                if (!window.confirm("Delete this workspace and ALL its projects, tasks and comments? This cannot be undone.")) return;
                void run(async () => {
                  await api(`/api/workspaces/${workspaceId}`, { method: "DELETE" });
                  router.push("/app");
                });
              }}
            >
              Delete workspace
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
