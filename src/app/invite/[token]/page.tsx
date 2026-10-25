"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiClientError } from "@/lib/api-client";
import { Button, ErrorNote } from "@/components/ui";
import { AuthShell } from "@/components/auth-forms";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ workspaceId: string }>("/api/invites/accept", {
        method: "POST",
        json: { token: params.token },
      });
      setDone(true);
      router.push(`/app/workspaces/${res.workspaceId}`);
      router.refresh();
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiClientError && err.status === 401) {
        router.push(`/login?callbackUrl=/invite/${params.token}`);
        return;
      }
      setError(err instanceof Error ? err.message : "Could not accept this invite.");
    }
  }

  return (
    <AuthShell
      title="You've been invited"
      subtitle="Accept this invitation to join the workspace on Teamflow."
    >
      <div className="space-y-4">
        <ErrorNote message={error} />
        {done ? (
          <p className="text-sm text-emerald-300">Invite accepted — taking you to the workspace…</p>
        ) : (
          <Button className="w-full" onClick={accept} disabled={busy}>
            {busy ? "Accepting…" : "Accept invitation"}
          </Button>
        )}
        <p className="text-center text-xs text-ink-400">
          You must be signed in with the email address the invite was sent to.
          New here?{" "}
          <a href="/register" className="text-indigo-300 hover:text-indigo-200">
            Create an account
          </a>{" "}
          with that email first.
        </p>
      </div>
    </AuthShell>
  );
}
