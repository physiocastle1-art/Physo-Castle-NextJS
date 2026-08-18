/* Feature switches for the admin panel.

   Deliberately dependency-free so both server and client components can import
   it without pulling server-only modules into the browser bundle. */

/* Staff invites and the "Staff & access" page. Turned off while the clinic runs
   on a single owner account.

   Flip to `true` to bring it back — that re-enables, in one go: the sidebar
   link, the /admin/staff page, and the three /api/admin/staff/* routes. Roles
   themselves keep working either way; only the management surface is affected. */
export const STAFF_MANAGEMENT_ENABLED = false;
