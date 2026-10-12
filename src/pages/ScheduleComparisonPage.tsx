import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, EmptyState, EstimateNotice, MetricCard, PageHeader } from "../components/common/ui";
import { useStore } from "../data/useStore";
import { cx, inputClass } from "../lib/cx";
import { buildProfile, peakOf, proposedShifts } from "@shared/recommendationEngine";
import { DAY_END, DAY_START, dayBuckets, formatTime, fromMinutes, shiftTime, toMinutes } from "@shared/time";

const AXIS_START = 7 * 60;
const AXIS_END = 19 * 60;
const AXIS_TICKS = Array.from({ length: (AXIS_END - AXIS_START) / 60 + 1 }, (_, i) => AXIS_START + i * 60);

function pct(minute: number): number {
  return ((Math.min(Math.max(minute, AXIS_START), AXIS_END) - AXIS_START) / (AXIS_END - AXIS_START)) * 100;
}

function ScheduleBar({ start, end, color, label }: { start: string; end: string; color: string; label: string }) {
  const left = pct(toMinutes(start));
  const width = pct(toMinutes(end)) - left;
  return (
    <div
      className={cx("absolute h-6 truncate rounded-md px-2 text-[11px] leading-6 font-semibold text-white", color)}
      style={{ left: `${left}%`, width: `${width}%` }}
      title={label}
    >
      {formatTime(start)} – {formatTime(end)}
    </div>
  );
}

export function ScheduleComparisonPage() {
  const { institutions, junctions, recommendations } = useStore();
  const [junctionId, setJunctionId] = useState<string>("all");

  const shifts = useMemo(() => proposedShifts(recommendations), [recommendations]);
  const members = useMemo(
    () =>
      institutions
        .filter((i) => junctionId === "all" || i.junctionId === junctionId)
        .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)),
    [institutions, junctionId],
  );

  const { chart, before, after } = useMemo(() => {
    const base = buildProfile(members);
    const proposed = buildProfile(members, shifts);
    const chart = dayBuckets().map((t, i) => ({
      time: fromMinutes(t),
      current: Math.round(base[i]),
      recommended: Math.round(proposed[i]),
    }));
    return { chart, before: peakOf(base).value, after: peakOf(proposed).value };
  }, [members, shifts]);

  const shiftedCount = members.filter((m) => shifts[m.id]).length;
  const reduction = before > 0 ? Math.round(((before - after) / before) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Schedule Comparison"
        description="Current schedules versus schedules with approved and pending recommendations applied."
        actions={
          <select className={cx(inputClass, "w-56")} value={junctionId} onChange={(e) => setJunctionId(e.target.value)}>
            <option value="all">All junctions</option>
            {junctions.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </select>
        }
      />

      {members.length === 0 ? (
        <EmptyState title="No institutions to compare" description="Add institutions near this junction first." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Peak arrivals / 15 min (current)" value={Math.round(before).toLocaleString()} />
            <MetricCard label="Peak arrivals / 15 min (recommended)" value={Math.round(after).toLocaleString()} tone="green" />
            <MetricCard
              label="Estimated peak reduction"
              value={`${reduction}%`}
              hint={`${shiftedCount} of ${members.length} institutions shifted`}
              tone="amber"
            />
          </div>

          <Card className="mt-6 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Operating hours</h2>
              <div className="flex gap-4 text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-primary" /> Current schedule
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-success" /> Recommended schedule
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                {members.map((m) => {
                  const shift = shifts[m.id] ?? 0;
                  return (
                    <div key={m.id} className="flex items-center border-b border-line py-3 last:border-0">
                      <div className="w-52 shrink-0 pr-3">
                        <p className="truncate text-sm font-semibold">{m.name}</p>
                        <p className="text-xs text-muted">{shift ? `Shift ${shift > 0 ? "+" : ""}${shift} min` : "No change"}</p>
                      </div>
                      <div className="relative h-14 flex-1">
                        <div className="absolute top-0 w-full">
                          <ScheduleBar start={m.startTime} end={m.endTime} color="bg-primary" label="Current" />
                        </div>
                        <div className="absolute top-7 w-full">
                          <ScheduleBar
                            start={shiftTime(m.startTime, shift)}
                            end={shiftTime(m.endTime, shift)}
                            color="bg-success"
                            label="Recommended"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="flex">
                  <div className="w-52 shrink-0" />
                  <div className="relative h-6 flex-1 text-[11px] text-muted">
                    {AXIS_TICKS.map((t) => (
                      <span key={t} className="absolute -translate-x-1/2" style={{ left: `${pct(t)}%` }}>
                        {formatTime(fromMinutes(t)).replace(":00", "")}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="mt-6 p-5">
            <h2 className="font-semibold">Estimated arrivals and departures per 15 minutes</h2>
            <p className="text-xs text-muted">
              Modelled from schedules and daily arrivals, {formatTime(fromMinutes(DAY_START))} – {formatTime(fromMinutes(DAY_END))}.
            </p>
            <div className="mt-4 h-72">
              <ResponsiveContainer>
                <LineChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" tickFormatter={formatTime} interval={7} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={(t) => formatTime(String(t))} />
                  <Legend />
                  <Line type="monotone" dataKey="current" name="Current schedule" stroke="#1677f8" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="recommended" name="Recommended schedule" stroke="#16b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {shiftedCount === 0 && (
            <p className="mt-4 text-sm text-muted">
              No recommended changes yet.{" "}
              <Link to="/app/recommendations" className="font-semibold text-primary">
                Generate recommendations
              </Link>{" "}
              to see a proposed schedule.
            </p>
          )}

          <div className="mt-6">
            <EstimateNotice />
          </div>
        </>
      )}
    </>
  );
}
