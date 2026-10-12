import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppData, Institution, InstitutionInput, Recommendation } from "@shared/types";
import { api } from "./api";
import { StoreContext, type ReviewOptions, type StoreStatus, type StoreValue } from "./storeContext";

const EMPTY: AppData = { institutions: [], junctions: [], observations: [], recommendations: [], scheduleVersions: [] };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY);
  const [status, setStatus] = useState<StoreStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setData(await api<AppData>("/data"));
      setStatus("ready");
      setError(null);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to load data.");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addInstitution = useCallback(
    async (input: InstitutionInput) => {
      const created = await api<Institution>("/institutions", { method: "POST", body: input });
      await reload();
      return created;
    },
    [reload],
  );

  const updateInstitution = useCallback(
    async (id: string, input: InstitutionInput) => {
      const updated = await api<Institution>(`/institutions/${encodeURIComponent(id)}`, { method: "PUT", body: input });
      await reload();
      return updated;
    },
    [reload],
  );

  const deleteInstitution = useCallback(
    async (id: string) => {
      await api(`/institutions/${encodeURIComponent(id)}`, { method: "DELETE" });
      await reload();
    },
    [reload],
  );

  const generateRecommendations = useCallback(async () => {
    const drafts = await api<Recommendation[]>("/recommendations/generate", { method: "POST" });
    await reload();
    return drafts;
  }, [reload]);

  const reviewRecommendation = useCallback(
    async (id: string, decision: "approved" | "rejected" | "modified", options?: ReviewOptions) => {
      await api(`/recommendations/${encodeURIComponent(id)}/review`, {
        method: "POST",
        body: {
          decision,
          shiftMinutes: options?.shiftMinutes,
          notes: options?.notes,
        },
      });
      await reload();
    },
    [reload],
  );

  const askCivicAssistant = useCallback(async (question: string) => {
    return api<{ answer: string; source: "gemini" | "rule-based" }>("/ai/ask", {
      method: "POST",
      body: { question },
    });
  }, []);

  const resetSampleData = useCallback(async () => {
    setData(await api<AppData>("/data/reset", { method: "POST" }));
    setStatus("ready");
    setError(null);
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      ...data,
      status,
      error,
      reload,
      addInstitution,
      updateInstitution,
      deleteInstitution,
      generateRecommendations,
      reviewRecommendation,
      askCivicAssistant,
      resetSampleData,
    }),
    [
      data,
      status,
      error,
      reload,
      addInstitution,
      updateInstitution,
      deleteInstitution,
      generateRecommendations,
      reviewRecommendation,
      askCivicAssistant,
      resetSampleData,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
