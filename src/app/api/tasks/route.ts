export const dynamic = "force-dynamic";

import { handle, jsonBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { parseBody, taskCreateSchema } from "@/lib/schemas";
import { createTask } from "@/server/services/tasks";

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const input = parseBody(taskCreateSchema, await jsonBody(req));
    const task = await createTask(user.id, input);
    return task;
  }, 201);
}
