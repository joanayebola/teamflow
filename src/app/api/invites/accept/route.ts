export const dynamic = "force-dynamic";

import { z } from "zod";
import { handle, jsonBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { parseBody } from "@/lib/schemas";
import { acceptInvite } from "@/server/services/workspaces";

const schema = z.object({ token: z.string().min(1) });

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const input = parseBody(schema, await jsonBody(req));
    const member = await acceptInvite(user.id, user.email, input.token);
    return { workspaceId: member.workspaceId };
  });
}
