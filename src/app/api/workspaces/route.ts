export const dynamic = "force-dynamic";

import { handle, jsonBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { parseBody, workspaceCreateSchema } from "@/lib/schemas";
import { createWorkspace, listWorkspaces } from "@/server/services/workspaces";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    return listWorkspaces(user.id);
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const input = parseBody(workspaceCreateSchema, await jsonBody(req));
    return createWorkspace(user.id, input.name);
  }, 201);
}
