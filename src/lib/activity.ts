import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "./db";

export interface ActivityInput {
  workspaceId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  projectId?: string | null;
  taskId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

/** Append an entry to the workspace activity log. */
export async function logActivity(input: ActivityInput) {
  return prisma.activityLog.create({
    data: {
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      metadata: input.metadata,
    },
  });
}

export interface NotificationInput {
  workspaceId: string;
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}

/** Create an in-app notification (no-op when recipient == actor). */
export async function notify(input: NotificationInput) {
  if (input.actorId && input.actorId === input.recipientId) return null;
  return prisma.notification.create({
    data: {
      workspaceId: input.workspaceId,
      recipientId: input.recipientId,
      actorId: input.actorId ?? null,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    },
  });
}
