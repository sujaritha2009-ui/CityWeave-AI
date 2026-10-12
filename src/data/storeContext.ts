import { createContext } from "react";
import type { AppData, Institution, InstitutionInput, Recommendation } from "@shared/types";

export type StoreStatus = "loading" | "ready" | "error";

export interface StoreValue extends AppData {
  status: StoreStatus;
  error: string | null;
  reload: () => Promise<void>;
  addInstitution: (input: InstitutionInput) => Promise<Institution>;
  updateInstitution: (id: string, input: InstitutionInput) => Promise<Institution>;
  deleteInstitution: (id: string) => Promise<void>;
  /** Asks the API to replace all draft recommendations with a freshly generated set. */
  generateRecommendations: () => Promise<Recommendation[]>;
  reviewRecommendation: (id: string, decision: "approved" | "rejected") => Promise<void>;
  resetSampleData: () => Promise<void>;
}

export const StoreContext = createContext<StoreValue | null>(null);
