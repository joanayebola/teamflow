export const dynamic = "force-dynamic";

import { handle } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { markNotificationRead } from "@/server/services/insights";

type Ctx = { params: Promise<{ notificationId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  return handle(async () => {
    const user = await requireUser();
    const { notificationId } = await ctx.params;
    await markNotificationRead(user.id, notificationId);
    return { ok: true };
  });
}
