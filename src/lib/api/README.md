# Mock API Layer — PHP/CodeIgniter Integration Guide

All UI calls go through `src/lib/api/*.ts`. Each function returns a Promise of typed mock data. To wire your CodeIgniter backend:

1. Replace each function body with a `fetch()` call to your endpoint.
2. Match the JSON shape documented below.
3. Keep the function signatures and return types unchanged.

## Suggested REST endpoints (CodeIgniter routes)

| Function | Method | Endpoint |
|---|---|---|
| `login(email, password)` | POST | `/api/auth/login` |
| `getDashboardStats(filters)` | GET | `/api/dashboard/stats` |
| `getDateWiseEvaluation()` | GET | `/api/dashboard/date-wise` |
| `getTimeWiseEvaluation()` | GET | `/api/dashboard/time-wise` |
| `listFaculty(filters)` | GET | `/api/faculty` |
| `listAllocationFaculty(filters)` | GET | `/api/osm/allocation/faculty` |
| `allocateScripts(payload)` | POST | `/api/osm/allocation/allocate` |
| `bulkUploadScripts(formData)` | POST | `/api/osm/scripts/bulk-upload` |
| `listMyScripts(facultyId)` | GET | `/api/faculty/{id}/scripts` |
| `getScript(scriptId)` | GET | `/api/scripts/{id}` |
| `saveScores(scriptId, scores)` | POST | `/api/scripts/{id}/scores` |
| `submitScript(scriptId)` | POST | `/api/scripts/{id}/submit` |
| `rejectScript(scriptId, reason)` | POST | `/api/scripts/{id}/reject` |
| `listMaster(name)` | GET | `/api/master/{name}` |
| `upsertMaster(name, record)` | POST | `/api/master/{name}` |
| `deleteMaster(name, id)` | DELETE | `/api/master/{name}/{id}` |
| `getStudentResults(studentId)` | GET | `/api/students/{id}/results` |

See each `*.ts` file for the exact request/response shape.