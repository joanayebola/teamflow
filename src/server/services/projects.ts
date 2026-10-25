import { prisma } from "@/lib/db";
import { conflict, notFound } from "@/lib/errors";
import { logActivity } from "@/lib/activity";
import { requirePermission } from "@/lib/authz";

export const DEFAULT_COLUMNS = ["To do", "In progress", "In review", "Done"];

export async function listProjects(userId: string, workspaceId: string) {
  await requirePermission(userId, workspaceId, "project.list");
  return prisma.project.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    include: {
      board: {
        include: {
          columns: { include: { _count: { select: { tasks: true } } } },
        },
      },
    },
  });
}

export async function createProject(
  userId: string,
  workspaceId: string,
  input: { name: string; description?: string | null; key: string },
) {
  await requirePermission(userId, workspaceId, "project.create");
  const clash = await prisma.project.findUnique({
    where: { workspaceId_key: { workspaceId, key: input.key } },
  });
  if (clash) throw conflict(`A project with key ${input.key} already exists.`);

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        workspaceId,
        name: input.name,
        description: input.description ?? null,
        key: input.key,
        creatorId: userId,
      },
    });
    const board = await tx.board.create({ data: { projectId: created.id } });
    await tx.boardColumn.createMany({
      data: DEFAULT_COLUMNS.map((name, i) => ({ boardId: board.id, name, position: i })),
    });
    return created;
  });

  await logActivity({
    workspaceId,
    actorId: userId,
    action: "project.created",
    entityType: "project",
    entityId: project.id,
    projectId: project.id,
    metadata: { name: project.name, key: project.key },
  });
  return project;
}

export async function getProject(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw notFound("Project not found.");
  await requirePermission(userId, project.workspaceId, "project.list");
  return project;
}

export async function updateProject(
  userId: string,
  projectId: string,
  input: { name?: string; description?: string | null; archived?: boolean },
) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw notFound("Project not found.");
  await requirePermission(userId, project.workspaceId, "project.update");
  const updated = await prisma.project.update({ where: { id: projectId }, data: input });
  await logActivity({
    workspaceId: project.workspaceId,
    actorId: userId,
    action: "project.updated",
    entityType: "project",
    entityId: projectId,
    projectId,
    metadata: { fields: Object.keys(input) },
  });
  return updated;
}

export async function deleteProject(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw notFound("Project not found.");
  await requirePermission(userId, project.workspaceId, "project.delete");
  await prisma.project.delete({ where: { id: projectId } });
  await logActivity({
    workspaceId: project.workspaceId,
    actorId: userId,
    action: "project.deleted",
    entityType: "project",
    entityId: projectId,
    metadata: { name: project.name },
  });
}

/** Full board for a project: columns ordered, tasks ordered by position. */
export async function getBoard(userId: string, projectId: string) {
  const project = await getProject(userId, projectId);
  const board = await prisma.board.findUnique({
    where: { projectId },
    include: {
      columns: {
        orderBy: { position: "asc" },
        include: {
          tasks: {
            orderBy: { position: "asc" },
            include: {
              assignee: { select: { id: true, name: true, email: true } },
              _count: { select: { comments: true } },
            },
          },
        },
      },
    },
  });
  if (!board) throw notFound("Board not found.");
  return { project, board };
}

export async function createColumn(userId: string, projectId: string, name: string) {
  const project = await getProject(userId, projectId);
  await requirePermission(userId, project.workspaceId, "project.update");
  const board = await prisma.board.findUniqueOrThrow({ where: { projectId } });
  const last = await prisma.boardColumn.findFirst({
    where: { boardId: board.id },
    orderBy: { position: "desc" },
  });
  return prisma.boardColumn.create({
    data: { boardId: board.id, name, position: (last?.position ?? -1) + 1 },
  });
}

async function loadColumn(userId: string, columnId: string) {
  const column = await prisma.boardColumn.findUnique({
    where: { id: columnId },
    include: { board: { include: { project: true } } },
  });
  if (!column) throw notFound("Column not found.");
  await requirePermission(userId, column.board.project.workspaceId, "project.update");
  return column;
}

export async function updateColumn(userId: string, columnId: string, name: string) {
  await loadColumn(userId, columnId);
  return prisma.boardColumn.update({ where: { id: columnId }, data: { name } });
}

export async function deleteColumn(userId: string, columnId: string) {
  await loadColumn(userId, columnId);
  await prisma.boardColumn.delete({ where: { id: columnId } });
}
