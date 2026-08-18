# Physio Castle — Admin panel

A clinic back-office built into this Next.js app: patient records, session
tracking, and instalment/payment tracking, behind invite-only authentication.

Everything lives in the same project — Next.js route handlers are the backend,
MongoDB (Atlas) is the database, and there is no third-party auth provider.

---

## 1. Getting in

```bash
cp .env.example .env.local        # fill in MONGO_DB_URI
npm run db:check                  # verifies connection + write permission
npm run seed:admin -- --name "Your Name" --email you@example.com
npm run dev
```

`seed:admin` creates an **owner** account and prints a one-time link. No password
is typed on the command line or stored in shell history — you choose the password
in the browser, and doing so is what confirms the email address.

Lost the link? Re-run with `--reinvite`:

```bash
npm run seed:admin -- --email you@example.com --reinvite
```

Locked out with no email configured? Set a password straight from the console.
It enforces the same policy (12+ chars, breach-checked) and revokes any pending
link plus every existing session. Note the password lands in your shell history:

```bash
npm run set:password -- --email you@example.com --password "your new password"
```

Then sign in at **http://localhost:3000/admin**.

### Adding colleagues — currently turned OFF

Staff management is disabled while the clinic runs on a single owner account.
`STAFF_MANAGEMENT_ENABLED = false` in [`src/lib/features.js`](src/lib/features.js)
hides the sidebar link, makes `/admin/staff` return 404, and makes all three
`/api/admin/staff/*` routes return 404 — so the API is closed, not merely hidden.

Flip that one constant to `true` to bring it back. Nothing else needs changing.
Roles keep being enforced either way; only the management surface is affected.

When enabled: there is no public signup route, so an admin or owner invites
people from **Staff & access**, they get a link, set a password, and are active.
While email is console-only the invite link is also shown in the UI so you can
pass it on yourself.

Until then, extra accounts can still be created from the console with
`npm run seed:admin` / `npm run set:password`.

---

## 2. What you can do

| Page | What it does |
|------|--------------|
| `/admin` | Today's sessions, next 7 days, total outstanding dues, collections this month, recent payments, and a warning when patients have drifted |
| `/admin/patients` | Live search (name / mobile / diagnosis) plus filters by case status and by "has dues"; shows sessions done and balance per row |
| `/admin/patients/new` | Add a patient, picking a package from the catalogue |
| `/admin/patients/[slug]` | The full record: details, session history, payment ledger, instalment state, progress charts, assessments |
| `/admin/patients/[slug]/receipt/[id]` | One printable receipt for one payment |
| `/admin/patients/[slug]/invoice` | The full account statement — every payment and the running balance |
| `/admin/schedule` | Week grid, day grid, flat list, or the day's home-visit route |
| `/admin/recall` | Patients who stopped coming, with a WhatsApp check-in per row |
| `/admin/payments` | Payment ledger with monthly and all-time totals |
| `/admin/expenses` | Expense ledger, 12-month profit and loss, spend by category |
| `/admin/reports` | Revenue, referral sources, diagnoses, attendance, discharge and growth |
| `/admin/clinic` | Package catalogue, opening hours, holidays, receipt details |
| `/admin/staff` | Invite, disable and re-role accounts (admin+) — **currently disabled**, returns 404 |
| `/admin/settings` | Change your own password |

### Sessions

A patient has many sessions. Each is numbered (`#1`, `#2`, …), scheduled to a
date and time, and carries a status: **scheduled → completed**, or **cancelled /
no show**. Each session also records the treatment given, a 0–10 pain score,
duration, therapist and free-text notes.

The counters you asked for — "2 completed, next is…" — are derived, never stored:

- **completed** = sessions with status `completed`
- **remaining** = planned sessions (from the package) − completed
- **next session** = the earliest `scheduled` session still in the future

Visit numbers continue from the highest ever used, so deleting one session does
not renumber a patient's history.

