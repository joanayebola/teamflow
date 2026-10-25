export const dynamic = "force-dynamic";

import { handle, jsonBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { parseBody, taskUpdateSchema } from "@/lib/schemas";
import { deleteTask, getTask, updateTask } from "@/server/services/tasks";

type Ctx = { params: Promise<{ taskId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { taskId } = await ctx.params;
    return getTask(user.id, taskId);
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { taskId } = await ctx.params;
    const input = parseBody(taskUpdateSchema, await jsonBody(req));
    return updateTask(user.id, taskId, input);
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { taskId } = await ctx.params;
    await deleteTask(user.id, taskId);
    return undefined;
  });
}
