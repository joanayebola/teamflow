import { prisma } from "@/lib/db";
import { requireMembership, requirePermission } from "@/lib/authz";

export async function listActivity(
  userId: string,
  workspaceId: string,
  page: number,
  pageSize: number,
) {
  await requirePermission(userId, workspaceId, "activity.list");
  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        actor: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.activityLog.count({ where: { workspaceId } }),
  ]);
  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function listNotifications(
  userId: string,
  page: number,
  pageSize: number,
) {
  const [items, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where: { recipientId: userId } }),
    prisma.notification.count({ where: { recipientId: userId, read: false } }),
  ]);
  return { items, total, unread, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function markNotificationRead(userId: string, notificationId: string) {
  await prisma.notification.updateMany({
    where: { id: notificationId, recipientId: userId },
    data: { read: true },
  });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { recipientId: userId, read: false },
    data: { read: true },
  });
}

export interface WorkspaceAnalytics {
  totalTasks: number;
  tasksByColumn: { columnId: string; name: string; count: number }[];
  tasksByPriority: Record<string, number>;
  openByMember: { userId: string; name: string; open: number }[];
  completedLast14Days: { date: string; count: number }[];
  overdue: number;
}

/**
 * Workspace analytics. "Completed" = tasks currently in a column named
 * "Done" (case-insensitive); completions-over-time buckets those tasks by
 * their updatedAt day. Documented approximation — see README.
 */
export async function getAnalytics(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceAnalytics> {
  await requirePermission(userId, workspaceId, "analytics.view");
  await requireMembership(userId, workspaceId);

  const projects = await prisma.project.findMany({
    where: { workspaceId },
    select: { id: true },
  });
  const projectIds = projects.map((p) => p.id);

  const columns = await prisma.boardColumn.findMany({
    where: { board: { projectId: { in: projectIds } } },
    include: { _count: { select: { tasks: true } } },
    orderBy: { position: "asc" },
  });

  const byPriority = await prisma.task.groupBy({
    by: ["priority"],
    where: { column: { board: { projectId: { in: projectIds } } } },
    _count: { _all: true },
  });

  const tasksByPriority: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
  for (const row of byPriority) tasksByPriority[row.priority] = row._count._all;

  const doneColumnIds = columns
    .filter((c) => c.name.trim().toLowerCase() === "done")
    .map((c) => c.id);

  const openTasks = await prisma.task.findMany({
    where: {
      column: { board: { projectId: { in: projectIds } } },
      NOT: { columnId: { in: doneColumnIds } },
    },
    select: { assigneeId: true, dueDate: true },
  });

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true } } },
  });
  const openByMember = members
    .map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      open: openTasks.filter((t) => t.assigneeId === m.user.id).length,
    }))
    .sort((a, b) => b.open - a.open);
  const unassigned = openTasks.filter((t) => !t.assigneeId).length;
  if (unassigned > 0) {
    openByMember.push({ userId: "", name: "Unassigned", open: unassigned });
  }

  const now = new Date();
  const overdue = openTasks.filter((t) => t.dueDate && t.dueDate < now).length;

  const doneTasks = doneColumnIds.length
    ? await prisma.task.findMany({
        where: { columnId: { in: doneColumnIds } },
        select: { updatedAt: true },
      })
    : [];
  const completedLast14Days: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = day.toISOString().slice(0, 10);
    completedLast14Days.push({
      date: key,
      count: doneTasks.filter((t) => t.updatedAt.toISOString().slice(0, 10) === key).length,
    });
  }

  return {
    totalTasks: columns.reduce((sum, c) => sum + c._count.tasks, 0),
    tasksByColumn: columns.map((c) => ({
      columnId: c.id,
      name: c.name,
      count: c._count.tasks,
    })),
    tasksByPriority,
    openByMember,
    completedLast14Days,
    overdue,
  };
}
