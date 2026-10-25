import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { listProjects } from "@/server/services/projects";
import { requireMembership } from "@/lib/authz";
import { can } from "@/lib/permissions";
import { AppError } from "@/lib/errors";
import { ProjectsClient } from "@/components/projects-client";

type Ctx = { params: Promise<{ workspaceId: string }> };

export default async function ProjectsPage({ params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const { workspaceId } = await params;

  let membership: Awaited<ReturnType<typeof requireMembership>>;
  let projects: Awaited<ReturnType<typeof listProjects>>;
  try {
    membership = await requireMembership(userId, workspaceId);
    projects = await listProjects(userId, workspaceId);
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  }

  return (
    <ProjectsClient
      workspaceId={workspaceId}
      canCreate={can(membership.role, "project.create")}
      initialProjects={projects.map((p) => ({
        id: p.id,
        name: p.name,
        key: p.key,
        description: p.description,
        archived: p.archived,
        taskCount: p.board?.columns.reduce((sum, c) => sum + c._count.tasks, 0) ?? 0,
      }))}
    />
  );
}