### The calendar, and what it refuses to book

`/admin/schedule` has four views: **week** and **day** draw a real grid, **list**
is the flat table (still the better tool for "everything outstanding"), and
**home visits** is the day's driving run.

Opening hours, holidays and slot size live in `/admin/clinic` and are not
decoration — they are what the API checks a booking against:

| Situation | What happens |
|---|---|
| Two bookings overlapping for the **same therapist** | **Refused, always.** Not overridable, not even with `force`. |
| Same time, **different therapist** | Allowed — they can work in parallel. |
| Outside opening hours, or on a holiday | Refused with `code: "outside_hours"`, and the form offers **"Book it anyway"** |
| A cancelled or no-show session in the slot | Ignored — that slot is free again |
| Recording a visit that already happened | Never blocked; only `scheduled` bookings are checked |

The distinction is deliberate. Two people in the same room is never a decision
anyone makes on purpose; an early Sunday visit for a post-op patient is.

Both checks live in `src/lib/booking.js` and are called by all three routes that
create or move a session, so a rule enforced in one is enforced in all.

### Booking a whole course at once

"12 sessions, Mon/Wed/Fri at 5:30pm, starting Monday" is one action rather than
twelve. The form previews the exact dates before you commit, and the preview is
not a guess — the browser and `POST /api/admin/patients/[id]/sessions/bulk` both
call `generateOccurrences()` from `src/lib/recurrence.js` with the same clinic
settings, so they cannot disagree.

- Holidays are **skipped and rolled forward**, so you still get the 12 you asked
  for, and the skipped dates are listed.
- Slots outside opening hours are flagged amber in the preview but still booked.
- A slot that turns out to be taken is skipped and **reported back** — losing one
  Wednesday must not cost you the other eleven appointments.
- Capped at 60 in one go.

### Progress charts

The patient page charts what is already being recorded — nothing extra is typed
to produce them:

- **Pain** over time, from the 0–10 on each visit plus the VAS on any assessment.
  An assessment on the day of a visit wins, being the more considered number.
  Cancelled and no-show visits are excluded.
- **Range of movement**, one line per joint and movement, drawn against the
  normal value as a dashed reference. Only movements measured twice are charted.
- **Strength**, as first-to-latest Oxford grades. `4+/5` and `3-/5` are read as
  a third of a grade either way.

All of it is plain SVG in `src/components/admin/Charts.jsx` — no charting
library, because shipping a canvas renderer to draw twelve numbers is not worth
the download on a clinic's phone.

### Home visits

A session carries a **visit type**, and a home visit adds an address and a travel
charge. `/admin/schedule?view=route` lists the day's visits in appointment order
with per-stop directions, a call button, and one Maps link for the whole run.

The travel charge is recorded on the session and totalled on the route view. It
is deliberately **not** folded into the patient's package balance — the package
fee is what was agreed up front, and mixing the two would make the instalment
arithmetic disagree with what the patient was told.

### Instalments

The patient's package holds a **total fee** and, optionally, an **instalment
amount**. Payments are a separate ledger. Everything else is derived, so the
summary can never disagree with the ledger:

```
paid              = sum of all recorded payments
balance due       = max(0, total fee − paid)
instalments total = ceil(total fee ÷ instalment amount)
instalments paid  = floor(paid ÷ instalment amount)
instalments left  = instalments total − instalments paid
next payment      = min(instalment amount, balance due)
```

"Instalments left" appears on the patient's page, in the patients list, and
aggregated on the dashboard. Leave the instalment amount blank for patients who
pay in one go — then only the plain balance is tracked.

Amounts are stored as rupees (2 dp), not paise.

### The package catalogue

`/admin/clinic` holds the packages the clinic actually sells. Picking one on a
patient **copies the numbers in** rather than linking to it, so re-pricing the
catalogue next year cannot rewrite a fee somebody already agreed to — and the
copied fee stays editable for the one-off discount every clinic ends up giving.
Deactivating beats deleting: the row stays readable in the records around it.

