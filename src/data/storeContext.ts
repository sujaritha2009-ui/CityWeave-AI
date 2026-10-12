import { createContext } from "react";
import type { AppData, Institution, Recommendation } from "./types";

export type InstitutionInput = Omit<Institution, "id">;

export interface StoreValue extends AppData {
  addInstitution: (input: InstitutionInput) => Institution;
  updateInstitution: (id: string, input: InstitutionInput) => void;
  deleteInstitution: (id: string) => void;
  /** Replaces all draft recommendations with a freshly generated set. */
  replaceDraftRecommendations: (drafts: Recommendation[]) => void;
  reviewRecommendation: (id: string, decision: "approved" | "rejected") => void;
  resetSampleData: () => void;
}

export const StoreContext = createContext<StoreValue | null>(null);
