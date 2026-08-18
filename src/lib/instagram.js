/* Instagram post references, and the one place a pasted URL becomes a shortcode.

   Pure module — no database, no next/headers — so the admin form validates a
   pasted link with the same function the feed uses to build a permalink.

   Everything is keyed on the SHORTCODE (the "DbvIsE6jIji" in
   instagram.com/p/DbvIsE6jIji/). Posts, reels and TV share one namespace, so a
   reel URL and a post URL for the same item resolve identically. */

export const IG_HANDLE = "physio.castle";
export const IG_PROFILE_URL = `https://www.instagram.com/${IG_HANDLE}/`;

/* Instagram shortcodes are base64-ish: letters, digits, hyphen, underscore.
   Length has crept from 11 to 12 over the years, so the range is deliberately
   loose rather than pinned to today's. */
const SHORTCODE_RE = /^[A-Za-z0-9_-]{5,24}$/;

/* Accepts anything the clinic is likely to paste — a full post URL, a reel URL,
   a share link with tracking junk, a profile-scoped URL, or the bare shortcode
   on its own — and returns just the shortcode.

   Returns "" rather than throwing, so callers decide what an unusable value
   means: the form shows an error, the feed skips the row. */
export function toShortcode(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";

  // A bare shortcode, already.
  if (!raw.includes("/") && SHORTCODE_RE.test(raw)) return raw;

  // /p/, /reel/, /reels/ and /tv/ all address the same thing. The optional
  // leading segment covers profile-scoped links like /physio.castle/p/XXXX/.
  const match = raw.match(/instagram\.com\/(?:[A-Za-z0-9_.]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
  if (match && SHORTCODE_RE.test(match[1])) return match[1];

  return "";
}

export const isShortcode = (value) => SHORTCODE_RE.test(String(value || "").trim());

/* The permalink Instagram's embed.js expects. utm_source=ig_embed is what
   Instagram's own copy-embed dialog appends; leaving it off still works but
   this keeps the referrer honest in their analytics. */
export const permalinkOf = (shortcode) =>
  `https://www.instagram.com/p/${shortcode}/?utm_source=ig_embed`;

export const postUrlOf = (shortcode) => `https://www.instagram.com/p/${shortcode}/`;

/* The posts the feed falls back to when nothing has been curated in the admin
   yet, so the homepage is never an empty box on a fresh install. Replace them
   from Admin → Reviews & CMS → Instagram feed. */
export const DEFAULT_POSTS = [
  "DbvIsE6jIji",
  "DbqDqB0jDgw",
  "DbnkagVDFbv",
  "DbjwjTpkybR",
  "DbEBBr-jM5D",
  "Daeocu3kpGh",
  "DJ5cQsTtMXF",
  "DGMjIvxBtbz",
];