### Receipts

Every payment gets a number the moment it is recorded — `PC/2026-27/0007` —
issued by a single atomic `$inc` on a counter, so two payments taken in the same
second cannot receive the same receipt.

- The financial year is India's (1 April – 31 March) and is taken from the
  **payment date**, so a payment backdated to March lands in March's book.
- A deleted payment leaves a gap. That is correct behaviour for a receipt book.
- Amounts are printed in words with Indian grouping — lakh and crore, not
  millions.

Payments recorded before numbering existed show `—`. Give them numbers with:

```bash
npm run backfill:receipts
```

It is idempotent, numbers them in payment-date order, and leaves the live
counter above everything it wrote so the next payment cannot collide.

### WhatsApp reminders

There is no Business API, no per-message fee and no approval queue. Every button
opens `wa.me` with the number and the message already written, and it is sent
from the clinic's own WhatsApp — which is why nothing records a "sent" state:
the panel cannot know whether you actually pressed send.

| Where | Message |
|---|---|
| Any scheduled session (patient page, dashboard, schedule list, route) | Appointment reminder, with the address for a home visit |
| A patient with a balance | Dues reminder, naming the next instalment |
| Any payment | Confirmation with the receipt number and remaining balance |
| The recall list | A warm check-in — deliberately **not** about money, even for patients who owe |

Templates live in `src/lib/whatsapp.js`. A patient with no usable number renders
no button at all, rather than a dead link.

### Reports and the recall list

`/admin/reports` answers the questions an owner asks, all derived at render time
so a corrected payment changes them immediately:

- Revenue, expenses and net per month, and revenue **per patient**
- **Which referral source sends the most patients**, and what they are worth
- Top diagnoses, as a share of the caseload
- No-show and cancellation rates — clinic-wide, and per patient for anyone with
  at least three settled bookings (below that a rate is not a pattern)
- Average sessions to discharge, package completion rate, and **sessions sold but
  never delivered**
- New registrations against returning patients, month by month

`/admin/recall` is the one to act on: active or on-hold patients with **nothing
booked ahead** and no visit in the chosen window, who still have paid-for
sessions left or money owed. One WhatsApp button each.

`/admin/expenses` turns collections into actual income — a 12-month profit and
loss with spend by category. Until expenses are logged, "profit" is only revenue.

Dates are rendered and interpreted in **Asia/Kolkata** everywhere, so a deploy on
a UTC host still shows and stores IST appointment times.

### CRUD coverage

Every record supports the full set. Reads happen through `lib/clinic.js` inside
server components (no HTTP round trip); writes go through the API.

| | Create | Read | Update | Delete |
|---|---|---|---|---|
| Patient | `/admin/patients/new` | list + detail page | inline editor on the detail page | admin only, type-to-confirm |
| Session | "+ Add session" | session table | per-row editor, or one-click "✓ Complete" | admin only |
| Payment | "+ Record payment" | ledger + totals | per-row editor | admin only |

Deleting a patient also deletes their sessions and payments, and reports how
many of each went with them. Payments became editable because the alternative —
delete and re-enter — is closed to staff, so a mistyped amount was unfixable by
the person who typed it.

### Validation

All field rules live in **`src/lib/validation.js`**, imported by both the forms
and the API routes. The browser runs them on submit for instant inline errors;
the server runs the identical function and is what actually decides. A rule can
never drift between the two, and a hand-crafted request can't skip it.

Notable rules:

| Field | Rule |
|---|---|
| Patient / referrer name | Letters, spaces and `. ' -` only — **no digits**. 2–120 chars |
| Mobile | **Digits only, no letters.** Exactly 10 after normalising, must start 6–9. Accepts `+91 98765 43210`, `098765 43210`, `9876543210` and stores `9876543210` |
| Email | Optional, but must be well-formed if given |
| Age | Whole number, 0–120 |
| City | No digits |
| Fee / instalment / payment | Number ≥ 0, capped at ₹20,00,000 to catch an extra digit; instalment can't exceed the total fee |
| Payment amount | Must be greater than zero |
| Pain score | Whole number 0–10 |
| Session date | Required, must parse, year 1900–2200 |
| Duration | Whole number, 5–480 minutes |

