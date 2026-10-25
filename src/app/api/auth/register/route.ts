export const dynamic = "force-dynamic";

import { handle, jsonBody } from "@/lib/api";
import { parseBody, registerSchema } from "@/lib/schemas";
import { registerUser } from "@/server/services/users";

export async function POST(req: Request) {
  return handle(async () => {
    const input = parseBody(registerSchema, await jsonBody(req));
    return registerUser(input.name, input.email, input.password);
  }, 201);
}
