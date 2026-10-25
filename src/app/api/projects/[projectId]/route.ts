export const dynamic = "force-dynamic";

import { handle, jsonBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { parseBody, projectUpdateSchema } from "@/lib/schemas";
import { deleteProject, getProject, updateProject } from "@/server/services/projects";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId } = await ctx.params;
    return getProject(user.id, projectId);
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId } = await ctx.params;
    const input = parseBody(projectUpdateSchema, await jsonBody(req));
    return updateProject(user.id, projectId, input);
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { projectId } = await ctx.params;
    await deleteProject(user.id, projectId);
    return undefined;
  });
}
