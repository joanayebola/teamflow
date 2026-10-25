import { describe, expect, it } from "vitest";
import {
  projectCreateSchema,
  registerSchema,
  taskCreateSchema,
  taskMoveSchema,
  workspaceCreateSchema,
} from "@/lib/schemas";
import { slugify } from "@/lib/slug";

describe("Zod schemas", () => {
  it("accepts a valid registration and normalizes the email", () => {
    const parsed = registerSchema.parse({
      name: "Ada Lovelace",
      email: "  ADA@Example.COM ",
      password: "supersecret",
    });
    expect(parsed.email).toBe("ada@example.com");
  });

  it("rejects short passwords and bad emails at registration", () => {
    expect(() =>
      registerSchema.parse({ name: "Ada", email: "ada@example.com", password: "short" }),
    ).toThrow();
    expect(() =>
      registerSchema.parse({ name: "Ada", email: "not-an-email", password: "supersecret" }),
    ).toThrow();
  });

  it("requires a workspace name of at least 2 characters", () => {
    expect(workspaceCreateSchema.parse({ name: "Core Team" }).name).toBe("Core Team");
    expect(() => workspaceCreateSchema.parse({ name: "x" })).toThrow();
  });

  it("uppercases and validates project keys", () => {
    expect(projectCreateSchema.parse({ name: "Web", key: "web" }).key).toBe("WEB");
    expect(() => projectCreateSchema.parse({ name: "Web", key: "1BAD" })).toThrow();
    expect(() => projectCreateSchema.parse({ name: "Web", key: "TOOLONGKEY11" })).toThrow();
  });

  it("defaults task priority to MEDIUM and coerces due dates", () => {
    const parsed = taskCreateSchema.parse({
      columnId: "col1",
      title: "Do the thing",
      dueDate: "2026-11-01",
    });
    expect(parsed.priority).toBe("MEDIUM");
    expect(parsed.dueDate).toBeInstanceOf(Date);
  });

  it("validates move payloads", () => {
    expect(
      taskMoveSchema.parse({ targetColumnId: "c2", targetIndex: 0 }).targetIndex,
    ).toBe(0);
    expect(() => taskMoveSchema.parse({ targetColumnId: "c2", targetIndex: -1 })).toThrow();
    expect(() => taskMoveSchema.parse({ targetColumnId: "c2", targetIndex: 1.5 })).toThrow();
  });

  it("slugifies workspace names", () => {
    expect(slugify("My Cool Team!")).toBe("my-cool-team");
    expect(slugify("  Spaces   Everywhere ")).toBe("spaces-everywhere");
    expect(slugify("***")).toBe("");
  });
});
