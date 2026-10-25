import { auth } from "@/auth";
import { unauthorized } from "./errors";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

/** The signed-in user, or a 401 AppError. Use in every API route handler. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) throw unauthorized();
  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
  };
}
