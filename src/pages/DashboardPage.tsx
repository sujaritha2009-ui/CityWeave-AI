import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowRight, Building2, MapPin, Sparkles } from "lucide-react";
import { Badge, Card, EmptyState, MetricCard, PageHeader } from "../components/common/ui";
import { useStore } from "../data/useStore";
import { formatTime } from "@shared/time";
import { junctionStats, volumeSeries } from "@shared/traffic";
import { CONGESTION_STYLES } from "../lib/congestion";

export function DashboardPage() {
  const { institutions, junctions, observations, recommendations } = useStore();

  const drafts = recommendations.filter((r) => r.status === "draft");
  const stats = useMemo(
    () => junctions.map((j) => ({ junction: j, stats: junctionStats(j.id, observations) })),
    [junctions, observations],
  );
  const hotspots = stats.filter((s) => s.stats?.congestion === "high").length;
  const series = useMemo(
    () => volumeSeries(junctions.map((j) => j.id), institutions, observations, {}),
    [junctions, institutions, observations],
  );

  return (
    <>
      <PageHeader title="Dashboard" description="Overview of the Moodbidri pilot area." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Institutions registered" value={institutions.length} icon={<Building2 className="h-4 w-4" />} />
        <MetricCard label="Junctions monitored" value={junctions.length} icon={<MapPin className="h-4 w-4" />} tone="purple" />
        <MetricCard label="High-congestion hotspots" value={hotspots} icon={<AlertTriangle className="h-4 w-4" />} tone="amber" />
        <MetricCard label="Recommendations awaiting review" value={drafts.length} icon={<Sparkles className="h-4 w-4" />} tone="green" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Vehicles per 15 minutes, all junctions</h2>
            <Badge tone="gray">Sample observations</Badge>
          </div>
          {series.some((p) => p.observed > 0) ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer>
                <AreaChart data={series}>
                  <defs>
                    <linearGradient id="dashFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1677f8" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#1677f8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" tickFormatter={formatTime} interval={7} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={(t) => formatTime(String(t))} />
                  <Area type="monotone" dataKey="observed" name="Vehicles" stroke="#1677f8" strokeWidth={2} fill="url(#dashFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">Insufficient data: no traffic observations recorded yet.</p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">Junctions</h2>
          <ul className="mt-3 divide-y divide-line">
            {stats.map(({ junction, stats: s }) => (
              <li key={junction.id} className="flex items-center justify-between py-3">
                <div>
                  <Link to={`/app/junctions/${junction.id}`} className="text-sm font-semibold hover:text-primary">
                    {junction.name}
                  </Link>
                  {s && (
                    <p className="text-xs text-muted">
                      Peak {formatTime(s.peakStart)} – {formatTime(s.peakEnd)}
                    </p>
                  )}
                </div>
                {s && (
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${CONGESTION_STYLES[s.congestion].badge}`}>
                    {s.congestion}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Pending recommendations</h2>
          <Link to="/app/recommendations" className="flex items-center gap-1 text-sm font-semibold text-primary">
            Open recommendations <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {drafts.length === 0 ? (
          <EmptyState
            title="No recommendations awaiting review"
            description="Generate recommendations to find overlapping arrival windows and propose schedule shifts."
            action={
              <Link to="/app/recommendations" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
                Go to recommendations
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {drafts.slice(0, 3).map((r) => {
              const inst = institutions.find((i) => i.id === r.institutionId);
              return (
                <Card key={r.id} className="p-4">
                  <p className="font-semibold">{inst?.name ?? "Unknown institution"}</p>
                  <p className="mt-1 text-sm text-muted">
                    {formatTime(r.originalStart)} → <span className="font-semibold text-success">{formatTime(r.proposedStart)}</span>
                  </p>
                  <Badge tone="green" className="mt-2">−{r.estimatedPeakReductionPct}% est. peak</Badge>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
