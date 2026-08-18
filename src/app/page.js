import Reveal from "@/components/Reveal";
import HomeExperience from "@/components/HomeExperience";
import SmudgeReveal from "@/components/SmudgeReveal";
import BlueTakeover from "@/components/BlueTakeover";

import HomeHero from "@/components/dn/HomeHero";
import WhyTrail from "@/components/dn/WhyTrail";
import ServicesRunway from "@/components/dn/ServicesRunway";
import AboutOverlay from "@/components/dn/AboutOverlay";
import StoriesRail from "@/components/dn/StoriesRail";
import ContactPanel from "@/components/dn/ContactPanel";
import InstagramFeed from "@/components/dn/InstagramFeed";

import { getPublicInstagramPosts } from "@/lib/public-data";
import { DEFAULT_POSTS } from "@/lib/instagram";

import "./dn-home.css";

/* The homepage reads the curated Instagram list from the database, which would
   otherwise make it render on every request. Revalidating hourly keeps it a
   static page that happens to refresh itself — a post added in the admin is on
   the site within the hour, and a visitor never waits for a database round
   trip to see the hero. */
export const revalidate = 3600;

/* The homepage now runs the Dantora composition. The two blocks the client
   asked to keep — the Scratch card and the blue FAQ takeover — are untouched
   and still close the page. The previous homepage is preserved verbatim at
   /legacy-home, and none of its components were deleted.

   The Services runway and the About overlay are a MATCHED PAIR: About carries
   margin-top: -100lvh, so it rides up over the pinned runway. Disabling one
   without the other pulls a section over the block above it. They are wrapped
   in .dn-chain so the sticky panels stop travelling before Scratch begins. */
export default async function Home() {
  /* A database that is unreachable must not take the homepage down with it —
     the wall falls back to the curated defaults instead. */
  let instagramPosts = [];
  try {
    const rows = await getPublicInstagramPosts();
    instagramPosts = rows.map((r) => r.shortcode);
  } catch (err) {
    console.error("[home] could not load the Instagram list", err);
  }
  if (!instagramPosts.length) instagramPosts = DEFAULT_POSTS;

  return (
    <HomeExperience>
      {/* white backdrop: every panel below has a 48px rounded edge, and the
          reference uncovers WHITE behind them, not the site's cream page */}
      <div className="dn-page">
        <HomeHero />
        <WhyTrail />

        <div className="dn-chain">
          <ServicesRunway />
          <AboutOverlay />
          <StoriesRail />
        </div>
      </div>

      {/* ── kept from the previous homepage ── */}
      <section className="section tight snap-sec smudge-zone" id="dig-in">
        <div className="wrap">
          <Reveal><SmudgeReveal /></Reveal>
        </div>
      </section>

      <BlueTakeover />

      <InstagramFeed posts={instagramPosts} />
      
      {/* Request a call back — placed right above the footer */}
      <ContactPanel />
    </HomeExperience>
  );
}
