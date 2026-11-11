# Cover Manager

Tracks which staff have been used for cover, so the cover rota stays fair.
Cover is still set and sent to staff in Go4 School; this app is the record of
who was used, and the quickest way to see who should be next.

## How it works

- **Set cover** (`/`): pick a day. Each period lists the staff on the rota for it.
  Anyone who has already covered this week is greyed out (the once-a-week rule).
  Everyone else is sorted fairest-first: fewest covers this academic year, then
  longest since their last cover. "Use" logs the cover; "Use someone else…"
  logs anyone, with a warning if they are off-rota or already used this week.
- **This week** (`/week`): the week's covers on a grid, who is still unused,
  and anyone used twice. The week resets every Monday: nothing is deleted,
  the app just looks at dates from Monday to Sunday.
- **History** (`/history`): totals per person over any date range, covers per
  week, a page per person, and a CSV download.
- **Extra options**: under each period, "More free staff" lists people who are
  not on the rota for that slot but are free according to the master timetable
  (free in the current Week A/B, or in both weeks until you say which week it is).
- **Rota** (`/rota`): edit anyone's slots, add or deactivate staff, or upload a
  new rota spreadsheet or master timetable. Uploading shows what will change before saving and
  never touches cover history.

One rota serves both Week A and Week B: every slot is a period the person is
free in both weeks.

## Setup

1. Create a Supabase project. Run `supabase/migrations/*.sql`, then
   `supabase/seed.sql` (the current rota) in the SQL editor, or use
   `supabase db push` and `supabase db seed`.
2. In Supabase Auth, turn off sign-ups, add a user with email + password, and
   give that email access:
   `insert into allowed_users (email) values ('you@school.org');`
3. Copy `.env.example` to `.env.local` and fill in the Supabase URL and
   publishable (anon) key. Set the same variables in Vercel.
4. `npm install && npm run dev`

To rebuild the seed from a new spreadsheet:
`node --experimental-strip-types scripts/make-seed.ts rota.xlsx [timetable.xlsx] > supabase/seed.sql`
(or just upload it on the Rota page).

## Checks

`npm test` (rota parsing, week reset and fairness ordering), `npm run typecheck`, `npm run build`.
