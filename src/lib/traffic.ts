import type { CongestionLevel, Institution, Junction, TrafficObservation } from "../data/types";
import { buildProfile, VEHICLES_PER_ARRIVAL, type ShiftMap } from "./recommendationEngine";
import { BUCKET_MINUTES, dayBuckets, fromMinutes, toMinutes } from "./time";

const HIGH_THRESHOLD = 450;
const MODERATE_THRESHOLD = 250;

export function congestionFor(peakCount: number): CongestionLevel {
  if (peakCount >= HIGH_THRESHOLD) return "high";
  if (peakCount >= MODERATE_THRESHOLD) return "moderate";
  return "low";
}

export interface JunctionStats {
  peakCount: number;
  peakStart: string;
  peakEnd: string;
  congestion: CongestionLevel;
  observationCount: number;
  hasFieldData: boolean;
}

export function junctionStats(junctionId: string, observations: TrafficObservation[]): JunctionStats | null {
  const own = observations.filter((o) => o.junctionId === junctionId);
  if (own.length === 0) return null;
  const peak = own.reduce((a, b) => (b.vehicleCount > a.vehicleCount ? b : a));
  // Peak period: contiguous run of windows around the peak with at least 80% of the peak count.
  const sorted = [...own].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  const idx = sorted.indexOf(peak);
  let lo = idx;
  let hi = idx;
  while (lo > 0 && sorted[lo - 1].vehicleCount >= peak.vehicleCount * 0.8) lo--;
  while (hi < sorted.length - 1 && sorted[hi + 1].vehicleCount >= peak.vehicleCount * 0.8) hi++;
  return {
    peakCount: peak.vehicleCount,
    peakStart: sorted[lo].time,
    peakEnd: fromMinutes(toMinutes(sorted[hi].time) + BUCKET_MINUTES),
    congestion: congestionFor(peak.vehicleCount),
    observationCount: own.length,
    hasFieldData: own.some((o) => o.source === "field"),
  };
}

export interface VolumePoint {
  time: string;
  observed: number;
  recommended: number;
}

/**
 * Observed vehicles per 15-minute window, and an estimate of the same series if the
 * proposed shifts were applied: observed − vehicles moved out + vehicles moved in.
 */
export function volumeSeries(
  junctionIds: string[],
  institutions: Institution[],
  observations: TrafficObservation[],
  shifts: ShiftMap,
): VolumePoint[] {
  const members = institutions.filter((i) => junctionIds.includes(i.junctionId));
  const base = buildProfile(members);
  const proposed = buildProfile(members, shifts);
  return dayBuckets().map((t, i) => {
    const time = fromMinutes(t);
    const observed = observations
      .filter((o) => junctionIds.includes(o.junctionId) && o.time === time)
      .reduce((sum, o) => sum + o.vehicleCount, 0);
    const delta = (proposed[i] - base[i]) * VEHICLES_PER_ARRIVAL;
    return { time, observed, recommended: Math.max(Math.round(observed * 0.3), Math.round(observed + delta)) };
  });
}

export function peakReductionPct(series: VolumePoint[]): number {
  const before = Math.max(0, ...series.map((p) => p.observed));
  const after = Math.max(0, ...series.map((p) => p.recommended));
  if (before === 0) return 0;
  return Math.round(((before - after) / before) * 100);
}

export function institutionsNear(junction: Junction, institutions: Institution[]): Institution[] {
  return institutions.filter((i) => i.junctionId === junction.id);
}

export const CONGESTION_STYLES: Record<CongestionLevel, { label: string; color: string; badge: string }> = {
  low: { label: "Low congestion", color: "#16b981", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  moderate: { label: "Moderate congestion", color: "#f59e0b", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  high: { label: "High congestion", color: "#ef4444", badge: "bg-red-50 text-red-700 border-red-200" },
};
