import fs from "node:fs";
import path from "node:path";
import { newId } from "../../shared/id.js";
import { generateRecommendations } from "../../shared/recommendationEngine.js";
import { createSeedData } from "../../shared/seed.js";
import { shiftTime } from "../../shared/time.js";
import type { AppData, Institution, Recommendation, ScheduleVersion } from "../../shared/types.js";
import { ApiError } from "./errors.js";
import { parseDrafts, parseInstitutionInput } from "./validate.js";

function isAppData(value: unknown): value is AppData {
  if (typeof value !== "object" || value === null) return false;
  const data = value as AppData;
  return Array.isArray(data.institutions) && Array.isArray(data.junctions) && Array.isArray(data.observations) && Array.isArray(data.recommendations) && Array.isArray(data.scheduleVersions);
}

function readFile(filePath: string): AppData {
  if (!fs.existsSync(filePath)) return createSeedData();
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (isAppData(parsed)) return parsed;
  } catch {
    // Corrupt storage falls back to sample data, matching the browser store.
  }
  return createSeedData();
}

function writeFile(filePath: string, data: AppData): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath);
}

export interface ReviewResult {
  recommendation: Recommendation;
  scheduleVersion?: ScheduleVersion;
}

export interface DataStore {
  getData: () => AppData;
  addInstitution: (body: unknown) => Institution;
  updateInstitution: (id: string, body: unknown) => Institution;
  deleteInstitution: (id: string) => void;
  replaceDraftRecommendations: (body: unknown) => Recommendation[];
  generateDrafts: () => Recommendation[];
  reviewRecommendation: (id: string, decision: "approved" | "rejected") => ReviewResult;
  resetSampleData: () => AppData;
}

export function createStore(filePath: string): DataStore {
  let data = readFile(filePath);
  writeFile(filePath, data);

  function commit(next: AppData): AppData {
    data = next;
    writeFile(filePath, data);
    return structuredClone(data);
  }

  return {
    getData() {
      return structuredClone(data);
    },

    addInstitution(body) {
      const input = parseInstitutionInput(body, data);
      const institution: Institution = { ...input, id: newId("i") };
      commit({ ...data, institutions: [...data.institutions, institution] });
      return institution;
    },

    updateInstitution(id, body) {
      if (!data.institutions.some((i) => i.id === id)) throw new ApiError(404, "Institution not found");
      const input = parseInstitutionInput(body, data);
      const institution: Institution = { ...input, id };
      commit({
        ...data,
        institutions: data.institutions.map((i) => (i.id === id ? institution : i)),
        recommendations: data.recommendations.filter((r) => !(r.institutionId === id && r.status === "draft")),
      });
      return institution;
    },

    deleteInstitution(id) {
      if (!data.institutions.some((i) => i.id === id)) throw new ApiError(404, "Institution not found");
      commit({
        ...data,
        institutions: data.institutions.filter((i) => i.id !== id),
        recommendations: data.recommendations.filter((r) => r.institutionId !== id),
        scheduleVersions: data.scheduleVersions.filter((v) => v.institutionId !== id),
      });
    },

    replaceDraftRecommendations(body) {
      const drafts = parseDrafts(body, data);
      const next = commit({
        ...data,
        recommendations: [...data.recommendations.filter((r) => r.status !== "draft"), ...drafts],
      });
      return next.recommendations;
    },

    generateDrafts() {
      const drafts = generateRecommendations(data.institutions, data.junctions, data.recommendations);
      const next = commit({
        ...data,
        recommendations: [...data.recommendations.filter((r) => r.status !== "draft"), ...drafts],
      });
      return next.recommendations.filter((r) => r.status === "draft");
    },

    reviewRecommendation(id, decision) {
      const rec = data.recommendations.find((r) => r.id === id);
      if (!rec) throw new ApiError(404, "Recommendation not found");
      if (rec.status !== "draft") throw new ApiError(409, "Only draft recommendations can be reviewed.");

      const now = new Date().toISOString();
      const recommendation: Recommendation = { ...rec, status: decision, reviewedAt: now };
      const recommendations = data.recommendations.map((r) => (r.id === id ? recommendation : r));
      if (decision === "rejected") {
        commit({ ...data, recommendations });
        return { recommendation };
      }

      const institution = data.institutions.find((i) => i.id === rec.institutionId);
      if (!institution) {
        commit({ ...data, recommendations });
        return { recommendation };
      }

      const scheduleVersion: ScheduleVersion = {
        id: newId("v"),
        institutionId: institution.id,
        startTime: rec.proposedStart,
        endTime: shiftTime(institution.endTime, rec.shiftMinutes),
        recommendationId: rec.id,
        createdAt: now,
      };
      commit({
        ...data,
        recommendations,
        scheduleVersions: [...data.scheduleVersions, scheduleVersion],
      });
      return { recommendation, scheduleVersion };
    },

    resetSampleData() {
      return commit(createSeedData());
    },
  };
}
