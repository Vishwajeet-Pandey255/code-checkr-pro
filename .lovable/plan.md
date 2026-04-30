# Copy Checking (OSM) — Frontend UI Clone

A pixel-and-flow clone of the IntelliExams Online Script Marking system, built as a React frontend only. All data comes from a mock API layer (`src/lib/api/`) that returns Promises — you swap each function's body to call your PHP/CodeIgniter endpoints later, without touching components.

## Roles & Login

Mock login screen with role switcher (Admin, Regional Manager, Faculty, Student). Selected role is stored in `localStorage` and drives sidebar visibility and route guards. Each role lands on its own home:

- **Admin** → Dashboard + all modules
- **Regional Manager** → Dashboard + Allocation + Reports
- **Faculty** → "My Allocated Scripts" → Evaluation screen
- **Student** → "My Results" (read-only score sheet)

Note: this is UI-level gating only. Real auth must be enforced by your PHP backend.

## App Shell

- Collapsible left sidebar (shadcn) matching the IntelliExams module list: Degree, Branch, Program, Batch, Subject, College, Exam, QPDS, Question Paper, Faculty, OSM Reports → (DashboardCharts, Reports, Reports Authorization), OSM → (Evaluation Type, Data Movement, Publish, Centralized Answer Script Allocation, Centralized Deallocation, Null/Void Answer Scripts, Rechecking), Configuration Management, Users.
- Top header with breadcrumbs, language toggle (EN), dark-mode toggle, fullscreen, profile avatar.
- All non-essential modules render a clean "Module" placeholder page so the sidebar feels complete.

## Screens (built in detail)

### 1. Dashboard Charts (`/dashboard`)
- Filter row: Program / Branch dropdowns
- "Over All Evaluation Details" data table (Evaluated, Partially, Pending, Allocated, Rejected)
- Donut chart: Pending / Allocated / Partially Evaluated / Evaluated / Rejected scripts (recharts)
- "Date Wise Evaluation Details" bar chart
- "Time Wise Evaluation Details" area chart

### 2. Centralized Answer Script Allocation (`/osm/allocation`)
- Cascading filters: Exam Cycle → Exam Series → Subject → Evaluation Type
- Summary stat cards: Total / Allocated / Evaluated / Partial / Rejected / Pending
- Faculty table with checkbox selection (Faculty, College Code, College Name, Type, Experience, Evaluated/Allocated/Partial/Rejected/Pending counts)
- Action bar: Apply Dynamic Allocation, Allocate, Close
- Bulk-upload + auto-allocate dialog: drag-drop ZIP/PDF, pick distribution rule (round-robin / by experience / equal), preview, confirm

### 3. Faculty Evaluation Screen (`/evaluate/$scriptId`) — the core screen
Layout matches your screenshot:
- Top bar: Subject, Start Time, Time Taken (live timer), Total Pages, buttons Question Paper / Answer Key / Save
- **Left pane (~70%)**: scanned page viewer with zoom, pan, page number jump, prev/next, brush color picker
- Annotation toolbar: zoom, tick (✓), cross (✗), pen, doubt (?), undo — drawn on a canvas overlay
- **Right pane (~30%)**:
  - Marks header (Marks: x / 60, Questions: n / 15)
  - Question grid (Q1A, Q1B, Q2A… Q9B) with editable score boxes "/max", NA / NR toggles
  - Submit / Reject buttons
  - Question text preview ("(a) Explain why data independence…") with "view…"
  - "Enter page number" jump
- Submit confirmation modal → navigates to score-tree summary

### 4. Evaluation Summary / Score Tree (`/evaluate/$scriptId/summary`)
Tree view exactly like screenshot 1:
```
─ Section A
  ├ Q3 : 3 / 6 ✓
  ├ Q4 : 3 / 6 ✓
  ├ Q5 : 2 / 6 ✗
  ├ Q1A
  │  ├ Q1A : 2 / 3 ✓
  │  └ Q1B : 2.5 / 3 ✓
  └ Q2B …
─ Section B …
─ Section C …
```
Side card with Max Marks vs Obtained Marks, "Continue Evaluation" CTA.

### 5. Faculty — My Allocated Scripts (`/my-scripts`)
Table of scripts assigned to logged-in faculty with status chips, "Start" / "Resume" / "View" actions.

### 6. Master Data Modules (CRUD pattern, one shared template)
Built for: Degree, Branch, Program, Batch, Subject, College, Faculty, Users, Exam Cycle, Exam Series, Question Paper, Evaluation Type.
Each module = list page (search, filters, pagination, add/edit/delete dialogs, CSV export button). Forms use react-hook-form + zod.

### 7. OSM Reports (`/reports`)
- Report selector (Evaluation Summary, Faculty-wise, College-wise, Date range)
- Filter form, results table, Export to CSV/PDF buttons (CSV works client-side; PDF stub)

### 8. Student Results (`/results`)
Read-only version of the score tree for the logged-in student.

## Mock data & API layer

`src/lib/api/` holds one file per resource (`scripts.ts`, `faculty.ts`, `allocation.ts`, `dashboard.ts`, `masters.ts`, `auth.ts`). Each exports async functions returning typed mock data with realistic delay. Your PHP migration = replace function bodies with `fetch('/api/...')` calls. Types live in `src/types/`.

A README in `src/lib/api/README.md` will document the exact endpoint shape each function expects so your CodeIgniter controllers can match it 1:1.

## Tech notes (for your developer)

- TanStack Start (React 19 + TypeScript), file-based routes under `src/routes/`
- shadcn/ui + Tailwind v4 (already set up)
- recharts for all charts
- react-hook-form + zod for forms
- Canvas overlay for annotation tools (HTML5 canvas, exports JSON of strokes per page)
- All API calls isolated in `src/lib/api/` for easy backend swap
- No database, no server functions used — pure SPA-style frontend
- Color theme tuned to IntelliExams (white surfaces, slate text, teal/green accents)

## Out of scope (this build)

- Real authentication (mock only — your PHP handles it)
- Real file storage for scanned PDFs (uses sample images)
- Live PHP integration (you'll wire endpoints after export)
- Email notifications, audit logs, rechecking workflow details

## Deliverables

1. Full React UI matching the screenshots
2. Mock API layer with documented endpoint contracts
3. README with: route map, role matrix, and exact JSON shapes your CodeIgniter API must return
4. Export the project from Lovable → drop into your PHP project's `public/` folder, point CodeIgniter API routes at `/api/*`, done.