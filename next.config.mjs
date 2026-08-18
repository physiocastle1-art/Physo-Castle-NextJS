/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don't advertise the framework version to every visitor.
  poweredByHeader: false,

  async headers() {
    return [
      {
        /* Everything under /api/admin is behind requireApiUser() and is
           therefore per-user. Set here rather than route by route so a new
           admin endpoint is covered the moment it is created — the failure
           mode otherwise is one forgotten route letting a CDN or a corporate
           proxy hand one signed-in user's patient data to the next.

           Route handlers that read cookies() are already dynamic on the
           server; this governs every cache BETWEEN the server and the
           browser, which Next cannot speak for. */
        source: "/api/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, private" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        // The admin UI itself: never cached, never indexed.
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, private" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        // Baseline hardening for every response.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
