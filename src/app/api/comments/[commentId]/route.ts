export const dynamic = "force-dynamic";

import { handle } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { deleteComment } from "@/server/services/tasks";

type Ctx = { params: Promise<{ commentId: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { commentId } = await ctx.params;
    await deleteComment(user.id, commentId);
    return undefined;
  });
}
