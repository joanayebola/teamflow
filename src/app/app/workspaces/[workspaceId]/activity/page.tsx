import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { listActivity } from "@/server/services/insights";
import { AppError } from "@/lib/errors";
import { ActivityClient } from "@/components/activity-client";

type Ctx = { params: Promise<{ workspaceId: string }> };

export default async function ActivityPage({ params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { workspaceId } = await params;

  let initial: Awaited<ReturnType<typeof listActivity>>;
  try {
    initial = await listActivity(session.user.id, workspaceId, 1, 20);
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  }

  return (
    <ActivityClient
      workspaceId={workspaceId}
      initial={{
        items: initial.items.map((a) => ({
          id: a.id,
          action: a.action,
          entityType: a.entityType,
          createdAt: a.createdAt.toISOString(),
          actor: a.actor,
          project: a.project,
          metadata: (a.metadata as Record<string, unknown> | null) ?? null,
        })),
        total: initial.total,
        page: initial.page,
        totalPages: initial.totalPages,
      }}
    />
  );
}
