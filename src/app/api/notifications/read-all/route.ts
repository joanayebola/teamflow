export const dynamic = "force-dynamic";

import { handle } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { markAllNotificationsRead } from "@/server/services/insights";

export async function POST() {
  return handle(async () => {
    const user = await requireUser();
    await markAllNotificationsRead(user.id);
    return { ok: true };
  });
}
