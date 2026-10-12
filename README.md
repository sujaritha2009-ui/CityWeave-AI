# CityWeave AI

Institutional traffic coordination for smarter, smoother cities. CityWeave AI helps colleges, hospitals,
government offices and other institutions coordinate their timings so fewer people reach the same junction
at the same time.

Google AI Builder Cup prototype · Pilot area: Moodbidri, Karnataka.

> **Prototype status:** all institutions, junctions and traffic counts are **sample data** served by a small
> Express API and saved to `backend/data/store.json`. Recommendations come from a transparent,
> deterministic arrival model, not from measured traffic outcomes.

## Run locally

Requires Node.js 18+.

```bash
npm install
npm run dev
```

`npm install` also installs the backend's dependencies, and `npm run dev` starts both the web app
(Vite, http://localhost:5173) and the API (http://localhost:4000). Vite proxies `/api` to the API, so open
http://localhost:5173. If the API is not running, the app shows an "API offline" banner with a Retry button.

Other scripts:

| Command             | Purpose                                   |
| ------------------- | ----------------------------------------- |
| `npm run dev:web`   | Web app only                              |
| `npm run dev:api`   | API only (auto-reloads)                   |
| `npm run build`     | Type-check and production build (web)     |
| `npm run build:api` | Compile the API to `backend/dist`         |
| `npm run start:api` | Run the compiled API                      |
| `npm test`          | API tests                                 |
| `npm run lint`      | ESLint                                    |
| `npm run preview`   | Serve the production web build            |

Set `VITE_API_URL` to point the web app at an API on another host. The API honours `PORT` (default 4000)
and `DATA_FILE` (default `backend/data/store.json`).

## API

| Method & path                          | Purpose                                   |
| -------------------------------------- | ----------------------------------------- |
| `GET /api/health`                      | Health check                              |
| `GET /api/data`                        | Everything the web app needs in one call  |
| `POST /api/data/reset`                 | Restore the Moodbidri sample data         |
| `GET/POST /api/institutions`           | List / add institutions (validated)       |
| `GET/PUT/DELETE /api/institutions/:id` | Read / update / delete an institution     |
| `GET /api/junctions`, `/:id`, `/:id/stats` | Junctions and their traffic stats     |
| `GET /api/observations`                | Sample traffic counts                     |
| `GET /api/recommendations`             | Recommendations                           |
| `POST /api/recommendations/generate`   | Run the engine and replace drafts         |
| `POST /api/recommendations/:id/review` | Approve or reject a draft                 |
| `GET /api/schedule-versions`           | Approved schedule history                 |
| `GET /api/insights`, `/api/volume`, `/api/model` | Key insight, volume chart, model assumptions |

## Tech stack

React 18 · TypeScript · Vite · Tailwind CSS v4 · React Router · Leaflet + OpenStreetMap (react-leaflet) ·
Recharts · lucide-react icons · Express API (Node.js, TypeScript).

## Pages

| Route                          | Page                | What it does |
| ------------------------------ | ------------------- | ------------ |
| `/`                            | Landing             | Introduces CityWeave AI, its features and the user flow. |
| `/app`                         | Dashboard           | Summary metrics, all-junction traffic chart, junction congestion list, pending recommendations. |
| `/app/map`                     | Traffic Map         | OpenStreetMap with congestion-coloured junctions and institution markers; search and congestion filters; junction popups. |
| `/app/junctions/:id`           | Junction Details    | Peak period, nearby institutions, 15-minute vehicle counts, estimated delay and common issues. |
| `/app/institutions`            | Institutions        | Search, filter, view on map, edit and delete institutions. |
| `/app/institutions/new`, `/:id/edit` | Add / Edit Institution | Validated form with a click/drag map location picker; nearest junction is auto-selected. |
| `/app/recommendations`         | Recommendations     | Key insight, "Generate New Recommendations", and approve/reject review queue. |
| `/app/compare`                 | Schedule Comparison | Current vs recommended operating hours (Gantt) and modelled arrival distribution. |
| `/app/reports`                 | Reports             | KPIs, observed vs estimated volume chart, assumptions, data sources; "Download Report" prints to PDF. |
| `/app/settings`                | Settings            | Stored-data summary and "Reset sample data". |

## How recommendations work

`shared/recommendationEngine.ts` (used by the API; the web app imports the same file for charts):

1. Each institution's daily arrivals are spread over the 45 minutes before its start time (and departures
   over the 45 minutes after its end time) in 15-minute buckets.
2. For each junction, the engine finds the busiest bucket.
3. It greedily tries shifting flexible institutions by ±15 / ±30 minutes (within each institution's stated
   flexibility) and keeps the shift that lowers the junction peak the most.
4. Each accepted shift becomes a **draft** recommendation with a plain-language rationale and an estimated
   peak reduction.

Coordinators then **approve** or **reject** each draft. Approving records a new schedule version; the
original schedule is kept for comparison. All estimates are labelled "Estimated, not measured" and the
Reports page lists every model assumption.

## Project structure

```
shared/                   types, Moodbidri sample data, recommendation engine, traffic stats, time helpers
                          (one copy, imported by both the web app as `@shared/...` and the API)
backend/
  src/                    Express app, validation, JSON file store, tests
  data/store.json         saved data (created on first run, not committed)
src/
  App.tsx                 routes
  data/                   API client and the store that loads/saves through it
  lib/                    UI helpers
  layouts/                public layout and app shell (sidebar + header)
  components/common/      Card, Button, badges, MetricCard, EmptyState, EstimateNotice
  components/map/         CityMap and LocationPicker (Leaflet)
  pages/                  one file per page
```

## Commit messages

`npm install` sets `core.hooksPath` to `.githooks`. Its `commit-msg` hook removes editor-added
`Co-authored-by: Cursor` trailers, and a GitHub Actions check (`.github/workflows/commit-check.yml`) fails
any push that still contains one.

## Future work

- **Firestore** persistence: swap the JSON file store in `backend/src/store.ts` for Firestore (the web app only talks to the API).
- **Gemini** explanation endpoint: a secure server-side function that turns engine output into richer explanations (the API key must never be in the frontend).
- **Google Routes API**: traffic-aware journey-time estimates for affected corridors.
- **Firebase Authentication**: role-based access so only an institution's coordinator can approve its changes.
- Field data entry for traffic counts, replacing sample observations.

## Map attribution

Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors. The public OSM tile servers
are best-effort and subject to the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/);
use a dedicated tile provider for production.
