export const dynamic = "force-dynamic";

import { handle } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { getAnalytics } from "@/server/services/insights";

type Ctx = { params: Promise<{ workspaceId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { workspaceId } = await ctx.params;
    return getAnalytics(user.id, workspaceId);
  });
}