Failures come back as `{ fieldErrors: { phone: "…" } }` and render under the
input they belong to, not as one lump at the top.

### URLs and slugs

Patients live at `/admin/patients/meera-patel-k3f9x`, not at a raw ObjectId.

- The slug is generated once at creation from the name plus a 5-character random
  suffix. The suffix means two patients with the same name never collide, and
  nobody can guess a neighbouring patient's URL by incrementing something.
- It is **not regenerated on rename** — links and bookmarks keep resolving after
  a correction to the spelling of a name.
- Lookups accept a slug *or* an `_id`, so older links still work.
- API calls use `_id`, which never changes. Slugs are for humans, ids are for
  machines.

### Search

`POST /api/admin/patients/search`, driven by a debounced live search box.

Why not `?q=`, which is what this used to be:

- **Privacy.** These terms are patient names, mobile numbers and diagnoses. In a
  query string they land in browser history, in the `Referer` header of the next
  request, and in every access log in between. A POST body keeps them out of all
  three.
- **It wasn't really search.** The old version was one `$or` of the same regex
  across four fields, and every keystroke was a full page navigation. The new one
  requires *every* token to match somewhere (`"meera knee"` narrows rather than
  widens), matches phone digits regardless of how they're punctuated, and ranks
  results — exact phone hit, then name prefix, then word prefix, then substring,
  with active cases nudged up.
- In-flight requests are aborted as you keep typing, so results can't arrive out
  of order and show stale matches.
- ↑/↓ to move, Enter to open, Esc to close; the matched run is highlighted.

The *filters* (status, has-dues) deliberately stay in the URL — a filtered view
is worth bookmarking and sending to a colleague. A half-typed name is not.

### State management

**No state library, deliberately.** Redux/Zustand/Jotai would be dead weight
here: there is no client-side cache to keep coherent, because reads are server
components and every write ends with `router.refresh()`, which re-runs the
server render and pushes fresh data down. The only client state is per-form —
field values, errors and a busy flag — which belongs in the component that owns
the form.

What is shared instead is *logic*, not state: `lib/validation.js`,
`lib/format.js` and `lib/clinic.js` are used by both sides. That's the
duplication worth removing. If a real cross-page need appears later (an
optimistic offline queue, say), a single React context is the next step, not a
store.

### Roles

| | Staff | Admin | Owner |
|---|---|---|---|
| View everything | ✓ | ✓ | ✓ |
| Add / edit patients, sessions, payments | ✓ | ✓ | ✓ |
| Delete patients, sessions, payments | | ✓ | ✓ |
| Invite staff, disable accounts | | ✓ | ✓ |
| Change roles, invite admins | | | ✓ |

There must always be at least one active owner; the API refuses the change that
would remove the last one, and nobody can disable or re-role themselves.

---

## 3. Code map

