/* Small shaping helpers used between validation and the database.

   Field rules themselves live in lib/validation.js so the browser and the server
   share one definition; this file only holds the mechanical bits that are
   server-side concerns. */

/* completedAt tracks status rather than being supplied by the client: marking a
   visit completed stamps the time, moving it back to any other state clears it. */
export function applyCompletedAt(values) {
  if (!Object.prototype.hasOwnProperty.call(values, "status")) return values;
  return { ...values, completedAt: values.status === "completed" ? new Date() : null };
}

/* { a: 1 } → { "plan.a": 1 } so a $set updates one nested key without
   overwriting its siblings. */
export const prefixKeys = (prefix, obj) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [`${prefix}${k}`, v]));
