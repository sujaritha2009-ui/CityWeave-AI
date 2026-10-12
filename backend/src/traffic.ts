import { buildProfile, VEHICLES_PER_ARRIVAL, type ShiftMap } from "./recommendationEngine.js";
import { BUCKET_MINUTES, dayBuckets, fromMinutes, toMinutes } from "./time.js";
import type { CongestionLevel, Institution, TrafficObservation } from "./types.js";

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

export const REPORT_RANGES = {
  morning: { label: "Morning (6 AM – 12 PM)", from: 6 * 60, to: 12 * 60 },
  afternoon: { label: "Afternoon & evening (12 – 8 PM)", from: 12 * 60, to: 20 * 60 },
  day: { label: "Full day (6 AM – 8 PM)", from: 6 * 60, to: 20 * 60 },
} as const;

export type ReportRange = keyof typeof REPORT_RANGES;
