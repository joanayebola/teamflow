import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { registerUser } from "@/server/services/users";
import {
  acceptInvite,
  createWorkspace,
  getWorkspace,
  inviteMember,
  listMembers,
} from "@/server/services/workspaces";
import { createProject, getBoard, listProjects } from "@/server/services/projects";
import { createTask, getTask, moveTask, addComment } from "@/server/services/tasks";

/**
 * Integration tests against the teamflow_test database (service layer).
 * DATABASE_URL is pointed at teamflow_test by vitest.config.ts.
 */

async function wipe() {
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.boardColumn.deleteMany();
  await prisma.board.deleteMany();
  await prisma.project.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
}

let ownerId = "";
let memberId = "";
let outsiderId = "";
let workspaceId = "";
let projectId = "";
let todoColumnId = "";
let doneColumnId = "";

beforeAll(async () => {
  await wipe();
  const owner = await registerUser("Olivia Owner", "owner@test.dev", "password-123");
  const member = await registerUser("Manny Member", "member@test.dev", "password-123");
  const outsider = await registerUser("Oscar Outsider", "outsider@test.dev", "password-123");
  ownerId = owner.id;
  memberId = member.id;
  outsiderId = outsider.id;

  const ws = await createWorkspace(ownerId, "Integration Workspace");
  workspaceId = ws.id;

  // Member joins via the real invite flow.
  const invite = await inviteMember(ownerId, workspaceId, "member@test.dev", "MEMBER");
  await acceptInvite(memberId, "member@test.dev", invite.token);
});

beforeEach(async () => {
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.boardColumn.deleteMany();
  await prisma.board.deleteMany();
  await prisma.project.deleteMany();
  await prisma.notification.deleteMany();
  const project = await createProject(ownerId, workspaceId, {
    name: "Integration Project",
    key: "INT",
  });
  projectId = project.id;
  const { board } = await getBoard(ownerId, projectId);
  todoColumnId = board.columns[0].id;
  doneColumnId = board.columns[board.columns.length - 1].id;
});

afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

describe("workspace isolation", () => {
  it("hides workspaces from non-members (404, not data)", async () => {
    await expect(getWorkspace(outsiderId, workspaceId)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("blocks non-members from listing projects", async () => {
    await expect(listProjects(outsiderId, workspaceId)).rejects.toBeInstanceOf(AppError);
  });

  it("blocks non-members from reading a task inside the workspace", async () => {
    const task = await createTask(ownerId, {
      columnId: todoColumnId,
      title: "Secret task",
      priority: "MEDIUM",
    });
    await expect(getTask(outsiderId, task.id)).rejects.toMatchObject({ status: 404 });
  });

  it("blocks non-members from listing members", async () => {
    await expect(listMembers(outsiderId, workspaceId)).rejects.toBeInstanceOf(AppError);
  });
});

describe("RBAC enforcement at the service layer", () => {
  it("lets a MEMBER create tasks but not projects", async () => {
    const task = await createTask(memberId, {
      columnId: todoColumnId,
      title: "Member task",
      priority: "LOW",
    });
    expect(task.title).toBe("Member task");
    await expect(
      createProject(memberId, workspaceId, { name: "Nope", key: "NO" }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("lets a MEMBER comment and move tasks", async () => {
    const task = await createTask(ownerId, {
      columnId: todoColumnId,
      title: "Movable",
      priority: "MEDIUM",
    });
    const moved = await moveTask(memberId, task.id, doneColumnId, 0);
    expect(moved.columnId).toBe(doneColumnId);
    const comment = await addComment(memberId, task.id, "Looks good");
    expect(comment.body).toBe("Looks good");
  });

  it("bars a MEMBER from inviting", async () => {
    await expect(
      inviteMember(memberId, workspaceId, "new@test.dev", "MEMBER"),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("task move persistence", () => {
  it("persists column + fractional position and preserves order", async () => {
    const a = await createTask(ownerId, { columnId: todoColumnId, title: "A", priority: "MEDIUM" });
    const b = await createTask(ownerId, { columnId: todoColumnId, title: "B", priority: "MEDIUM" });
    const c = await createTask(ownerId, { columnId: todoColumnId, title: "C", priority: "MEDIUM" });

    // Move C between A and B.
    const movedC = await moveTask(ownerId, c.id, todoColumnId, 1);
    expect(movedC.position).toBeGreaterThan(a.position);
    expect(movedC.position).toBeLessThan(b.position);

    // Move A to Done, then verify by re-reading the board from the DB.
    await moveTask(ownerId, a.id, doneColumnId, 0);
    const { board } = await getBoard(ownerId, projectId);
    const todo = board.columns.find((col) => col.id === todoColumnId);
    const done = board.columns.find((col) => col.id === doneColumnId);
    expect(todo?.tasks.map((t) => t.title)).toEqual(["C", "B"]);
    expect(done?.tasks.map((t) => t.title)).toEqual(["A"]);
  });

  it("rejects moves to a column on another board", async () => {
    const other = await createProject(ownerId, workspaceId, { name: "Other", key: "OTH" });
    const { board: otherBoard } = await getBoard(ownerId, other.id);
    const task = await createTask(ownerId, {
      columnId: todoColumnId,
      title: "Stuck",
      priority: "MEDIUM",
    });
    await expect(
      moveTask(ownerId, task.id, otherBoard.columns[0].id, 0),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("notifications side effects", () => {
  it("notifies the assignee on assignment, not the actor", async () => {
    const task = await createTask(ownerId, {
      columnId: todoColumnId,
      title: "Assigned task",
      priority: "HIGH",
      assigneeId: memberId,
    });
    const forMember = await prisma.notification.findMany({
      where: { recipientId: memberId, type: "TASK_ASSIGNED" },
    });
    expect(forMember.some((n) => n.entityId === task.id)).toBe(true);
    const forOwner = await prisma.notification.findMany({
      where: { recipientId: ownerId, type: "TASK_ASSIGNED" },
    });
    expect(forOwner).toHaveLength(0);
  });

  it("notifies the assignee when someone else comments", async () => {
    const task = await createTask(ownerId, {
      columnId: todoColumnId,
      title: "Commented task",
      priority: "MEDIUM",
      assigneeId: memberId,
    });
    await addComment(ownerId, task.id, "Please review");
    const notes = await prisma.notification.findMany({
      where: { recipientId: memberId, type: "TASK_COMMENTED" },
    });
    expect(notes.some((n) => n.entityId === task.id)).toBe(true);
  });
});

describe("registration", () => {
  it("rejects duplicate emails with a 409", async () => {
    await expect(
      registerUser("Copy Cat", "owner@test.dev", "password-123"),
    ).rejects.toMatchObject({ status: 409 });
  });
});
