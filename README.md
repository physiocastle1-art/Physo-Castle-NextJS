# Physio Castle — Next.js

Premium physiotherapy & rehabilitation website for Dr. Riddhi Shah.
Cream / off-white luxury theme, App Router, GSAP animations.

## Run it

```bash
# from this folder
npm install

cp .env.example .env.local     # then fill in MONGO_DB_URI
npm run db:check               # confirms MongoDB connects and is writable

npm run dev                    # http://localhost:3000
```

Build for production:

```bash
npm run build && npm start
```

First time only — create the owner login for the admin panel:

```bash
npm run seed:admin -- --name "Your Name" --email you@example.com
```

It prints a one-time link; open it to choose your password. See **[ADMIN.md](ADMIN.md)**
for the admin panel, its data model and its security model.

## What's inside

| Route | Page |
|-------|------|
| `/` | Home — hero, trust bar, process, services, CTA (no loader; content is visible on first paint) |
| `/reveal` | **Dig In** — dedicated smudge **scratch-to-reveal** page (drag to uncover the text) |
| `/about` | About Physio Castle, Dr. Riddhi Shah, team, **Pelu Health Meter** |
| `/services` | All rehab categories + every condition |
| `/symptoms` | "Do I need physio?" quiz + **Pelu AI chatbox** |
| `/testimonials` | Text / video / Google reviews |
| `/blog` | Articles + FAQ accordion |
| `/contact` | Home-visit & teleconsultation booking forms |
| `/admin` | **Admin panel** — dashboard, patients, sessions, instalments, payments (login required) |

## Animations

- **Landing hero** — `src/components/LandingIntro.jsx`. The click-to-begin preloader was removed; the hero copy and chrome now fade up on mount and the page is scrollable immediately.
- **Page transition** — `src/providers/TransitionProvider.jsx` (SVG stroke wipe on every navigation, via `next-transition-router` + GSAP).
- **Scratch / smudge reveal** — `src/components/SmudgeReveal.jsx` (canvas-based: drag across the cream panel on `/reveal` to uncover the gold text; the cover slowly re-frosts back).

## Theme

All colors live as CSS variables in `src/app/globals.css` (`:root`).
Cream background `#f4eee2`, antique gold `#a87f3d`, sage `#3f7a6a`, ink text `#231d14`.

## To customise before launch

- Replace phone / email / address (search `00000` and `hello@physiocastle.com`).
- Add real photos/logo (portrait + post image placeholders use CSS).
- Wire the booking forms and chatbot to a real backend / email / WhatsApp.
  (The public `/contact` form is still UI-only — it does not write to MongoDB.)
- Link the Google reviews button.
- Configure real email sending in `src/lib/mail.js` (invite and reset links are
  currently printed to the server console).
