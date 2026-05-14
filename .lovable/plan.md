## Goal

Add a complete **Question Paper + Marking Scheme** flow:
1. Admin uploads one Question Paper PDF and one Marking Scheme (PDF + structured per-question marks) **per Subject**.
2. Faculty sees a **"Question Paper" button** on the evaluation page that opens a pop-up dialog (same UX as the existing Rules dialog) with two tabs: **Question Paper PDF** and **Marking Scheme** (PDF + per-question max-marks table).

## Database changes (one migration)

Add nullable columns to `public.subjects`:
- `question_paper_url text` — signed PDF in `documents` bucket (path stored, signed at view time)
- `marking_scheme_url text` — signed PDF
- `marking_scheme jsonb` — structured `[{ q_no, max_marks, notes }]`
- `question_paper_uploaded_at`, `marking_scheme_uploaded_at` timestamps

Storage: reuse existing private `answer-scripts` bucket under prefix `subject-papers/{subject_id}/...` (admin RLS already covers it). No new bucket required.

RLS: existing `subjects read auth` already lets every authenticated user read these columns; admin write policy already exists. No policy changes needed.

## Admin UI — `/master/subjects` (`src/routes/_app.master.$name.tsx`)

When `name === "subjects"`, extend the row form/dialog with:
- **Upload Question Paper (PDF)** — file input → uploads to storage → saves path to `subjects.question_paper_url`
- **Upload Marking Scheme (PDF)** — same flow → `subjects.marking_scheme_url`
- **Structured marking scheme editor** — repeatable rows of `Q No | Max Marks | Notes`, persisted to `subjects.marking_scheme` jsonb
- Inline "View" / "Replace" / "Remove" actions for each uploaded file
- Show uploaded-at timestamp + filename

API helpers (extend `src/lib/api/masters.ts`):
- `uploadSubjectQuestionPaper(subjectId, file)`
- `uploadSubjectMarkingScheme(subjectId, file)`
- `saveMarkingSchemeStructured(subjectId, rows)`
- `getSubjectPaperSignedUrls(subjectId)` — returns 1-hour signed URLs

## Faculty UI — `/evaluate/$scriptId` (`src/routes/_app.evaluate.$scriptId.tsx`)

- Add a **"Question Paper"** button next to the existing **"Rules"** button in the header (same `variant="outline"`, `Info`/`FileText` icon).
- Clicking opens a `<Dialog>` with the same look & feel as the Rules dialog, containing two `<Tabs>`:
  - **Question Paper** — `<iframe>` of the signed URL with a "Download" + "Open in new tab" link, or a graceful empty state if not uploaded.
  - **Marking Scheme** — top: `<iframe>` of marking-scheme PDF (if any); bottom: structured table (`Q No | Max Marks | Notes`) read from `subjects.marking_scheme`.
- Resolve `subject_id` via `answer_scripts.subject_id` (already on the row); fetch once on mount and cache signed URLs for 1h.

## Files touched

- New migration: add 4 columns to `subjects`
- `src/lib/api/masters.ts` — upload + signed-URL helpers, structured scheme save
- `src/routes/_app.master.$name.tsx` — subjects-specific form extension (upload buttons + scheme editor)
- `src/routes/_app.evaluate.$scriptId.tsx` — header button + new dialog with tabs
- `src/integrations/supabase/types.ts` — auto-regenerated after migration

## Out of scope

- No new bucket, no public URLs (private + signed).
- No changes to existing rules dialog, scoring logic, or RLS.
- No per-exam-session variants (per-subject only, as you chose).

After approval I'll run the migration first, then make the code changes in one pass.