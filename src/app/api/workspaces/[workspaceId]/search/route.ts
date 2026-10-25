export const dynamic = "force-dynamic";

import { handle } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { searchTasks } from "@/server/services/tasks";

type Ctx = { params: Promise<{ workspaceId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { workspaceId } = await ctx.params;
    const q = new URL(req.url).searchParams.get("q") ?? "";
    return searchTasks(user.id, workspaceId, q);
  });
}
