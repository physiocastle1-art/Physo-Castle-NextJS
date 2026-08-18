/* Client-side fetch helper for the admin panel.

   The session cookie rides along automatically because it is a same-origin
   httpOnly cookie — there is no token to read, attach, or store anywhere. */
async function call(url, method, body) {
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection." };
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
    /* empty or non-JSON body */
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: data.error || `Request failed (${res.status}).`,
      // Stable tag for the few failures a form reacts to rather than just
      // displays — see ApiError in lib/api.js.
      code: data.code || null,
      details: Array.isArray(data.details) ? data.details : null,
      // { fieldName: reason } from a server-side validation failure.
      fieldErrors: data.fieldErrors && typeof data.fieldErrors === "object" ? data.fieldErrors : null,
    };
  }

  return { ok: true, data };
}

export const apiPost = (url, body) => call(url, "POST", body);
export const apiPatch = (url, body) => call(url, "PATCH", body);
export const apiPut = (url, body) => call(url, "PUT", body);
export const apiDelete = (url) => call(url, "DELETE");
