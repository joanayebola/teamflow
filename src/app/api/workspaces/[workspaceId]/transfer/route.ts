export const dynamic = "force-dynamic";

import { z } from "zod";
import { handle, jsonBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { parseBody } from "@/lib/schemas";
import { transferOwnership } from "@/server/services/workspaces";

type Ctx = { params: Promise<{ workspaceId: string }> };
const schema = z.object({ newOwnerId: z.string().min(1) });

export async function POST(req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { workspaceId } = await ctx.params;
    const input = parseBody(schema, await jsonBody(req));
    await transferOwnership(user.id, workspaceId, input.newOwnerId);
    return { ok: true };
  });
}
