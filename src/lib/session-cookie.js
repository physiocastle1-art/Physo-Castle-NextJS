/* Deliberately dependency-free.

   middleware.js runs on the Edge runtime, which cannot load mongoose or
   node:crypto. It only needs the cookie's name, so that name lives here rather
   than in auth.js. */
export const SESSION_COOKIE = "pc_admin_session";
