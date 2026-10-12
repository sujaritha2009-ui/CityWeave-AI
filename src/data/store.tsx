import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { newId } from "../lib/id";
import { shiftTime } from "../lib/time";
import { createSeedData } from "./seed";
import { StoreContext, type InstitutionInput, type StoreValue } from "./storeContext";
import type { AppData, Recommendation } from "./types";

const STORAGE_KEY = "cityweave:data:v1";

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (Array.isArray(parsed.institutions) && Array.isArray(parsed.junctions)) return parsed;
    }
  } catch {
    // Corrupt or unavailable storage falls back to sample data.
  }
  return createSeedData();
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(loadData);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Storage may be full or disabled; the app keeps working in memory.
    }
  }, [data]);

  const addInstitution = useCallback((input: InstitutionInput) => {
    const institution = { ...input, id: newId("i") };
    setData((d) => ({ ...d, institutions: [...d.institutions, institution] }));
    return institution;
  }, []);

  const updateInstitution = useCallback((id: string, input: InstitutionInput) => {
    setData((d) => ({
      ...d,
      institutions: d.institutions.map((i) => (i.id === id ? { ...input, id } : i)),
      // Drafts were computed from the old schedule and are no longer valid.
      recommendations: d.recommendations.filter((r) => !(r.institutionId === id && r.status === "draft")),
    }));
  }, []);

  const deleteInstitution = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      institutions: d.institutions.filter((i) => i.id !== id),
      recommendations: d.recommendations.filter((r) => r.institutionId !== id),
      scheduleVersions: d.scheduleVersions.filter((v) => v.institutionId !== id),
    }));
  }, []);

  const replaceDraftRecommendations = useCallback((drafts: Recommendation[]) => {
    setData((d) => ({
      ...d,
      recommendations: [...d.recommendations.filter((r) => r.status !== "draft"), ...drafts],
    }));
  }, []);

  const reviewRecommendation = useCallback((id: string, decision: "approved" | "rejected") => {
    setData((d) => {
      const rec = d.recommendations.find((r) => r.id === id);
      if (!rec || rec.status !== "draft") return d;
      const now = new Date().toISOString();
      const recommendations = d.recommendations.map((r) =>
        r.id === id ? { ...r, status: decision, reviewedAt: now } : r,
      );
      if (decision === "rejected") return { ...d, recommendations };

      const institution = d.institutions.find((i) => i.id === rec.institutionId);
      if (!institution) return { ...d, recommendations };
      return {
        ...d,
        recommendations,
        scheduleVersions: [
          ...d.scheduleVersions,
          {
            id: newId("v"),
            institutionId: institution.id,
            startTime: rec.proposedStart,
            endTime: shiftTime(institution.endTime, rec.shiftMinutes),
            recommendationId: rec.id,
            createdAt: now,
          },
        ],
      };
    });
  }, []);

  const resetSampleData = useCallback(() => setData(createSeedData()), []);

  const value = useMemo<StoreValue>(
    () => ({
      ...data,
      addInstitution,
      updateInstitution,
      deleteInstitution,
      replaceDraftRecommendations,
      reviewRecommendation,
      resetSampleData,
    }),
    [data, addInstitution, updateInstitution, deleteInstitution, replaceDraftRecommendations, reviewRecommendation, resetSampleData],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
