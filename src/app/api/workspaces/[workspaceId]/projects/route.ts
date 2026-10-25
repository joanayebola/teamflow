export const dynamic = "force-dynamic";

import { handle, jsonBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { parseBody, projectCreateSchema } from "@/lib/schemas";
import { createProject, listProjects } from "@/server/services/projects";

type Ctx = { params: Promise<{ workspaceId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { workspaceId } = await ctx.params;
    return listProjects(user.id, workspaceId);
  });
}

export async function POST(req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { workspaceId } = await ctx.params;
    const input = parseBody(projectCreateSchema, await jsonBody(req));
    return createProject(user.id, workspaceId, input);
  }, 201);
}
