# Project Log

## Closed
--
1. dose_logs.protocol_week_id exists so a checked dose aligns to a specific medication (weeks can have >1 med)
2. Hashing happens in the caller, not in createUser
3. RETURNING does not use * on user
4. Registration hardcodes role 'patient' (will come back to this later time-permitting)
5. Seed-only inserts are inline until a route needs one
6. protocol_weeks is an array of objects, one week can hold multiple medications with different frequencies
7. app.js = main, server.js holds listener
8. seed start_date = today - 16 days (this makes it look like it's a protocol in progress with visible history)
9. seed idempotency using TRUNCATE, RESTART IDENTITY, and CASCADE (only applies to dev data not real user data)
10. updated schema from pitch doc, if there are multiple medications in 1 week dose_logs.protocol_week_id allows medications to be checked off independently
11. updated from pitch doc DELETE on ../history is broken and moved to .../log
12. UNIQUE on dose_logs makes check/uncheck idempotent
13. JWT delivered via httpOnly (not stored locally or in state, unreadable by JS = secure and persists across refresh)
    https://expressjs.com/en/resources/middleware/cookie-parser/
14. updated token expiry to 30d with above security and avg protocol length equal to 4 weeks (minimize user friction)
15. committed jwt payload to {id, role}
16. protected routes have 1 parent (scalable with more additions)

## Open Items
--
1. POST /api/patient-protocols checks doctor_id has role ='doctor' but doesn't check the requestor's role