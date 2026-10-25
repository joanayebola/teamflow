/**
 * Teamflow demo seed.
 *
 * Creates DEMO data only — clearly labelled demo accounts with well-known
 * passwords so the app can be tried instantly. Never use these credentials
 * for anything real. Run with: npm run db:seed
 */
import { PrismaClient, TaskPriority } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const DEMO_PASSWORD = "demo-password-123";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // Clean slate for repeatable seeding (demo database only).
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

  const owner = await prisma.user.create({
    data: { name: "Demo Owner", email: "owner@teamflow.demo", passwordHash },
  });
  const ada = await prisma.user.create({
    data: { name: "Ada Member", email: "ada@teamflow.demo", passwordHash },
  });
  const ben = await prisma.user.create({
    data: { name: "Ben Member", email: "ben@teamflow.demo", passwordHash },
  });

  const workspace = await prisma.workspace.create({
    data: { name: "Demo Workspace", slug: "demo-workspace", ownerId: owner.id },
  });

  await prisma.workspaceMember.createMany({
    data: [
      { workspaceId: workspace.id, userId: owner.id, role: "OWNER" },
      { workspaceId: workspace.id, userId: ada.id, role: "ADMIN" },
      { workspaceId: workspace.id, userId: ben.id, role: "MEMBER" },
    ],
  });

  const project = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: "Website Redesign",
      key: "WEB",
      description: "Demo project: redesign and relaunch the marketing website.",
      creatorId: owner.id,
    },
  });

  const board = await prisma.board.create({ data: { projectId: project.id } });
  const columnNames = ["To do", "In progress", "In review", "Done"];
  const columns = [];
  for (let i = 0; i < columnNames.length; i++) {
    columns.push(
      await prisma.boardColumn.create({
        data: { boardId: board.id, name: columnNames[i], position: i },
      }),
    );
  }

  const taskSeeds: {
    col: number;
    title: string;
    priority: TaskPriority;
    assigneeId: string | null;
    daysFromNow: number | null;
  }[] = [
    { col: 0, title: "Audit current site analytics", priority: "MEDIUM", assigneeId: ada.id, daysFromNow: 5 },
    { col: 0, title: "Draft new homepage copy", priority: "HIGH", assigneeId: ben.id, daysFromNow: 7 },
    { col: 0, title: "Set up staging environment", priority: "LOW", assigneeId: null, daysFromNow: null },
    { col: 1, title: "Design new landing page hero", priority: "HIGH", assigneeId: ada.id, daysFromNow: 2 },
    { col: 1, title: "Implement responsive navigation", priority: "MEDIUM", assigneeId: ben.id, daysFromNow: 3 },
    { col: 2, title: "Review pricing page mockups", priority: "MEDIUM", assigneeId: owner.id, daysFromNow: 1 },
    { col: 2, title: "Accessibility pass on forms", priority: "URGENT", assigneeId: ada.id, daysFromNow: 1 },
    { col: 3, title: "Pick typography scale", priority: "LOW", assigneeId: owner.id, daysFromNow: -4 },
    { col: 3, title: "Migrate blog to new CMS", priority: "HIGH", assigneeId: ben.id, daysFromNow: -2 },
    { col: 3, title: "Set up CI pipeline", priority: "MEDIUM", assigneeId: ada.id, daysFromNow: -1 },
  ];

  const positions = new Map<string, number>();
  for (const seed of taskSeeds) {
    const column = columns[seed.col];
    const next = (positions.get(column.id) ?? 0) + 1000;
    positions.set(column.id, next);
    const dueDate =
      seed.daysFromNow === null
        ? null
        : new Date(Date.now() + seed.daysFromNow * 24 * 60 * 60 * 1000);
    await prisma.task.create({
      data: {
        columnId: column.id,
        title: seed.title,
        description: `Demo task: ${seed.title}.`,
        priority: seed.priority,
        position: next,
        assigneeId: seed.assigneeId,
        creatorId: owner.id,
        dueDate,
        ...(seed.col === 3
          ? { createdAt: new Date(Date.now() + (seed.daysFromNow ?? -1) * 24 * 60 * 60 * 1000) }
          : {}),
      },
    });
  }

  await prisma.activityLog.create({
    data: {
      workspaceId: workspace.id,
      actorId: owner.id,
      action: "project.created",
      entityType: "project",
      entityId: project.id,
      projectId: project.id,
      metadata: { name: project.name },
    },
  });

  console.log("Seed complete (DEMO data).");
  console.log("Demo accounts (password for all: %s):", DEMO_PASSWORD);
  console.log("  owner@teamflow.demo (OWNER)");
  console.log("  ada@teamflow.demo   (ADMIN)");
  console.log("  ben@teamflow.demo   (MEMBER)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
