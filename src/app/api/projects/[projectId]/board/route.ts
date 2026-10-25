export const dynamic = "force-dynamic";

import { handle } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { getBoard } from "@/server/services/projects";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId } = await ctx.params;
    return getBoard(user.id, projectId);
  });
}