```
src/lib/
  db.js              MongoDB connection (cached across hot reloads)
  models.js          every mongoose schema, one file
  auth.js            sessions, cookies, requireUser(), one-time tokens
  api.js             route wrapper, error mapping, requireApiUser()
  password.js        policy, Have I Been Pwned check, bcrypt hashing
  ratelimit.js       attempt counters + lockout, stored in MongoDB
  features.js        feature switches (staff management on/off); dependency-free
  validation.js      ALL field rules — shared by the forms and the API routes
  enums.js           the closed value sets (roles, statuses, methods)
  slug.js            readable patient URL keys
  inputs.js          the few server-only shaping helpers
  clinic.js          queries + all derived billing/session numbers
  reports.js         the practice-wide aggregations behind /admin/reports
  booking.js         the clash + opening-hours guard, shared by all 3 write paths
  hours.js           opening hours, holidays, calendar-date arithmetic (pure)
  recurrence.js      "12 sessions, Mon/Wed/Fri" -> dates (pure; shared with the form)
  progress.js        pain / ROM / strength series for the charts (pure)
  receipt.js         financial year, receipt numbering, amount in words (pure)
  whatsapp.js        wa.me links and the message templates (pure)
  format.js          money, dates, clinic timezone (pure; client-safe)
  session-cookie.js  cookie name only — importable from Edge middleware
  mail.js            outbound mail (console transport for now)

src/app/api/admin/   route handlers (auth, patients, sessions, payments, staff)
src/app/admin/(app)/ signed-in pages (own layout + sidebar)
src/app/admin/(auth)/ login, invite, reset, verify-email (centred card layout)
src/components/admin/ the panel's UI components
src/middleware.js    cheap cookie-presence redirect (NOT the security boundary)
```

The scripts in `scripts/` are standalone Node — they load `.env.local` themselves
via `scripts/load-env.mjs`, and import `src/lib/*` with relative paths because
plain Node cannot resolve the `@/` alias:

| Script | Purpose |
|---|---|
| `npm run db:check` | Verify the connection, credentials and write permission |
| `npm run seed:admin` | Create the first owner and print a set-password link |
| `npm run set:password` | Set a password from the console (lockout recovery) |
| `npm run migrate:patients` | Backfill slugs, normalise phone numbers, drop superseded indexes |
| `npm run backfill:receipts` | Give a receipt number to payments recorded before numbering existed |

`migrate:patients` is idempotent — run it after pulling a change that adds a
patient field. It reports any phone number it could not normalise rather than
guessing, so you can correct those by hand.

---

## 4. The five login security holes

Each item from the checklist, and what this codebase actually does.

### 01 — Session token in localStorage → **httpOnly cookie**

No token is ever handed to JavaScript. On login the server generates 32 random
bytes, stores only their **SHA-256 hash** in `admin_auth_sessions`, and sets the
plaintext as a cookie with `httpOnly: true`, `sameSite: "lax"`, `path: "/"`, and
`secure: true` in production (`src/lib/auth.js` → `createSession`).

- Nothing in the codebase reads or writes `localStorage` / `sessionStorage`, and
  the client fetch helper attaches no `Authorization` header — the cookie rides
  along automatically because it is same-origin (`src/lib/client.js`).
- Because only a hash is stored, a database dump cannot be replayed as a live
  session.
- Sessions expire after 7 days, enforced twice: a cookie `maxAge` and a MongoDB
  TTL index on `expiresAt` that deletes the row.
- Changing or resetting a password stamps `passwordChangedAt`, which invalidates
  every session issued earlier.

**Verify in DevTools:** Application → Cookies → `pc_admin_session` shows
`HttpOnly ✓`, `SameSite=Lax`. In the Console, `document.cookie` does not contain
it and `localStorage` is empty. Deleting the cookie and reloading returns you to
the login screen.

### 02 — Client-side admin check → **re-verified server-side on every request**

There is no role check in the browser that matters. Two server-side gates:

- **Pages** call `requireUser({ minRole })` (`src/lib/auth.js`), which reads the
  cookie, looks the session up in MongoDB, re-reads the user row, and re-reads
  `role`, `disabledAt` and `emailVerifiedAt` from the database on every request.
- **API routes** call `requireApiUser({ minRole })` (`src/lib/api.js`) — the first
  statement of every handler.

The role is never taken from the request body, a header, or a client-supplied
claim. Hiding a nav item is cosmetic only; a staff account that navigates
straight to `/admin/staff` is redirected, and a hand-crafted
`DELETE /api/admin/patients/<id>` returns 403.

Route-by-route authorization as written:

