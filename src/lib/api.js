import { NextResponse } from "next/server";
import { getSessionUser, hasRole } from "@/lib/auth";

export class ApiError extends Error {
  /* `code` is a stable machine-readable tag the browser can branch on — the
     booking form needs to tell "outside clinic hours" (offer to override) apart
     from "that slot is taken" (never overridable), and the human message is the
     wrong thing to test against. */
  constructor(message, status = 400, extra = null, code = null) {
    super(message);
    this.status = status;
    this.extra = extra;
    this.code = code;
  }
}

/* Field-level validation failure: carries { fieldName: reason } so the form can
   put each message under the input it belongs to. */
export class ValidationFailed extends ApiError {
  constructor(fieldErrors) {
    super("Please fix the highlighted fields.", 400);
    this.fieldErrors = fieldErrors;
  }
}

/* Called right after a validate*() from lib/validation.js. This is the server
   half of the shared rules — the browser runs the same functions for instant
   feedback, and this is what actually decides. */
export function assertValid(errors) {
  if (errors && Object.keys(errors).length > 0) throw new ValidationFailed(errors);
}

export const jsonOk = (data = {}, status = 200) => NextResponse.json(data, { status });

/* Wraps a route handler so thrown ApiErrors and mongoose validation failures
   become clean JSON instead of an HTML 500 page. */
export function route(handler) {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json(
          {
            error: err.message,
            ...(err.code ? { code: err.code } : {}),
            ...(err.extra ? { details: err.extra } : {}),
            ...(err.fieldErrors ? { fieldErrors: err.fieldErrors } : {}),
          },
          { status: err.status }
        );
      }
      if (err?.name === "ValidationError") {
        const details = Object.values(err.errors || {}).map((e) => e.message);
        return NextResponse.json({ error: "Please check the form.", details }, { status: 400 });
      }
      if (err?.name === "CastError") {
        return NextResponse.json({ error: "Not found." }, { status: 404 });
      }
      if (err?.code === 11000) {
        return NextResponse.json({ error: "That record already exists." }, { status: 409 });
      }
      console.error("[api]", err);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }
  };
}

/* THE server-side authorization gate. Every mutating route calls this; the
   role is read from the database via the session cookie, never from the
   request body, a header, or anything else the client controls. */
export async function requireApiUser({ minRole = "staff", requireVerified = true } = {}) {
  const user = await getSessionUser();
  if (!user) throw new ApiError("You are not signed in.", 401);
  if (requireVerified && !user.emailVerified) {
    throw new ApiError("Verify your email address before making changes.", 403);
  }
  if (!hasRole(user, minRole)) {
    throw new ApiError("You do not have permission to do that.", 403);
  }
  return user;
}

export async function readJson(req) {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object") throw new Error("not an object");
    return body;
  } catch {
    throw new ApiError("Expected a JSON body.", 400);
  }
}

/* Small coercion helpers — mongoose validates types, these normalise the
   loose strings that arrive from HTML form fields. */
export const str = (v, fallback = "") =>
  typeof v === "string" ? v.trim() : v == null ? fallback : String(v).trim();

export function num(v, fallback = null) {
  if (v === "" || v == null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function money(v, fallback = 0) {
  const n = num(v, fallback);
  return n == null ? fallback : Math.round(n * 100) / 100;
}

export function date(v, fallback = null) {
  if (!v) return fallback;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export function require_(value, label) {
  const v = str(value);
  if (!v) throw new ApiError(`${label} is required.`, 400);
  return v;
}
