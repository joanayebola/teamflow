export const dynamic = "force-dynamic";

import { handle, jsonBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { columnUpdateSchema, parseBody } from "@/lib/schemas";
import { deleteColumn, updateColumn } from "@/server/services/projects";

type Ctx = { params: Promise<{ columnId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { columnId } = await ctx.params;
    const input = parseBody(columnUpdateSchema, await jsonBody(req));
    return updateColumn(user.id, columnId, input.name);
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { columnId } = await ctx.params;
    await deleteColumn(user.id, columnId);
    return undefined;
  });
}
