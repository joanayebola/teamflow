export const dynamic = "force-dynamic";

import { handle, jsonBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { inviteCreateSchema, parseBody } from "@/lib/schemas";
import { inviteMember, listInvites } from "@/server/services/workspaces";

type Ctx = { params: Promise<{ workspaceId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { workspaceId } = await ctx.params;
    return listInvites(user.id, workspaceId);
  });
}

export async function POST(req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { workspaceId } = await ctx.params;
    const input = parseBody(inviteCreateSchema, await jsonBody(req));
    const invite = await inviteMember(user.id, workspaceId, input.email, input.role);
    // The accept link is returned so it can be shared (no email provider in demo).
    return { ...invite, acceptPath: `/invite/${invite.token}` };
  }, 201);
}
