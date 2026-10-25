import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { conflict } from "@/lib/errors";

export async function registerUser(name: string, email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw conflict("An account with that email already exists.");
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({ data: { name, email, passwordHash } });
  return { id: user.id, name: user.name, email: user.email };
}
