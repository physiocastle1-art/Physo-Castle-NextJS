import "server-only";
import { unstable_cache } from "next/cache";
import { listApprovedReviews, listInstagramPosts } from "@/lib/clinic";

/* Cached reads for the PUBLIC site.

   Why this file exists separately from lib/clinic.js: clinic.js is the raw
   database layer, and the admin panel must always see the truth it just wrote.
   Only the public site — which is read-mostly and hit by strangers — reads
   through a cache, so an admin editing a review never looks at a stale row.

   Each entry is tagged, and the admin routes that change the underlying data
   call revalidateTag(). That is what keeps "approve a review" instant rather
   than "instant within the hour": the timed revalidate below is only the
   safety net for a write path that forgot to invalidate.

   unstable_cache is Next 14's stable-in-practice data cache API; it is what
   `fetch`-based caching uses under the hood for non-fetch work like a database
   query. The cached function must return plain JSON — every clinic.js reader
   already runs its result through plain(). */

export const TAGS = {
  reviews: "public:reviews",
  instagram: "public:instagram",
};

/* Approved patient reviews shown on /testimonials. */
export const getApprovedReviews = unstable_cache(
  async () => listApprovedReviews(),
  ["public:approved-reviews"],
  { tags: [TAGS.reviews], revalidate: 3600 }
);

/* The curated Instagram wall on the homepage. Returns full rows; the caller
   picks off the shortcodes. */
export const getPublicInstagramPosts = unstable_cache(
  async () => listInstagramPosts({ limit: 8 }),
  ["public:instagram-posts"],
  { tags: [TAGS.instagram], revalidate: 3600 }
);
