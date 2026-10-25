import type { WorkspaceRole } from "@prisma/client";

/**
 * RBAC permission matrix — the single source of truth for what each
 * workspace role may do. Every server mutation maps to one of these
 * actions and is checked via `can()` / the guards in `authz.ts`.
 *
 * - OWNER:  everything, including deleting the workspace / ownership transfer.
 * - ADMIN:  manage members & invites, manage projects, manage tasks.
 * - MEMBER: manage tasks and their own comments; read everything else.
 */
export type PermissionAction =
  | "workspace.delete"
  | "workspace.update"
  | "workspace.transferOwnership"
  | "member.list"
  | "member.invite"
  | "member.updateRole"
  | "member.remove"
  | "project.list"
  | "project.create"
  | "project.update"
  | "project.delete"
  | "task.list"
  | "task.create"
  | "task.update"
  | "task.move"
  | "task.delete"
  | "comment.create"
  | "comment.deleteOwn"
  | "activity.list"
  | "analytics.view";

const MATRIX: Record<PermissionAction, readonly WorkspaceRole[]> = {
  "workspace.delete": ["OWNER"],
  "workspace.update": ["OWNER", "ADMIN"],
  "workspace.transferOwnership": ["OWNER"],
  "member.list": ["OWNER", "ADMIN", "MEMBER"],
  "member.invite": ["OWNER", "ADMIN"],
  "member.updateRole": ["OWNER", "ADMIN"],
  "member.remove": ["OWNER", "ADMIN"],
  "project.list": ["OWNER", "ADMIN", "MEMBER"],
  "project.create": ["OWNER", "ADMIN"],
  "project.update": ["OWNER", "ADMIN"],
  "project.delete": ["OWNER", "ADMIN"],
  "task.list": ["OWNER", "ADMIN", "MEMBER"],
  "task.create": ["OWNER", "ADMIN", "MEMBER"],
  "task.update": ["OWNER", "ADMIN", "MEMBER"],
  "task.move": ["OWNER", "ADMIN", "MEMBER"],
  "task.delete": ["OWNER", "ADMIN", "MEMBER"],
  "comment.create": ["OWNER", "ADMIN", "MEMBER"],
  "comment.deleteOwn": ["OWNER", "ADMIN", "MEMBER"],
  "activity.list": ["OWNER", "ADMIN", "MEMBER"],
  "analytics.view": ["OWNER", "ADMIN", "MEMBER"],
};

export function can(role: WorkspaceRole, action: PermissionAction): boolean {
  return MATRIX[action].includes(role);
}

export const ROLE_RANK: Record<WorkspaceRole, number> = { MEMBER: 1, ADMIN: 2, OWNER: 3 };

/** True when `actor` outranks `target` (used for member management rules). */
export function outranks(actor: WorkspaceRole, target: WorkspaceRole): boolean {
  return ROLE_RANK[actor] > ROLE_RANK[target];
}
