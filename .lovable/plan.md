
# Plan: Make OSM Copy Checking App Fully Dynamic with Lovable Cloud

Goal: replace every mock in `src/lib/api/*.ts` with real Postgres queries, real Supabase auth, real file storage, and real role-based access — all hosted on Lovable Cloud. No more hardcoded data.

---

## 1. Enable Lovable Cloud

Turn on Lovable Cloud for this project. This provisions:
- Postgres database
- Supabase Auth (email/password + Google sign-in)
- Storage buckets
- Server functions runtime (already on TanStack Start)

---

## 2. Database schema (Postgres migrations)

### Auth & roles
- `profiles` — `id (uuid, FK auth.users)`, `full_name`, `email`, `college_code`, `phone`, `created_at`
- `app_role` enum — `admin | manager | faculty | student`
- `user_roles` — `id`, `user_id`, `role` (separate table — required for security, never on profiles)
- `has_role(user_id, role)` SECURITY DEFINER function (prevents recursive RLS)

### Master data (12 modules — single normalized design)
- `degrees`, `branches`, `semesters`, `subjects`, `colleges`, `regions`, `exam_sessions`, `question_papers`, `marking_schemes`, `faculty_profiles`, `students`, `evaluation_rules`
  - Each: `id`, name fields, FKs, `is_active`, `created_at/updated_at`

### Question structure
- `questions` — `id`, `paper_id`, `q_no`, `parent_id` (nullable, for sub-questions), `max_marks`, `text`

### Answer scripts & allocation
- `answer_scripts` — `id`, `script_code`, `student_id`, `paper_id`, `subject_id`, `pdf_url`, `status (pending|in_progress|evaluated|rejected|submitted)`, `assigned_to (faculty user_id)`, `assigned_at`, `submitted_at`
- `script_scores` — `id`, `script_id`, `question_id`, `marks`, `is_na`, `is_nr`, `remarks`, `evaluated_by`, `updated_at`
- `script_rejections` — `id`, `script_id`, `reason`, `rejected_by`, `created_at`
- `evaluation_audit` — `id`, `script_id`, `actor_id`, `action`, `payload jsonb`, `created_at`

### RLS policies (per table)
- Admin: full access via `has_role('admin')`
- Manager: read all, write within region
- Faculty: read/write only scripts where `assigned_to = auth.uid()`
- Student: read-only own results

---

## 3. Storage buckets

- `answer-scripts` (private) — uploaded PDFs
- `bulk-uploads` (private) — CSV files for bulk script ingest
- `avatars` (public) — profile pictures

RLS policies: faculty can read only PDFs of scripts assigned to them; admin/manager full access.

---

## 4. Auth wiring

- Replace mock `src/lib/api/auth.ts` + `auth-context.tsx` with Supabase auth
- `/login` page: email + password + Google sign-in
- Sign-up trigger creates `profiles` row + default `student` role; admins promote roles from a Users admin page
- `/reset-password` page (required by Lovable auth rules)
- Convert `RoleGate` + route guards to use `_authenticated` layout pattern with `beforeLoad` + role check via `has_role` (server function)

---

## 5. Server functions (`src/server/*.functions.ts`)

Replace each mock module 1:1:

| File | Functions |
|---|---|
| `dashboard.functions.ts` | `getDashboardStats`, `getDateWiseEvaluation`, `getTimeWiseEvaluation` (real aggregates) |
| `masters.functions.ts` | `listMaster(name)`, `upsertMaster`, `deleteMaster` (admin-only) |
| `scripts.functions.ts` | `listMyScripts`, `getScript`, `saveScores` (autosave), `submitScript` (with validation), `rejectScript` |
| `allocation.functions.ts` | `listAllocationFaculty`, `allocateScripts` (round-robin / load-balanced), `bulkUploadScripts` (parses CSV from storage) |
| `reports.functions.ts` | `getFacultyProgress`, `exportReportCSV` |
| `students.functions.ts` | `getStudentResults` |

All server functions:
- Use `requireSupabaseAuth` middleware
- Validate input with Zod
- Enforce role checks via `has_role()`
- Return typed shapes matching existing TS types in `src/types/index.ts` (so UI keeps working)

---

## 6. UI changes (minimal — keep current screens)

- Swap every `import { ... } from "@/lib/api/..."` to call the new server functions via `useServerFn` / route loaders
- Add `_authenticated` layout route + role-gated sublayouts (`_authenticated/_admin`, `_authenticated/_faculty`)
- Bulk upload page: upload CSV → storage → call server fn to ingest + auto-allocate
- Evaluation page: keep all existing rules (NA/NR, 0.5 increments, mandatory rules dialog, autosave) but persist to DB
- Add a small **Users & Roles** admin page (assign roles to signed-up users)

---

## 7. What you (the user) need to do

1. Approve this plan → I enable Lovable Cloud
2. After cloud is up, the app will require sign-up. First user → I'll mark you as `admin` so you can create masters, faculty, students, etc.
3. (Optional) If you want Google sign-in, no extra setup needed — it works out of the box on Lovable Cloud.

---

## 8. Out of scope (not doing)

- PHP / CodeIgniter / MySQL (platform doesn't support them)
- Migrating data from any existing system (no source data provided)
- SMS/email notifications (can be added later)

---

## Delivery order

1. Enable Cloud + schema migrations + RLS + roles function
2. Auth (login, signup, reset, role assignment, guards)
3. Masters CRUD wired to DB
4. Students + answer scripts + storage + bulk upload + allocation
5. Faculty evaluation persistence (scores, autosave, submit, reject)
6. Dashboard + reports real aggregates
7. Smoke test each role end-to-end

After approval I switch to build mode and execute step by step.
