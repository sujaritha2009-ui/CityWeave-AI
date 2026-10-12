import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Building2, Download, MapPin, Timer, TrendingDown } from "lucide-react";
import { Button, Card, EstimateNotice, MetricCard, PageHeader } from "../components/common/ui";
import { useStore } from "../data/useStore";
import { cx, inputClass } from "../lib/cx";
import { MODEL_ASSUMPTIONS, proposedShifts } from "../lib/recommendationEngine";
import { formatTime, toMinutes } from "../lib/time";
import { peakReductionPct, volumeSeries } from "../lib/traffic";

const RANGES = {
  morning: { label: "Morning (6 AM – 12 PM)", from: 6 * 60, to: 12 * 60 },
  afternoon: { label: "Afternoon & evening (12 – 8 PM)", from: 12 * 60, to: 20 * 60 },
  day: { label: "Full day (6 AM – 8 PM)", from: 6 * 60, to: 20 * 60 },
};
type RangeKey = keyof typeof RANGES;

export function ReportsPage() {
  const { institutions, junctions, observations, recommendations } = useStore();
  const [range, setRange] = useState<RangeKey>("morning");
  const [junctionId, setJunctionId] = useState("all");

  const activeRecs = recommendations.filter((r) => r.status !== "rejected");
  const shifts = useMemo(() => proposedShifts(recommendations), [recommendations]);
  const junctionIds = useMemo(
    () => (junctionId === "all" ? junctions.map((j) => j.id) : [junctionId]),
    [junctionId, junctions],
  );

  const series = useMemo(() => {
    const { from, to } = RANGES[range];
    return volumeSeries(junctionIds, institutions, observations, shifts).filter((p) => {
      const t = toMinutes(p.time);
      return t >= from && t < to;
    });
  }, [junctionIds, institutions, observations, shifts, range]);

  const reduction = peakReductionPct(series);
  const scopedRecs = activeRecs.filter((r) => junctionIds.includes(r.junctionId));
  const avgShift = scopedRecs.length
    ? Math.round(scopedRecs.reduce((s, r) => s + Math.abs(r.shiftMinutes), 0) / scopedRecs.length)
    : 0;
  const hasData = series.some((p) => p.observed > 0);
  const scopeLabel = junctionId === "all" ? "All junctions" : junctions.find((j) => j.id === junctionId)?.name;

  return (
    <>
      <PageHeader
        title="Traffic Impact Report"
        description={`${scopeLabel} · ${RANGES[range].label}`}
        actions={
          <>
            <select className={cx(inputClass, "w-52")} value={junctionId} onChange={(e) => setJunctionId(e.target.value)}>
              <option value="all">All junctions</option>
              {junctions.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </select>
            <select className={cx(inputClass, "w-60")} value={range} onChange={(e) => setRange(e.target.value as RangeKey)}>
              {Object.entries(RANGES).map(([key, r]) => (
                <option key={key} value={key}>
                  {r.label}
                </option>
              ))}
            </select>
            <Button onClick={() => window.print()}>
              <Download className="h-4 w-4" /> Download Report
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Peak traffic reduction"
          value={`${reduction}%`}
          hint="Estimated, vehicles / 15 min"
          tone="green"
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <MetricCard label="Avg. schedule shift" value={`${avgShift} min`} icon={<Timer className="h-4 w-4" />} />
        <MetricCard
          label="Institutions involved"
          value={scopedRecs.length}
          hint="Approved or pending changes"
          tone="purple"
          icon={<Building2 className="h-4 w-4" />}
        />
        <MetricCard label="Junctions analysed" value={junctionIds.length} tone="amber" icon={<MapPin className="h-4 w-4" />} />
      </div>

      <Card className="mt-6 p-5">
        <h2 className="font-semibold">Estimated traffic volume</h2>
        <p className="text-xs text-muted">Vehicles per 15 minutes: sample observations vs. estimate with recommended schedules.</p>
        {hasData ? (
          <div className="mt-4 h-80">
            <ResponsiveContainer>
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="repCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1677f8" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#1677f8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="repRecommended" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#16b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="time" tickFormatter={formatTime} interval={3} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(t) => formatTime(String(t))} />
                <Legend />
                <Area type="monotone" dataKey="observed" name="Current schedule (observed)" stroke="#1677f8" strokeWidth={2} fill="url(#repCurrent)" />
                <Area
                  type="monotone"
                  dataKey="recommended"
                  name="Recommended schedule (estimated)"
                  stroke="#16b981"
                  strokeWidth={2}
                  fill="url(#repRecommended)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">Insufficient data: no traffic observations in this range.</p>
        )}
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold">Assumptions</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
            {MODEL_ASSUMPTIONS.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">Data sources</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
            <li>Traffic counts: {observations.some((o) => o.source === "field") ? "field observations" : "sample observations (not field-measured)"}</li>
            <li>Institution schedules: entered in CityWeave by coordinators</li>
            <li>Recommendations: {scopedRecs.length} approved or pending in scope</li>
            <li>Report generated: {new Date().toLocaleString()}</li>
          </ul>
        </Card>
      </div>

      <div className="mt-6">
        <EstimateNotice>
          The “recommended” series is a model estimate. Actual congestion reduction must be confirmed with traffic counts taken after
          schedule changes are implemented.
        </EstimateNotice>
      </div>
    </>
  );
}
