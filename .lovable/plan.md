
# Goal

Make every page fully functional end-to-end so you can ship today: fix the broken Save buttons on Master pages, add real PDF upload + viewer for answer scripts, export the evaluation audit, harden security/UX for production, and polish the demo-data seeder.

---

## 1. Fix "Save" not working on Master pages (root cause)

The Master form sends a `description` field to every table, but none of the master tables (`degrees`, `branches`, `subjects`, `colleges`, `regions`, `semesters`, `exam_sessions`, `evaluation_rules`, `faculty_profiles`, `question_papers`) have a `description` column → Supabase rejects the insert/update silently in the UI. Also `faculty_profiles` / `question_papers` need extra fields the UI doesn't expose, and the form lacks any try/catch so errors never surface as toasts.

Changes:
- `src/lib/api/masters.ts`
  - Stop sending `description` (table doesn't have it). Keep schema as-is.
  - For `faculty_profiles`: also accept `email`, `phone`, `college_id`.
  - For `question_papers`: accept `subject_id`, `exam_session_id`, `total_marks`.
  - For `evaluation_rules`: accept `title`, `body`.
  - For `subjects`: accept `branch_id`, `semester_id`.
  - For `branches`: accept `degree_id`.
  - For `colleges`: accept `region_id`.
  - Throw clean Error messages so the UI can toast them.
- `src/routes/_app.master.$name.tsx`
  - Wrap `onSave` / `onDelete` in try/catch and `toast.error(err.message)`.
  - Render module-specific extra inputs (e.g. faculty → email/phone/college dropdown; question paper → subject/exam-session/total marks; subject → branch/semester; branch → degree; college → region).
  - Hide the "Description" field globally (since DB doesn't store it) — replace with module-specific fields above.
  - Drop `description` from `MasterRecord` type or mark as derived/optional + ignored.

## 2. PDF upload flow (real files into storage)

Storage bucket `answer-scripts` already exists (private). Add an upload UI in OSM → Allocation that uploads one or many PDFs, creates one `answer_scripts` row per file pointing to its storage path, and optionally auto-allocates.

Changes:
- New SQL migration: storage RLS policies for `answer-scripts` bucket
  - Admin/manager can `INSERT`, `SELECT`, `UPDATE`, `DELETE`.
  - Faculty can `SELECT` files whose owning script row is `assigned_to = auth.uid()`.
  - Students can `SELECT` files whose owning script is `submitted` and belongs to them.
- `src/lib/api/scripts.ts`
  - `uploadScriptPdf(file: File, paperId: string)` → uploads to `answer-scripts/{paperId}/{uuid}.pdf`, inserts row with `pdf_url = path`, returns the row.
  - `getSignedPdfUrl(pdfPath: string)` → returns a 1-hour signed URL.
- `src/routes/_app.osm.allocation.tsx`
  - Replace the "Bulk Upload (count)" stub with a real `<input type="file" multiple accept="application/pdf">` plus a paper picker (loaded from `question_papers`).
  - On upload: progress toast per file, final summary, then call `allocateScripts` if a faculty selection exists.

## 3. Wire the PDF viewer

`src/routes/_app.evaluate.$scriptId.tsx` currently renders `pageImages[]` of SVG placeholders. Replace with a real PDF viewer:

- Add dependency: `@react-pdf-viewer/core` + `@react-pdf-viewer/default-layout` + `pdfjs-dist` (or use a simple `<iframe src={signedUrl}>` for zero-dep reliability — preferred for today's deadline).
- `src/lib/api/scripts.ts → getScript`: when `pdf_url` exists, also call `getSignedPdfUrl` and return it on the script as `pdfUrl`.
- Update `AnswerScript` type with `pdfUrl?: string`.
- In Evaluate page: if `script.pdfUrl` → render `<iframe className="w-full h-full" src={script.pdfUrl} title="Answer Script" />` inside the existing canvas frame; otherwise fall back to the placeholder grid.
- Keep zoom/pan controls disabled when the iframe is used (browser PDF viewer has its own).

## 4. Export evaluation audit

`evaluation_audit` table already records `save_scores`, `submit`, `reject` actions.

Changes:
- `src/routes/_app.reports.tsx`
  - Add a second "Export evaluation audit (CSV)" button.
  - Query `evaluation_audit` joined with `profiles` (actor name) and `answer_scripts` (script_code), order by `created_at desc`, download as CSV with columns: When, Actor, Action, Script, Payload.

## 5. Harden production-readiness

- **Leaked-password protection**: enable `password_hibp_enabled` via the auth config tool.
- **handle_new_user trigger**: confirm it's attached to `auth.users` (was added previously); if missing, recreate.
- **Validation**: in masters API, trim + lower-case `code`, enforce non-empty.
- **Empty states & error toasts**: every async action wraps in try/catch with `toast.error(err.message)`. Add the same to OSM allocation, faculty list, dashboard.
- **Loading skeletons**: show a `Skeleton` row while master/faculty tables load (small polish, prevents "blank page" perception).
- **Run Supabase linter** at the end and fix any new warnings introduced by storage policies / migrations.

## 6. Demo-data seeder fixes

- Update `src/lib/api/seed.ts` to also seed:
  - One `faculty_profiles` row pointing to a real user (the current admin) so allocation has a target.
  - One demo student row (optional).
- Surface per-step messages in the toast (it already does — keep behaviour, add sample faculty creation).
- Idempotency: keep `getOrCreate` by `code` so re-running is safe.

---

## Technical notes

- All DB writes go through `supabase` client with RLS; the current admin user (`pandeyvishwajeet61@gmail.com`) already has the `admin` role.
- New migration files needed: storage policies for `answer-scripts` bucket. No schema changes to existing tables.
- No new env vars or secrets required.
- PDF viewer: prefer `<iframe>` with signed URL — works in every browser, no extra deps, fast to ship. We can swap to `react-pdf` later for annotations.

## Out of scope for today

- Real on-PDF annotation persistence (pen strokes saved per page). The evaluator already saves marks per question, which is the production-critical data.
- Email notifications.
- Multi-evaluator moderation workflow.

After approval I'll implement everything in one pass and verify Save, PDF upload, viewer, audit export, and seeder all work against the live database.
