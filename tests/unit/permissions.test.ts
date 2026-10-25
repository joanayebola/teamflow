import { describe, expect, it } from "vitest";
import type { WorkspaceRole } from "@prisma/client";
import { can, outranks, type PermissionAction } from "@/lib/permissions";

const ALL_ACTIONS: PermissionAction[] = [
  "workspace.delete",
  "workspace.update",
  "workspace.transferOwnership",
  "member.list",
  "member.invite",
  "member.updateRole",
  "member.remove",
  "project.list",
  "project.create",
  "project.update",
  "project.delete",
  "task.list",
  "task.create",
  "task.update",
  "task.move",
  "task.delete",
  "comment.create",
  "comment.deleteOwn",
  "activity.list",
  "analytics.view",
];

const EXPECTED: Record<WorkspaceRole, PermissionAction[]> = {
  OWNER: ALL_ACTIONS,
  ADMIN: ALL_ACTIONS.filter(
    (a) => a !== "workspace.delete" && a !== "workspace.transferOwnership",
  ),
  MEMBER: [
    "member.list",
    "project.list",
    "task.list",
    "task.create",
    "task.update",
    "task.move",
    "task.delete",
    "comment.create",
    "comment.deleteOwn",
    "activity.list",
    "analytics.view",
  ],
};

describe("RBAC permission matrix", () => {
  for (const role of ["OWNER", "ADMIN", "MEMBER"] as WorkspaceRole[]) {
    it(`grants exactly the expected actions to ${role}`, () => {
      for (const action of ALL_ACTIONS) {
        expect(can(role, action), `${role} -> ${action}`).toBe(
          EXPECTED[role].includes(action),
        );
      }
    });
  }

  it("reserves workspace deletion and ownership transfer for OWNER", () => {
    expect(can("ADMIN", "workspace.delete")).toBe(false);
    expect(can("MEMBER", "workspace.delete")).toBe(false);
    expect(can("ADMIN", "workspace.transferOwnership")).toBe(false);
    expect(can("OWNER", "workspace.delete")).toBe(true);
    expect(can("OWNER", "workspace.transferOwnership")).toBe(true);
  });

  it("bars MEMBER from member management and project management", () => {
    for (const action of [
      "member.invite",
      "member.updateRole",
      "member.remove",
      "project.create",
      "project.update",
      "project.delete",
      "workspace.update",
    ] as PermissionAction[]) {
      expect(can("MEMBER", action)).toBe(false);
    }
  });

  it("ranks roles OWNER > ADMIN > MEMBER", () => {
    expect(outranks("OWNER", "ADMIN")).toBe(true);
    expect(outranks("OWNER", "MEMBER")).toBe(true);
    expect(outranks("ADMIN", "MEMBER")).toBe(true);
    expect(outranks("MEMBER", "ADMIN")).toBe(false);
    expect(outranks("ADMIN", "ADMIN")).toBe(false);
  });
});
