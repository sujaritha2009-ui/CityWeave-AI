export type InstitutionType = "college" | "school" | "hospital" | "government" | "office";

export interface Institution {
  id: string;
  name: string;
  type: InstitutionType;
  lat: number;
  lng: number;
  /** Baseline schedule as entered by the institution, "HH:MM" 24h. */
  startTime: string;
  endTime: string;
  dailyArrivals: number;
  /** How far (in minutes, either direction) the institution says its start time could move. */
  flexibilityMinutes: number;
  junctionId: string;
  notes: string;
}

export type InstitutionInput = Omit<Institution, "id">;

export type CongestionLevel = "low" | "moderate" | "high";

export interface Junction {
  id: string;
  name: string;
  lat: number;
  lng: number;
  avgDelayMinutes: [number, number];
  commonIssues: string[];
}

export type DataSource = "sample" | "field";

export interface TrafficObservation {
  id: string;
  junctionId: string;
  /** Start of a 15-minute observation window, "HH:MM". */
  time: string;
  vehicleCount: number;
  source: DataSource;
}

export type RecommendationStatus = "draft" | "approved" | "modified" | "rejected";

export interface AIExplanation {
  summary: string;
  reasoning: string;
  supportingObservations: string[];
  assumptions: string[];
  source: "gemini" | "rule-based";
}

export interface Recommendation {
  id: string;
  institutionId: string;
  junctionId: string;
  originalStart: string;
  proposedStart: string;
  shiftMinutes: number;
  /** Estimated reduction of the junction's peak 15-minute arrivals, in percent. */
  estimatedPeakReductionPct: number;
  rationale: string;
  aiExplanation?: AIExplanation;
  status: RecommendationStatus;
  createdAt: string;
  reviewedAt?: string;
  coordinatorNotes?: string;
}

export interface ScheduleVersion {
  id: string;
  institutionId: string;
  startTime: string;
  endTime: string;
  recommendationId: string;
  createdAt: string;
}

export interface AppData {
  institutions: Institution[];
  junctions: Junction[];
  observations: TrafficObservation[];
  recommendations: Recommendation[];
  scheduleVersions: ScheduleVersion[];
}
