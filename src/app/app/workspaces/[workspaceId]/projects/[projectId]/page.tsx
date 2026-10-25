import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getBoard } from "@/server/services/projects";
import { listMembers } from "@/server/services/workspaces";
import { requireMembership } from "@/lib/authz";
import { can } from "@/lib/permissions";
import { AppError } from "@/lib/errors";
import { BoardClient } from "@/components/board";
import type { BoardColumnData } from "@/components/board-types";

type Ctx = { params: Promise<{ workspaceId: string; projectId: string }> };

export default async function ProjectBoardPage({ params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const { workspaceId, projectId } = await params;

  let membership: Awaited<ReturnType<typeof requireMembership>>;
  let project: Awaited<ReturnType<typeof getBoard>>["project"];
  let board: Awaited<ReturnType<typeof getBoard>>["board"];
  let members: Awaited<ReturnType<typeof listMembers>>;
  try {
    membership = await requireMembership(userId, workspaceId);
    const data = await getBoard(userId, projectId);
    project = data.project;
    board = data.board;
    if (project.workspaceId !== workspaceId) notFound();
    members = await listMembers(userId, workspaceId);
  } catch (e) {
    if (e instanceof AppError && (e.status === 404 || e.status === 403)) notFound();
    throw e;
  }

  const initialColumns: BoardColumnData[] = board.columns.map((c) => ({
    id: c.id,
    name: c.name,
    position: c.position,
    tasks: c.tasks.map((t) => ({
      id: t.id,
      columnId: t.columnId,
      title: t.title,
      description: t.description,
      priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      position: t.position,
      assigneeId: t.assigneeId,
      assignee: t.assignee,
      commentCount: t._count.comments,
    })),
  }));

  return (
    <BoardClient
      projectId={project.id}
      projectName={project.name}
      workspaceId={workspaceId}
      initialColumns={initialColumns}
      members={members.map((m) => ({
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
      }))}
      canManageColumns={can(membership.role, "project.update")}
      currentUserId={userId}
    />
  );
}
