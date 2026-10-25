import { z } from "zod";

const email = z.string().trim().toLowerCase().email("Enter a valid email address.");
const name = z.string().trim().min(2, "Must be at least 2 characters.").max(80);
const shortText = z.string().trim().min(1, "Required.").max(200);
const longText = z.string().trim().max(10_000).optional().nullable();

export const registerSchema = z.object({
  name,
  email,
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required.").max(128),
});

export const workspaceCreateSchema = z.object({ name });
export const workspaceUpdateSchema = z.object({ name });

export const workspaceRoleSchema = z.enum(["ADMIN", "MEMBER"]);

export const inviteCreateSchema = z.object({
  email,
  role: workspaceRoleSchema.default("MEMBER"),
});

export const memberRoleUpdateSchema = z.object({ role: workspaceRoleSchema });

export const projectCreateSchema = z.object({
  name: shortText,
  description: longText,
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9]{1,9}$/, "Key must be 2–10 letters/digits, starting with a letter."),
});

export const projectUpdateSchema = z.object({
  name: shortText.optional(),
  description: longText,
  archived: z.boolean().optional(),
});

export const columnCreateSchema = z.object({ name: shortText });
export const columnUpdateSchema = z.object({ name: shortText });

export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const taskCreateSchema = z.object({
  columnId: z.string().min(1),
  title: shortText,
  description: longText,
  priority: taskPrioritySchema.default("MEDIUM"),
  assigneeId: z.string().min(1).optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
});

export const taskUpdateSchema = z.object({
  title: shortText.optional(),
  description: longText,
  priority: taskPrioritySchema.optional(),
  assigneeId: z.string().min(1).optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
});

/** Body for PATCH /api/tasks/[id]/move */
export const taskMoveSchema = z.object({
  targetColumnId: z.string().min(1),
  /** Index the task should occupy in the target column after the move. */
  targetIndex: z.number().int().min(0),
});

export const commentCreateSchema = z.object({
  body: z.string().trim().min(1, "Comment cannot be empty.").max(5_000),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/** Parse + validate; throws ZodError which callers convert to a 400. */
export function parseBody<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

/** Flatten a ZodError into a field -> messages map for API responses. */
export function zodFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
