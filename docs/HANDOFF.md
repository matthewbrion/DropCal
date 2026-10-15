# DropCal handoff

Last updated 2026-10-15.

Patient eye-drop adherence app. Patients log doses against a prescribed taper; doctors
assign protocols and see adherence. Node/Express + raw `pg`, React + Vite + Tailwind v4.
Capstone is submitted and graduated — development continues by choice, so there is no
reason to cut corners for time.

## Where the code is

| Branch | State |
|---|---|
| `main` | `331f342`. Deployed. Everything through the timezone work. |
| `feature/ui-refinements` | Pushed, **PR open and unmerged**. Five commits: banner hierarchy, cap colours, My Routine. |
| `dev` | Old brand branch, fully merged into main. Safe to delete. |
| `feature/dose-history`, `feature/physician-patients`, `feature/physician-view`, `feature/patient-timezone` | All merged. Safe to delete. |

**Watch the merge style.** PR #14 was squash-merged and silently left three commits behind
on `main`; the physician work was missing from the live site for a week before anyone
noticed. Use merge commits, and check `git log origin/main..<branch>` is empty afterwards.

## Deployment

- **API** on Render (free tier, sleeps after ~15 min idle, cold start up to a minute)
- **Frontend** on Netlify, `client/public/_redirects` proxies `/api/*` to Render so the
  browser sees one origin and the login cookie stays first-party
- **Postgres** on Render. `.env` holds the *external* URL and needs `?sslmode=require`
  appended for anything run locally; the deployed service uses the internal URL
- Reseed with `node db/seed.js` (wipes and rebuilds; seed dates are relative to today)

## What exists

**Patient:** register/login, Home (today's doses, log and undo, cap colour per medication),
My Routine (upcoming / in progress / completed courses, each with its drops and daily log),
Profile (appearance).

**Doctor:** My Patients list with today's adherence, patient profile with their full dose
history, assign a stock protocol by patient email or from the profile.

**Schema:** `users` (role, timezone), `drug_classes` (AAO cap colours, patient-facing
labels), `medications` (name / strength / brand_name / form / drug_class_id),
`protocols`, `protocol_weeks` (week, medication, eye, frequency), `patient_protocols`,
`dose_logs` (unique on patient_protocol + date + week + dose index).

**67 tests across 9 files**, run against a real Postgres that they reseed. Currently they
point at Render via `.env`, which means `npm test` wipes the deployed database and takes
~90 seconds. Pointing tests at a local database is an open task.

## Decisions worth not re-litigating

- **The browser never asserts identity or dates.** It sends `protocol_week_id`; the server
  derives the patient from the cookie and the date from the patient's stored timezone.
- **Dates come from the patient's timezone**, stored on `users.timezone`, captured from the
  browser at registration and validated before storage. The server runs in UTC on Render;
  a dose logged at 9pm Eastern used to land on tomorrow.
- **Ownership checks live in SQL**, not in route guards, so a new route cannot forget them.
- **Cap colours are facts about a physical bottle**, so they do not change between light and
  dark themes. Every swatch has a ring so a white cap stays visible.
- **Hierarchy rule:** at the top of a screen, status leads (Home's banner); inside a list,
  identity leads (medication name, course name, patient name).
- **Logging lives only on Home.** My Routine deliberately carries no dose instructions, so
  there is never a question of where to log.

## Open items

1. **`pg.Pool` instead of `pg.Client`** — every request shares one connection, so they
   queue. The `/me/routine` route had to be made sequential because of it. Small change,
   wide blast radius (seed, tests, server), deserves its own branch.
2. **README** — the biggest gap for anyone arriving cold.
3. **Single drop on the Home banner** looks odd when a patient is down to one dose a day.
4. **Timezone selector on Profile** — a patient who moves cannot fix their zone.
5. **Nav touch targets** are ~40px, under the 44pt minimum.
6. **`.github/workflows/test.yml` is nested inside `test/`**, so GitHub never runs it.
7. **Tests point at the deployed database** (see above).
8. **`docs/DESIGN.md` is empty.**

## Working rules

- He writes his own code from reviewed snippets by default. Direct edits only when he asks,
  and that permission does not carry to the next task.
- **Never commit for him.** Stop at each milestone, report what changed and what was
  verified, let him run the commit.
- Every snippet names the file *and* the exact place (line number, what it goes after).
- Byte accounting on every file change: record size before, predict the delta, confirm
  after, and check nothing unplanned moved.
- No `Co-Authored-By` or "Generated with Claude Code" lines, ever.
- Conversation before plans: for anything new, talk through the shape first.
- Match his style — four-space indent, plain function declarations, simple patterns.
- Stop preview servers as soon as a check is done, and confirm the port is free.
