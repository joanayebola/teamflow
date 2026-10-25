export const dynamic = "force-dynamic";

import { handle } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { paginationSchema, parseBody } from "@/lib/schemas";
import { listNotifications } from "@/server/services/insights";

export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const url = new URL(req.url);
    const { page, pageSize } = parseBody(paginationSchema, {
      page: url.searchParams.get("page") ?? undefined,
      pageSize: url.searchParams.get("pageSize") ?? undefined,
    });
    return listNotifications(user.id, page, pageSize);
  });
}