| Route | Method | Requires |
|---|---|---|
| `/api/admin/auth/login` | POST | public (rate limited) |
| `/api/admin/auth/forgot-password` | POST | public (rate limited) |
| `/api/admin/auth/reset-password` | POST | valid one-time token |
| `/api/admin/auth/accept-invite` | POST | valid one-time token |
| `/api/admin/auth/logout` | POST | any signed-in session |
| `/api/admin/auth/change-password` | POST | signed in + current password |
| `/api/admin/patients` | POST | staff |
| `/api/admin/patients/search` | POST | staff |
| `/api/admin/patients/[id]` | GET | staff |
| `/api/admin/patients/[id]` | PATCH | staff |
| `/api/admin/patients/[id]` | DELETE | **admin** |
| `/api/admin/patients/[id]/sessions` | POST | staff |
| `/api/admin/patients/[id]/sessions/bulk` | POST | staff |
| `/api/admin/sessions/[id]` | PATCH | staff |
| `/api/admin/sessions/[id]` | DELETE | **admin** |
| `/api/admin/patients/[id]/payments` | POST | staff |
| `/api/admin/payments/[id]` | PATCH | staff |
| `/api/admin/payments/[id]` | DELETE | **admin** |
| `/api/admin/expenses` | GET, POST | staff |
| `/api/admin/expenses/[id]` | DELETE | **admin** |
| `/api/admin/packages` | GET | staff |
| `/api/admin/packages` | POST | **admin** |
| `/api/admin/packages/[id]` | PATCH, DELETE | **admin** |
| `/api/admin/settings/clinic` | GET | staff |
| `/api/admin/settings/clinic` | PUT | **admin** — hours decide which bookings are refused |
| `/api/admin/staff` | POST | *disabled (404)* — else admin; admin role → owner only |
| `/api/admin/staff/[id]` | PATCH | *disabled (404)* — else admin; role changes → owner only |
| `/api/admin/staff/[id]/reinvite` | POST | *disabled (404)* — else admin |

Mass assignment is blocked separately: the `validate*()` functions in
`src/lib/validation.js` return only the fields they explicitly recognise, so
posting `role`, `createdBy`, `slug` or a forged `_id` alongside a patient cannot
reach the database.

MongoDB has no row-level security equivalent to Postgres RLS, so the
authorization boundary is the API layer — which is why every handler starts with
`requireApiUser`, and why the database credentials never leave the server.

### 03 — No email verification → **required, and enforced on writes**

- **There is no public signup route at all.** Accounts exist only via
  `npm run seed:admin` or an invite from an existing admin — so nobody can sign
  up as somebody they are not.
- `emailVerifiedAt` is `null` until the person opens the emailed link and sets
  their password. That link is the proof of mailbox control.
- `requireUser()` redirects an unverified account to `/admin/verify-email`;
  `requireApiUser()` returns **403** for every mutation. This is the
  `email_confirmed_at` equivalent, checked from the server session.
- Completing a password reset also sets `emailVerifiedAt`, for the same reason.
- Invites expire after 7 days, resets after 1 hour, both single-use, and issuing
  a new one invalidates the old.

### 04 — No rate limiting → **throttle + lockout on login and reset**

`src/lib/ratelimit.js`, backed by MongoDB so counters survive a restart and are
shared across instances. Checked *before* the bcrypt compare, so a locked-out
client is cheap to reject.

| Flow | Bucket | Limit | Lockout |
|---|---|---|---|
| Login | IP + email | 5 / 15 min | 15 min |
| Login | IP alone | 20 / 15 min | 15 min |
| Password reset request | IP + email | 3 / hour | 1 hour |
| Invite / reset token attempts | IP | 10 / hour | 1 hour |

The 6th login attempt for the same IP + email returns **429** with the minutes
remaining. A successful login clears that account's counter. The IP-only bucket
exists so one machine cannot spray many different email addresses.

