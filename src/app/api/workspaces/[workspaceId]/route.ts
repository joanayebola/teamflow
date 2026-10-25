export const dynamic = "force-dynamic";

import { handle, jsonBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { parseBody, workspaceUpdateSchema } from "@/lib/schemas";
import {
  deleteWorkspace,
  getWorkspace,
  updateWorkspace,
} from "@/server/services/workspaces";

type Ctx = { params: Promise<{ workspaceId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { workspaceId } = await ctx.params;
    const { workspace, role } = await getWorkspace(user.id, workspaceId);
    return { ...workspace, role };
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { workspaceId } = await ctx.params;
    const input = parseBody(workspaceUpdateSchema, await jsonBody(req));
    return updateWorkspace(user.id, workspaceId, input.name);
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { workspaceId } = await ctx.params;
    await deleteWorkspace(user.id, workspaceId);
    return undefined;
  });
}
