import type { Institution, Junction, Recommendation } from "../data/types";
import { newId } from "./id";
import { BUCKET_MINUTES, DAY_START, dayBuckets, formatRange, formatTime, shiftTime, toMinutes } from "./time";

/** Share of daily arrivals landing in each 15-minute bucket before the start time (−45, −30, −15 min). */
const ARRIVAL_WEIGHTS = [0.2, 0.35, 0.45];
/** Share of departures in each 15-minute bucket after the end time (0, +15, +30 min). */
const DEPARTURE_WEIGHTS = [0.5, 0.3, 0.2];
const MAX_SHIFT = 30;
/** A shift is only proposed if it lowers the junction peak by at least this share of the original peak. */
const MIN_IMPROVEMENT = 0.02;
/** Assumed vehicles generated per person arriving (mix of buses, cars and two-wheelers). */
export const VEHICLES_PER_ARRIVAL = 0.5;

export const MODEL_ASSUMPTIONS = [
  "Arrivals are spread over the 45 minutes before an institution's start time (20% / 35% / 45% per 15-minute slot).",
  "Departures are spread over the 45 minutes after the end time (50% / 30% / 20%).",
  `Each arriving person adds about ${VEHICLES_PER_ARRIVAL} vehicles at the associated junction.`,
  "Shifting a start time moves the end time by the same amount.",
  `Shifts are limited to each institution's stated flexibility, and never more than ${MAX_SHIFT} minutes.`,
  "Background traffic not linked to registered institutions is assumed unchanged.",
];

export type ShiftMap = Record<string, number>;

export function buildProfile(institutions: Institution[], shifts: ShiftMap = {}): number[] {
  const buckets = dayBuckets();
  const profile = new Array<number>(buckets.length).fill(0);
  const add = (minute: number, value: number) => {
    const idx = Math.floor((minute - DAY_START) / BUCKET_MINUTES);
    if (idx >= 0 && idx < profile.length) profile[idx] += value;
  };
  for (const inst of institutions) {
    const shift = shifts[inst.id] ?? 0;
    const start = toMinutes(inst.startTime) + shift;
    const end = toMinutes(inst.endTime) + shift;
    ARRIVAL_WEIGHTS.forEach((w, i) => add(start - (ARRIVAL_WEIGHTS.length - i) * BUCKET_MINUTES, inst.dailyArrivals * w));
    DEPARTURE_WEIGHTS.forEach((w, i) => add(end + i * BUCKET_MINUTES, inst.dailyArrivals * w));
  }
  return profile;
}

export function peakOf(profile: number[]): { value: number; index: number } {
  let index = 0;
  profile.forEach((v, i) => {
    if (v > profile[index]) index = i;
  });
  return { value: profile[index] ?? 0, index };
}

export function bucketRangeLabel(index: number): string {
  const start = DAY_START + index * BUCKET_MINUTES;
  return formatRange(start, start + BUCKET_MINUTES);
}

/** Shifts from approved recommendations, used as the fixed starting point. */
export function approvedShifts(recommendations: Recommendation[]): ShiftMap {
  const shifts: ShiftMap = {};
  for (const r of recommendations) if (r.status === "approved") shifts[r.institutionId] = r.shiftMinutes;
  return shifts;
}

/** Shifts from approved and still-pending recommendations: the "recommended" scenario. */
export function proposedShifts(recommendations: Recommendation[]): ShiftMap {
  const shifts: ShiftMap = {};
  for (const r of recommendations) if (r.status !== "rejected") shifts[r.institutionId] = r.shiftMinutes;
  return shifts;
}

function overlappingPeers(target: Institution, members: Institution[]): Institution[] {
  const start = toMinutes(target.startTime);
  return members.filter((m) => m.id !== target.id && Math.abs(toMinutes(m.startTime) - start) <= BUCKET_MINUTES);
}

