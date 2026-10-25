import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getWorkspace, listInvites, listMembers } from "@/server/services/workspaces";
import { can } from "@/lib/permissions";
import { AppError } from "@/lib/errors";
import { SettingsClient } from "@/components/settings-client";

type Ctx = { params: Promise<{ workspaceId: string }> };

export default async function SettingsPage({ params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const { workspaceId } = await params;

  let workspace: Awaited<ReturnType<typeof getWorkspace>>["workspace"];
  let role: Awaited<ReturnType<typeof getWorkspace>>["role"];
  let members: Awaited<ReturnType<typeof listMembers>>;
  let invites: Awaited<ReturnType<typeof listInvites>>;
  try {
    const res = await getWorkspace(userId, workspaceId);
    workspace = res.workspace;
    role = res.role;
    members = await listMembers(userId, workspaceId);
    invites = can(role, "member.invite")
      ? await listInvites(userId, workspaceId)
      : [];
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  }

  return (
    <SettingsClient
      workspaceId={workspace.id}
      workspaceName={workspace.name}
      ownerId={workspace.ownerId}
      currentUserId={userId}
      myRole={role}
      canManageMembers={can(role, "member.invite")}
      members={members.map((m) => ({
        id: m.id,
        role: m.role,
        user: m.user,
      }))}
      invites={invites.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        status: i.status,
        token: i.token,
        expiresAt: i.expiresAt.toISOString(),
      }))}
    />
  );
}
