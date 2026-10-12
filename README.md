# CityWeave AI

Institutional traffic coordination for smarter, smoother cities. CityWeave AI helps colleges, hospitals,
government offices and other institutions coordinate their timings so fewer people reach the same junction
at the same time.

Google AI Builder Cup prototype · Pilot area: Moodbidri, Karnataka.

> **Prototype status:** this is a frontend-only MVP. All institutions, junctions and traffic counts are
> **sample data** stored in your browser's `localStorage`. Recommendations come from a transparent,
> deterministic arrival model, not from measured traffic outcomes.

## Run locally

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Open the URL printed by Vite (default http://localhost:5173).

Other scripts:

| Command           | Purpose                          |
| ----------------- | -------------------------------- |
| `npm run build`   | Type-check and production build  |
| `npm run lint`    | ESLint                           |
| `npm run preview` | Serve the production build       |

## Tech stack

React 18 · TypeScript · Vite · Tailwind CSS v4 · React Router · Leaflet + OpenStreetMap (react-leaflet) ·
Recharts · lucide-react icons.

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

`src/lib/recommendationEngine.ts`:

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
src/
  App.tsx                 routes
  data/                   types, Moodbidri sample data, localStorage store
  lib/                    recommendation engine, traffic stats, time helpers
  layouts/                public layout and app shell (sidebar + header)
  components/common/      Card, Button, badges, MetricCard, EmptyState, EstimateNotice
  components/map/         CityMap and LocationPicker (Leaflet)
  pages/                  one file per page
```

## Future work

- **Firestore** persistence: replace `src/data/store.tsx` with Firestore reads and writes (the page components only use `useStore()`).
- **Gemini** explanation endpoint: a secure server-side function that turns engine output into richer explanations (the API key must never be in the frontend).
- **Google Routes API**: traffic-aware journey-time estimates for affected corridors.
- **Firebase Authentication**: role-based access so only an institution's coordinator can approve its changes.
- Field data entry for traffic counts, replacing sample observations.

## Map attribution

Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors. The public OSM tile servers
are best-effort and subject to the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/);
use a dedicated tile provider for production.
