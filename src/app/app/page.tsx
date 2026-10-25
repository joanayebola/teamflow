import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/ui";

export default async function AppIndexPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const first = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { workspaceId: true },
  });
  if (first) redirect(`/app/workspaces/${first.workspaceId}`);
  return (
    <div className="mx-auto max-w-lg py-16">
      <EmptyState
        title="You are not in any workspace yet"
        body="Create your first workspace from the sidebar to start adding projects and tasks."
      />
    </div>
  );
}