Reset requests are counted whether or not the address exists, so the throttle
itself can't be used to enumerate accounts. Counter rows carry a TTL index and
clean themselves up.

### 05 — No password rules → **12+ characters, checked against HIBP**

`src/lib/password.js` — applied identically at invite acceptance, password reset
and password change:

- minimum **12** characters (maximum 72 bytes, refused rather than silently
  truncated by bcrypt)
- must contain a letter and a number; cannot be one repeated character
- cannot contain your own name or the local part of your email
- **rejected if it appears in a known breach**, via the Have I Been Pwned range
  API using k-anonymity: only the first 5 characters of the SHA-1 leave the
  server, never the password or the full hash. Padding is requested and
  zero-count decoy hits are ignored.
- hashed with **bcrypt, cost 12**; the plaintext is never stored or logged

The sign-up/reset UI shows a live strength meter and the rule checklist
(`src/components/admin/PasswordField.jsx`), and prints the server's reason when a
password is refused — e.g. *"This password has appeared in 4,43,397 known data
breaches. Choose a different one."*

If HIBP is unreachable the check **fails open** (the password is allowed) and logs
a warning, so an outage at their end cannot lock everyone out of the clinic
panel. Length and composition rules still apply.

Try it: `password1234` (443,397 breach hits) and `Password123!` (295,389) are both
refused, while a long unique passphrase passes.

### Also hardened along the way

- **Login does not reveal which emails exist.** Wrong password and unknown
  address return the identical message, and an unknown address is still compared
  against a dummy bcrypt hash so the two take the same time.
- **`.gitignore` added.** This project sits inside a git repo rooted at your home
  directory and had no ignore file, so `.env.local` — with live Atlas
  credentials — was one `git add` away from being committed.
- **Disabling an account is immediate**: every session for that user is deleted,
  not just blocked at next login.
- **`?next=` is restricted** to paths starting with `/admin`, so the login
  redirect cannot be used to bounce someone to another site.
- **The admin panel is `noindex`**, and middleware is documented as a convenience
  redirect rather than a security boundary (it runs on the Edge runtime and
  cannot reach the database).

### Still worth doing before real patient data goes in

- Wire real email (`src/lib/mail.js`) so invite/reset links stop being printed to
  the console, then remove the `inviteUrl` returned to the inviter.
- Restrict the Atlas network access list to your server's IP rather than
  `0.0.0.0/0`, and give the application user `readWrite` on this one database only.
- Consider two-factor authentication for owner/admin accounts — the checklist's
  item 03 mentions 2FA and this build implements email verification only.
- Add an audit log of who changed which record, if that matters for your records.
- WhatsApp messages open with the patient's name, condition and balance
  pre-filled. That is patient data leaving the panel into another app on the same
  phone, which is fine — but it is worth knowing before anyone hands the phone
  round.

### The homepage Instagram wall

`/admin` → **Reviews & CMS** → **Instagram Feed** curates what appears on the
homepage. Paste the link from Instagram's *Share → Copy link* — a post link, a
reel link, or one with `?igsh=…` tracking on the end all work, because only the
shortcode is kept.

Only the reference is stored. The picture, caption and like count stay on
Instagram and are pulled in by their embed script when the page renders, so a
caption edited on the phone is edited on the website too, and no image is ever
re-uploaded here.

- The wall renders the **first 8 active** posts, in the order shown. Reorder with
  ↑/↓, take one down with **Hide**.
- Adding a post puts it at the **front** — the newest post is usually the one
  worth showing first.
- With nothing curated, the homepage falls back to a built-in starter list
  (`DEFAULT_POSTS` in `src/lib/instagram.js`), so the section is never an empty
  box.
- A post that is later deleted on Instagram degrades to a "View this post on
  Instagram" card rather than a hole. Swap it out here when you notice.

The homepage is statically rendered and **revalidates hourly**, so a change here
appears on the live site within the hour rather than instantly.
