import type { WorkspaceMember } from "@prisma/client";
import { prisma } from "./db";
import { forbidden, notFound } from "./errors";
import { can, type PermissionAction } from "./permissions";

/**
 * Server-side authorization helpers used by the service layer.
 * Deliberately decoupled from the session/Auth.js layer: services receive a
 * userId and enforce membership + RBAC against the database, so they can be
 * integration-tested directly.
 */

/**
 * The user's membership in a workspace.
 * Throws 404 (not 403) for non-members so workspace existence is not leaked.
 */
export async function requireMembership(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceMember> {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!membership) throw notFound("Workspace not found.");
  return membership;
}

/** Membership + a specific RBAC permission; 403 when the role lacks it. */
export async function requirePermission(
  userId: string,
  workspaceId: string,
  action: PermissionAction,
): Promise<WorkspaceMember> {
  const membership = await requireMembership(userId, workspaceId);
  if (!can(membership.role, action)) throw forbidden();
  return membership;
}
