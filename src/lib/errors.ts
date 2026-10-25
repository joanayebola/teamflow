/** Application error carrying an HTTP status and a stable machine code. */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const unauthorized = () => new AppError(401, "UNAUTHORIZED", "You must be signed in.");
export const forbidden = (message = "You do not have permission to do that.") =>
  new AppError(403, "FORBIDDEN", message);
export const notFound = (message = "Not found.") => new AppError(404, "NOT_FOUND", message);
export const badRequest = (message: string) => new AppError(400, "BAD_REQUEST", message);
export const conflict = (message: string) => new AppError(409, "CONFLICT", message);

/** Consistent JSON error envelope for API routes. */
export function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  console.error("Unexpected error:", error);
  return Response.json(
    { error: { code: "INTERNAL", message: "Something went wrong." } },
    { status: 500 },
  );
}