function candidateShifts(flexibility: number): number[] {
  const cap = Math.min(flexibility, MAX_SHIFT);
  const steps: number[] = [];
  for (let s = BUCKET_MINUTES; s <= cap; s += BUCKET_MINUTES) steps.push(s, -s);
  return steps;
}

export function generateRecommendations(
  institutions: Institution[],
  junctions: Junction[],
  existing: Recommendation[],
): Recommendation[] {
  const fixed = approvedShifts(existing);
  const shifts: ShiftMap = { ...fixed };
  const createdAt = new Date().toISOString();
  const results: Recommendation[] = [];

  for (const junction of junctions) {
    const members = institutions.filter((i) => i.junctionId === junction.id);
    if (members.length < 2) continue;

    const originalPeak = peakOf(buildProfile(members, shifts));
    if (originalPeak.value <= 0) continue;
    let currentPeak = originalPeak.value;

    const candidates = members
      .filter((m) => !(m.id in fixed) && m.flexibilityMinutes >= BUCKET_MINUTES)
      .sort((a, b) => b.dailyArrivals - a.dailyArrivals);
    const moved = new Set<string>();

    for (let pass = 0; pass < candidates.length; pass++) {
      let best: { inst: Institution; shift: number; peak: number } | null = null;
      for (const inst of candidates) {
        if (moved.has(inst.id)) continue;
        for (const shift of candidateShifts(inst.flexibilityMinutes)) {
          const peak = peakOf(buildProfile(members, { ...shifts, [inst.id]: shift })).value;
          if (peak < currentPeak - MIN_IMPROVEMENT * originalPeak.value && (!best || peak < best.peak)) {
            best = { inst, shift, peak };
          }
        }
      }
      if (!best) break;

      const { inst, shift, peak } = best;
      const reduction = ((currentPeak - peak) / originalPeak.value) * 100;
      const peers = overlappingPeers(inst, members);
      const peerText = peers.length
        ? `in the same arrival window as ${peers.map((p) => p.name).join(" and ")}`
        : "close to the junction's busiest period";
      const proposedStart = shiftTime(inst.startTime, shift);

      results.push({
        id: newId("r"),
        institutionId: inst.id,
        junctionId: junction.id,
        originalStart: inst.startTime,
        proposedStart,
        shiftMinutes: shift,
        estimatedPeakReductionPct: Math.round(reduction),
        rationale:
          `${inst.name} starts at ${formatTime(inst.startTime)}, ${peerText} near ${junction.name}. ` +
          `Starting at ${formatTime(proposedStart)} moves about ${inst.dailyArrivals.toLocaleString()} daily arrivals ` +
          `out of the ${bucketRangeLabel(originalPeak.index)} peak, within the institution's stated ` +
          `${inst.flexibilityMinutes}-minute flexibility.`,
        status: "draft",
        createdAt,
      });

      shifts[inst.id] = shift;
      moved.add(inst.id);
      currentPeak = peak;
    }
  }
  return results;
}

export interface KeyInsight {
  junction: Junction;
  institutionCount: number;
  windowLabel: string;
  peakArrivals: number;
}

/** Finds the junction whose busiest 15-minute window has the most overlapping institutions. */
export function findKeyInsight(institutions: Institution[], junctions: Junction[], shifts: ShiftMap = {}): KeyInsight | null {
  let best: KeyInsight | null = null;
  for (const junction of junctions) {
    const members = institutions.filter((i) => i.junctionId === junction.id);
    if (members.length < 2) continue;
    const peak = peakOf(buildProfile(members, shifts));
    const contributors = members.filter((m) => buildProfile([m], shifts)[peak.index] > 0).length;
    if (!best || contributors > best.institutionCount || (contributors === best.institutionCount && peak.value > best.peakArrivals)) {
      best = { junction, institutionCount: contributors, windowLabel: bucketRangeLabel(peak.index), peakArrivals: Math.round(peak.value) };
    }
  }
  return best;
}
