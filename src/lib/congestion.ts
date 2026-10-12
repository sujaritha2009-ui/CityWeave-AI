import type { CongestionLevel } from "@shared/types";

export const CONGESTION_STYLES: Record<CongestionLevel, { label: string; color: string; badge: string }> = {
  low: { label: "Low congestion", color: "#16b981", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  moderate: { label: "Moderate congestion", color: "#f59e0b", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  high: { label: "High congestion", color: "#ef4444", badge: "bg-red-50 text-red-700 border-red-200" },
};
