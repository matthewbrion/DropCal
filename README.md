# DropCal

Imagine grabbing lunch with a friend who can never tell you what they did since
you last saw them. If it’s just catching up, no big deal. But now that friend is
your patient, and what they can’t remember is whether or not they took their eye
medication after surgery. That’s happening in ophthalmology today. Patients are
sent home with a drop schedule and can’t reliably report back on it. My app lets
patients log in, see their schedule, and track their doses over time. This ensures
physicians get real data, and patients get a smoother recovery.

## Tech Stack
Node/Express, PostgreSQL, JWT auth, React + Vite

## Setup
1. `npm install`
2. Create `.env` with:
    - `DATABASE_URL`
    - `JWT_SECRET`
3. `psql -U postgres -f db/schema.sql`
4. `node db/seed.js`
5. `npm run dev`

## API

### Accounts
- `POST /api/auth/register` - sign up with your name, email, and a password.
- `POST /api/auth/login` - log in. keeps you signed in with a cookie, no token to manage yourself.
- `GET /api/auth/me` - checks who's logged in right now (keeping you logged in when you refresh the page).

### Your Routine
- `GET /api/patient-protocols/me` - pulls up your eye drop schedule (what to take, which eye, how often, and where you're at in your routine.  if your doctor hasn't set one up yet, expect an empty schedule not an error).

## Limitations
The redirect on protected routes is a UX guard, not a security boundary.  JWT handles server-side access control.