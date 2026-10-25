import { ZodError } from "zod";
import { badRequest, errorResponse } from "./errors";
import { zodFieldErrors } from "./schemas";

/** Wrap a route implementation with consistent success/error envelopes. */
export async function handle<T>(
  fn: () => Promise<T>,
  status = 200,
): Promise<Response> {
  try {
    const data = await fn();
    if (data === undefined) return new Response(null, { status: 204 });
    return Response.json(data, { status });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        {
          error: {
            code: "VALIDATION",
            message: "Invalid input.",
            fields: zodFieldErrors(error),
          },
        },
        { status: 400 },
      );
    }
    return errorResponse(error);
  }
}

export async function jsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw badRequest("Request body must be valid JSON.");
  }
}
