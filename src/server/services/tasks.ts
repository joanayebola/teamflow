import type { Task, TaskPriority } from "@prisma/client";
import { prisma } from "@/lib/db";
import { badRequest, forbidden, notFound } from "@/lib/errors";
import { logActivity, notify } from "@/lib/activity";
import { requireMembership, requirePermission } from "@/lib/authz";
import { insertionPosition, positionAtEnd, rebalancedPositions } from "@/lib/positions";

interface ColumnContext {
  workspaceId: string;
  projectId: string;
  boardId: string;
}

/** Resolve a column to its workspace/project, enforcing membership. */
async function columnContext(userId: string, columnId: string): Promise<ColumnContext> {
  const column = await prisma.boardColumn.findUnique({
    where: { id: columnId },
    include: { board: { include: { project: { select: { id: true, workspaceId: true } } } } },
  });
  if (!column) throw notFound("Column not found.");
  const ctx = {
    workspaceId: column.board.project.workspaceId,
    projectId: column.board.project.id,
    boardId: column.boardId,
  };
  await requireMembership(userId, ctx.workspaceId);
  return ctx;
}

async function taskContext(userId: string, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      column: {
        include: {
          board: { include: { project: { select: { id: true, workspaceId: true, name: true } } } },
        },
      },
    },
  });
  if (!task) throw notFound("Task not found.");
  const ctx = {
    workspaceId: task.column.board.project.workspaceId,
    projectId: task.column.board.project.id,
    projectName: task.column.board.project.name,
    boardId: task.column.boardId,
  };
  await requireMembership(userId, ctx.workspaceId);
  return { task, ...ctx };
}

/** Assignees must be members of the workspace. */
async function assertAssigneeValid(workspaceId: string, assigneeId: string | null | undefined) {
  if (!assigneeId) return;
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: assigneeId } },
  });
  if (!member) throw badRequest("Assignee is not a member of this workspace.");
}

export async function createTask(
  userId: string,
  input: {
    columnId: string;
    title: string;
    description?: string | null;
    priority: TaskPriority;
    assigneeId?: string | null;
    dueDate?: Date | null;
  },
) {
  const ctx = await columnContext(userId, input.columnId);
  await requirePermission(userId, ctx.workspaceId, "task.create");
  await assertAssigneeValid(ctx.workspaceId, input.assigneeId);

  const last = await prisma.task.findFirst({
    where: { columnId: input.columnId },
    orderBy: { position: "desc" },
  });
  const task = await prisma.task.create({
    data: {
      columnId: input.columnId,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority,
      assigneeId: input.assigneeId ?? null,
      dueDate: input.dueDate ?? null,
      position: positionAtEnd(last?.position),
      creatorId: userId,
    },
    include: { assignee: { select: { id: true, name: true, email: true } } },
  });

  await logActivity({
    workspaceId: ctx.workspaceId,
    actorId: userId,
    action: "task.created",
    entityType: "task",
    entityId: task.id,
    projectId: ctx.projectId,
    taskId: task.id,
    metadata: { title: task.title },
  });
  if (task.assigneeId) {
    await notify({
      workspaceId: ctx.workspaceId,
      recipientId: task.assigneeId,
      actorId: userId,
      type: "TASK_ASSIGNED",
      title: `You were assigned: ${task.title}`,
      entityType: "task",
      entityId: task.id,
    });
  }
  return task;
}

