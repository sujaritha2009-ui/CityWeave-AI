import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertCircle, ArrowLeft, Clock, Timer, Users } from "lucide-react";
import { CityMap } from "../components/map/CityMap";
import { Badge, Card, EmptyState, MetricCard, PageHeader } from "../components/common/ui";
import { useStore } from "../data/useStore";
import { INSTITUTION_TYPES } from "../lib/institutionMeta";
import { formatTime, toMinutes } from "../lib/time";
import { CONGESTION_STYLES, institutionsNear, junctionStats } from "../lib/traffic";

export function JunctionDetailsPage() {
  const { id } = useParams();
  const { junctions, institutions, observations } = useStore();
  const junction = junctions.find((j) => j.id === id);

  const focus = useMemo<[number, number] | undefined>(() => (junction ? [junction.lat, junction.lng] : undefined), [junction]);

  if (!junction) {
    return (
      <EmptyState
        title="Junction not found"
        action={<Link to="/app/map" className="font-semibold text-primary">Back to the map</Link>}
      />
    );
  }

  const stats = junctionStats(junction.id, observations);
  const nearby = institutionsNear(junction, institutions).sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  const series = observations
    .filter((o) => o.junctionId === junction.id)
    .sort((a, b) => toMinutes(a.time) - toMinutes(b.time));

  return (
    <>
      <Link to="/app/map" className="no-print mb-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
        <ArrowLeft className="h-4 w-4" /> Traffic map
      </Link>
      <PageHeader
        title={junction.name}
        description="Local traffic context for schedule recommendations."
        actions={
          stats && (
            <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${CONGESTION_STYLES[stats.congestion].badge}`}>
              {CONGESTION_STYLES[stats.congestion].label}
            </span>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Peak period"
          value={stats ? `${formatTime(stats.peakStart)}` : "—"}
          hint={stats ? `until ${formatTime(stats.peakEnd)} · ${stats.peakCount} vehicles / 15 min` : "Insufficient data"}
          icon={<Clock className="h-4 w-4" />}
        />
        <MetricCard label="Nearby institutions" value={nearby.length} icon={<Users className="h-4 w-4" />} tone="purple" />
        <MetricCard
          label="Avg. delay (estimated)"
          value={`${junction.avgDelayMinutes[0]}–${junction.avgDelayMinutes[1]} min`}
          hint="From field notes; not a measured travel-time study."
          icon={<Timer className="h-4 w-4" />}
          tone="amber"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="p-4">
          <CityMap
            junctions={[junction]}
            institutions={nearby}
            observations={observations}
            focus={focus}
            zoom={16}
            className="h-80"
            showPopups={false}
          />
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Vehicles per 15 minutes</h2>
            <Badge tone="gray">{stats?.hasFieldData ? "Field observations" : "Sample observations"}</Badge>
          </div>
          {series.length ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer>
                <BarChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="time" tickFormatter={formatTime} interval={7} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={(t) => formatTime(String(t))} />
                  <Bar dataKey="vehicleCount" name="Vehicles" fill="#1677f8" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">Insufficient data: no observations for this junction.</p>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold">Nearby institutions</h2>
          {nearby.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No institutions are linked to this junction yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {nearby.map((i) => {
                const meta = INSTITUTION_TYPES[i.type];
                const Icon = meta.icon;
                return (
                  <li key={i.id} className="flex items-center gap-3 py-3">
                    <span className={`rounded-lg p-2 ${meta.tile}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{i.name}</p>
                      <p className="text-xs text-muted">
                        {formatTime(i.startTime)} – {formatTime(i.endTime)} · ~{i.dailyArrivals.toLocaleString()} arrivals/day
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">Common issues</h2>
          <ul className="mt-3 space-y-2">
            {junction.commonIssues.map((issue) => (
              <li key={issue} className="flex items-start gap-2 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                {issue}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
