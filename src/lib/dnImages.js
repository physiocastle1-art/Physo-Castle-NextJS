/* ─────────────────────────────────────────────────────────────────────────
   Photography for the homepage blocks — free Unsplash CDN photos, requested at
   the size each slot actually renders (auto=format serves AVIF/WebP where the
   browser supports it).

   These replace /public/svc-*.jpg and /public/about-*.jpg in these blocks only:
   those files are placeholder artwork with the service name baked into the
   image, which read as a duplicate of the card's own title. Swap any entry for
   a local path once real clinic photography exists — nothing else changes.
   ───────────────────────────────────────────────────────────────────────── */

const CDN = "https://images.unsplash.com/photo-";

/** id → a sized, format-negotiated URL. */
export const photo = (id, w = 900) => `${CDN}${id}?auto=format&fit=crop&w=${w}&q=70`;

export const SERVICE_PHOTOS = {
  neuro: "1645005512968-0c1fe99f0093",   // assisted walking, therapist supporting an arm
  women: "1522898467493-49726bf28798",   // exercise on a stability ball
  stress: "1519823551278-64ac92734fb1",  // manual therapy, shoulders
  fitness: "1586401100295-7a8096fd231a", // dumbbells / strength work
};

export const ABOUT_BANNER = "1540205895360-4ad4cffb3aa8";  // hands-on treatment, wide

/* Cycled by spawn index under the cursor in the Why block. */
export const TRAIL_PHOTOS = [
  "1649751361457-01d3a696c7e6",  // knee assessment
  "1706353399656-210cca727a33",  // back treatment
  "1519824145371-296894a0daa9",  // manual therapy
  "1645005513713-9e2b92a687d3",  // dumbbell session
  "1522898467493-49726bf28798",  // stability ball
  "1545463913-5083aa7359a6",     // foot / ankle work
  "1699523229199-fce5aa6b0ec3",  // bedside care
  "1645005513751-e22717a66ae6",  // therapist and patient
];
