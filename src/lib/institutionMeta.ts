import { Building, GraduationCap, Hospital, Landmark, School, type LucideIcon } from "lucide-react";
import type { InstitutionType } from "../data/types";

export const INSTITUTION_TYPES: Record<InstitutionType, { label: string; icon: LucideIcon; color: string; tile: string }> = {
  college: { label: "College", icon: GraduationCap, color: "#1677f8", tile: "bg-primary-soft text-primary" },
  school: { label: "School", icon: School, color: "#06b6d4", tile: "bg-cyan-50 text-cyan-600" },
  hospital: { label: "Hospital", icon: Hospital, color: "#ec4899", tile: "bg-pink-50 text-pink-600" },
  government: { label: "Government Office", icon: Landmark, color: "#8b5cf6", tile: "bg-violet-50 text-violet-600" },
  office: { label: "Office", icon: Building, color: "#16b981", tile: "bg-emerald-50 text-emerald-600" },
};

export const INSTITUTION_TYPE_OPTIONS = Object.entries(INSTITUTION_TYPES).map(([value, meta]) => ({
  value: value as InstitutionType,
  label: meta.label,
}));