export async function getTask(userId: string, taskId: string) {
  await taskContext(userId, taskId); // membership check + 404
  const full = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      creator: { select: { id: true, name: true, email: true } },
      column: { select: { id: true, name: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  return full;
}

export async function updateTask(
  userId: string,
  taskId: string,
  input: {
    title?: string;
    description?: string | null;
    priority?: TaskPriority;
    assigneeId?: string | null;
    dueDate?: Date | null;
  },
) {
  const { task, workspaceId, projectId } = await taskContext(userId, taskId);
  await requirePermission(userId, workspaceId, "task.update");
  if (input.assigneeId !== undefined) {
    await assertAssigneeValid(workspaceId, input.assigneeId);
  }
  const updated = await prisma.task.update({
    where: { id: taskId },
    data: input,
    include: { assignee: { select: { id: true, name: true, email: true } } },
  });

  const assigneeChanged =
    input.assigneeId !== undefined && input.assigneeId !== task.assigneeId;
  await logActivity({
    workspaceId,
    actorId: userId,
    action: assigneeChanged ? "task.assigned" : "task.updated",
    entityType: "task",
    entityId: taskId,
    projectId,
    taskId,
    metadata: { title: updated.title, ...(assigneeChanged ? { assigneeId: input.assigneeId } : {}) },
  });
  if (assigneeChanged && updated.assigneeId) {
    await notify({
      workspaceId,
      recipientId: updated.assigneeId,
      actorId: userId,
      type: "TASK_ASSIGNED",
      title: `You were assigned: ${updated.title}`,
      entityType: "task",
      entityId: taskId,
    });
  }
  return updated;
}

export async function deleteTask(userId: string, taskId: string) {
  const { workspaceId, projectId } = await taskContext(userId, taskId);
  await requirePermission(userId, workspaceId, "task.delete");
  await prisma.task.delete({ where: { id: taskId } });
  await logActivity({
    workspaceId,
    actorId: userId,
    action: "task.deleted",
    entityType: "task",
    entityId: taskId,
    projectId,
  });
}

/**
 * Move a task to `targetIndex` within `targetColumnId` (same board only).
 * Uses fractional positions; rebalances the target column when the gap
 * between neighbours has been exhausted.
 */
export async function moveTask(
  userId: string,
  taskId: string,
  targetColumnId: string,
  targetIndex: number,
): Promise<Task> {
  const { task, workspaceId, projectId, boardId } = await taskContext(userId, taskId);
  await requirePermission(userId, workspaceId, "task.move");

  const targetColumn = await prisma.boardColumn.findUnique({
    where: { id: targetColumnId },
  });
  if (!targetColumn || targetColumn.boardId !== boardId) {
    throw badRequest("Target column is not on the same board.");
  }

  const siblings = await prisma.task.findMany({
    where: { columnId: targetColumnId, NOT: { id: taskId } },
    orderBy: { position: "asc" },
    select: { id: true, position: true },
  });
  const index = Math.max(0, Math.min(targetIndex, siblings.length));
  let position = insertionPosition(
    siblings.map((s) => s.position),
    index,
  );

  const moved = await prisma.$transaction(async (tx) => {
    if (position === null) {
      // Rebalance: rewrite sibling positions evenly, then insert by index.
      const all = [...siblings];
      const rebalanced = rebalancedPositions(all.length + 1);
      for (let i = 0; i < all.length; i++) {
        const newPos = rebalanced[i < index ? i : i + 1];
        if (newPos !== all[i].position) {
          await tx.task.update({ where: { id: all[i].id }, data: { position: newPos } });
        }
      }
      position = rebalanced[index];
    }
    return tx.task.update({
      where: { id: taskId },
      data: { columnId: targetColumnId, position },
    });
  });

  if (task.columnId !== targetColumnId) {
    await logActivity({
      workspaceId,
      actorId: userId,
      action: "task.moved",
      entityType: "task",
      entityId: taskId,
      projectId,
      taskId,
      metadata: { title: task.title, fromColumnId: task.columnId, toColumnId: targetColumnId },
    });
  }
  return moved;
}

export async function addComment(userId: string, taskId: string, body: string) {
  const { task, workspaceId, projectId } = await taskContext(userId, taskId);
  await requirePermission(userId, workspaceId, "comment.create");
  const comment = await prisma.comment.create({
    data: { taskId, authorId: userId, body },
    include: { author: { select: { id: true, name: true, email: true } } },
  });
  await logActivity({
    workspaceId,
    actorId: userId,
    action: "task.commented",
    entityType: "task",
    entityId: taskId,
    projectId,
    taskId,
    metadata: { title: task.title },
  });
  // Notify the task's assignee (notify() skips self-notifications).
  if (task.assigneeId) {
    await notify({
      workspaceId,
      recipientId: task.assigneeId,
      actorId: userId,
      type: "TASK_COMMENTED",
      title: `New comment on: ${task.title}`,
      body: body.slice(0, 140),
      entityType: "task",
      entityId: taskId,
    });
  }
  return comment;
}

export async function deleteComment(userId: string, commentId: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      task: {
        include: {
          column: {
            include: { board: { include: { project: { select: { workspaceId: true } } } } },
          },
        },
      },
    },
  });
  if (!comment) throw notFound("Comment not found.");
  const workspaceId = comment.task.column.board.project.workspaceId;
  const membership = await requireMembership(userId, workspaceId);
  const isAuthor = comment.authorId === userId;
  const isPrivileged = membership.role === "OWNER" || membership.role === "ADMIN";
  if (!isAuthor && !isPrivileged) {
    throw forbidden("You can only delete your own comments.");
  }
  await prisma.comment.delete({ where: { id: commentId } });
}

/** Global task search across a workspace (title match, newest first). */
export async function searchTasks(userId: string, workspaceId: string, query: string) {
  await requireMembership(userId, workspaceId);
  if (!query.trim()) return [];
  return prisma.task.findMany({
    where: {
      title: { contains: query.trim(), mode: "insensitive" },
      column: { board: { project: { workspaceId } } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      assignee: { select: { id: true, name: true } },
      column: {
        select: {
          id: true,
          name: true,
          board: { select: { project: { select: { id: true, name: true, key: true } } } },
        },
      },
    },
  });
}
