export const dynamic = "force-dynamic";

import { handle } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { revokeInvite } from "@/server/services/workspaces";

type Ctx = { params: Promise<{ workspaceId: string; inviteId: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { workspaceId, inviteId } = await ctx.params;
    await revokeInvite(user.id, workspaceId, inviteId);
    return undefined;
  });
}
