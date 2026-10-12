export const BUCKET_MINUTES = 15;
export const DAY_START = 6 * 60;
export const DAY_END = 20 * 60;

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(total: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(total)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function shiftTime(hhmm: string, minutes: number): string {
  return fromMinutes(toMinutes(hhmm) + minutes);
}

export function formatTime(hhmm: string): string {
  const total = toMinutes(hhmm);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatRange(startMin: number, endMin: number): string {
  return `${formatTime(fromMinutes(startMin))} – ${formatTime(fromMinutes(endMin))}`;
}

/** Bucket start times (in minutes) covering the modelled day. */
export function dayBuckets(): number[] {
  const buckets: number[] = [];
  for (let t = DAY_START; t < DAY_END; t += BUCKET_MINUTES) buckets.push(t);
  return buckets;
}
