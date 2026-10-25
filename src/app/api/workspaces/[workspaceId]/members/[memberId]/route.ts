export const dynamic = "force-dynamic";

import { handle, jsonBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { memberRoleUpdateSchema, parseBody } from "@/lib/schemas";
import { removeMember, updateMemberRole } from "@/server/services/workspaces";

type Ctx = { params: Promise<{ workspaceId: string; memberId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { workspaceId, memberId } = await ctx.params;
    const input = parseBody(memberRoleUpdateSchema, await jsonBody(req));
    return updateMemberRole(user.id, workspaceId, memberId, input.role);
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { workspaceId, memberId } = await ctx.params;
    await removeMember(user.id, workspaceId, memberId);
    return undefined;
  });
}
