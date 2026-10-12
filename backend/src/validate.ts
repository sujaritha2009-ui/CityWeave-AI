import { ApiError } from "./errors.js";
import { toMinutes } from "./time.js";
import type { AppData, InstitutionInput, InstitutionType, Recommendation } from "./types.js";

const INSTITUTION_TYPES: InstitutionType[] = ["college", "school", "hospital", "government", "office"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${match[1]}:${match[2]}`;
}

/** Same checks as the institution form, plus coordinates and type. */
export function parseInstitutionInput(body: unknown, data: AppData): InstitutionInput {
  if (!isRecord(body)) throw new ApiError(400, "Institution body must be a JSON object.");

  const fields: Record<string, string> = {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) fields.name = "Institution name is required.";

  const type = body.type;
  if (typeof type !== "string" || !INSTITUTION_TYPES.includes(type as InstitutionType)) {
    fields.type = "Type must be college, school, hospital, government, or office.";
  }

  const lat = body.lat;
  const lng = body.lng;
  if (typeof lat !== "number" || !Number.isFinite(lat) || lat < -90 || lat > 90) {
    fields.lat = "Latitude must be a number between -90 and 90.";
  }
  if (typeof lng !== "number" || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    fields.lng = "Longitude must be a number between -180 and 180.";
  }

  const startTime = normalizeTime(body.startTime);
  const endTime = normalizeTime(body.endTime);
  if (!startTime) fields.startTime = "Start time is required.";
  if (!endTime) fields.endTime = "End time is required.";
  if (startTime && endTime && toMinutes(endTime) <= toMinutes(startTime)) {
    fields.endTime = "End time must be after the start time.";
  }

  const dailyArrivals = body.dailyArrivals;
  if (typeof dailyArrivals !== "number" || !Number.isFinite(dailyArrivals) || dailyArrivals <= 0) {
    fields.dailyArrivals = "Enter an approximate number of daily arrivals greater than 0.";
  }

  const flexibilityMinutes = body.flexibilityMinutes;
  if (typeof flexibilityMinutes !== "number" || !Number.isFinite(flexibilityMinutes) || flexibilityMinutes < 0 || flexibilityMinutes > 120) {
    fields.flexibilityMinutes = "Flexibility must be between 0 and 120 minutes.";
  }

  const junctionId = typeof body.junctionId === "string" ? body.junctionId : "";
  if (!junctionId || !data.junctions.some((j) => j.id === junctionId)) {
    fields.junctionId = "Select the junction most affected by this institution.";
  }

  const notes = body.notes === undefined ? "" : body.notes;
  if (typeof notes !== "string") fields.notes = "Notes must be text.";

  if (Object.keys(fields).length > 0) throw new ApiError(400, "Invalid institution", fields);

  return {
    name,
    type: type as InstitutionType,
    lat: lat as number,
    lng: lng as number,
    startTime: startTime as string,
    endTime: endTime as string,
    dailyArrivals: dailyArrivals as number,
    flexibilityMinutes: flexibilityMinutes as number,
    junctionId,
    notes: typeof notes === "string" ? notes.trim() : "",
  };
}

export function parseDrafts(body: unknown, data: AppData): Recommendation[] {
  if (!Array.isArray(body)) throw new ApiError(400, "Expected an array of draft recommendations.");
  const keptIds = new Set(data.recommendations.filter((r) => r.status !== "draft").map((r) => r.id));
  return body.map((item, index) => parseDraft(item, index, data, keptIds));
}

function parseDraft(item: unknown, index: number, data: AppData, keptIds: Set<string>): Recommendation {
  if (!isRecord(item)) throw new ApiError(400, `Draft ${index} must be an object.`);
  const institution = data.institutions.find((i) => i.id === item.institutionId);
  if (!institution) throw new ApiError(400, `Draft ${index} refers to an unknown institution.`);
  if (item.junctionId !== institution.junctionId) {
    throw new ApiError(400, `Draft ${index} junction does not match the institution.`);
  }
  if (item.status !== undefined && item.status !== "draft") {
    throw new ApiError(400, `Draft ${index} must have status "draft".`);
  }
  const proposedStart = normalizeTime(item.proposedStart);
  const originalStart = normalizeTime(item.originalStart);
  if (!proposedStart || !originalStart) throw new ApiError(400, `Draft ${index} has an invalid time.`);
  if (typeof item.shiftMinutes !== "number" || !Number.isFinite(item.shiftMinutes)) {
    throw new ApiError(400, `Draft ${index} is missing shiftMinutes.`);
  }
  if (typeof item.estimatedPeakReductionPct !== "number" || !Number.isFinite(item.estimatedPeakReductionPct)) {
    throw new ApiError(400, `Draft ${index} is missing estimatedPeakReductionPct.`);
  }
  if (typeof item.rationale !== "string" || !item.rationale.trim()) {
    throw new ApiError(400, `Draft ${index} is missing a rationale.`);
  }
  const id = typeof item.id === "string" && item.id.trim() ? item.id : "";
  if (!id) throw new ApiError(400, `Draft ${index} is missing an id.`);
  if (keptIds.has(id)) throw new ApiError(400, `Draft ${index} reuses an id that is already approved or rejected.`);

  return {
    id,
    institutionId: institution.id,
    junctionId: institution.junctionId,
    originalStart,
    proposedStart,
    shiftMinutes: item.shiftMinutes,
    estimatedPeakReductionPct: item.estimatedPeakReductionPct,
    rationale: item.rationale,
    status: "draft",
    createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
  };
}

export function parseDecision(body: unknown): "approved" | "rejected" {
  if (!isRecord(body) || (body.decision !== "approved" && body.decision !== "rejected")) {
    throw new ApiError(400, 'Decision must be "approved" or "rejected".');
  }
  return body.decision;
}
