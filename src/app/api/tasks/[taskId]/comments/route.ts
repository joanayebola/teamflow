export const dynamic = "force-dynamic";

import { handle, jsonBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { commentCreateSchema, parseBody } from "@/lib/schemas";
import { addComment } from "@/server/services/tasks";

type Ctx = { params: Promise<{ taskId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { taskId } = await ctx.params;
    const input = parseBody(commentCreateSchema, await jsonBody(req));
    return addComment(user.id, taskId, input.body);
  }, 201);
}
