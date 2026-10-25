export const dynamic = "force-dynamic";

import { handle } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { paginationSchema, parseBody } from "@/lib/schemas";
import { listActivity } from "@/server/services/insights";

type Ctx = { params: Promise<{ workspaceId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { workspaceId } = await ctx.params;
    const url = new URL(req.url);
    const { page, pageSize } = parseBody(paginationSchema, {
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });
    return listActivity(user.id, workspaceId, page, pageSize);
  });
}
