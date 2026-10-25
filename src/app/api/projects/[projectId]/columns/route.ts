export const dynamic = "force-dynamic";

import { handle, jsonBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { columnCreateSchema, parseBody } from "@/lib/schemas";
import { createColumn } from "@/server/services/projects";

type Ctx = { params: Promise<{ projectId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId } = await ctx.params;
    const input = parseBody(columnCreateSchema, await jsonBody(req));
    return createColumn(user.id, projectId, input.name);
  }, 201);
}
