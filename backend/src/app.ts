import cors from "cors";
import express, { type ErrorRequestHandler, type Express } from "express";
import { approvedShifts, findKeyInsight, MODEL_ASSUMPTIONS, proposedShifts } from "../../shared/recommendationEngine.js";
import { toMinutes } from "../../shared/time.js";
import { peakReductionPct, REPORT_RANGES, type ReportRange, junctionStats, volumeSeries } from "../../shared/traffic.js";
import { ApiError } from "./errors.js";
import type { DataStore } from "./store.js";
import { parseDecision } from "./validate.js";

function queryValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function createApp(store: DataStore): Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/data", (_req, res) => {
    res.json(store.getData());
  });

  app.post("/api/data/reset", (_req, res) => {
    res.json(store.resetSampleData());
  });

  app.get("/api/model", (_req, res) => {
    res.json({ assumptions: MODEL_ASSUMPTIONS });
  });

  app.get("/api/institutions", (_req, res) => {
    res.json(store.getData().institutions);
  });

  app.get("/api/institutions/:id", (req, res) => {
    const institution = store.getData().institutions.find((i) => i.id === req.params.id);
    if (!institution) throw new ApiError(404, "Institution not found");
    res.json(institution);
  });

  app.post("/api/institutions", (req, res) => {
    res.status(201).json(store.addInstitution(req.body));
  });

  app.put("/api/institutions/:id", (req, res) => {
    res.json(store.updateInstitution(req.params.id, req.body));
  });

  app.delete("/api/institutions/:id", (req, res) => {
    store.deleteInstitution(req.params.id);
    res.status(204).end();
  });

  app.get("/api/junctions", (_req, res) => {
    res.json(store.getData().junctions);
  });

  app.get("/api/junctions/:id/stats", (req, res) => {
    const data = store.getData();
    const junction = data.junctions.find((j) => j.id === req.params.id);
    if (!junction) throw new ApiError(404, "Junction not found");
    const stats = junctionStats(junction.id, data.observations);
    res.json({ junction, stats, institutions: data.institutions.filter((i) => i.junctionId === junction.id) });
  });

  app.get("/api/junctions/:id", (req, res) => {
    const junction = store.getData().junctions.find((j) => j.id === req.params.id);
    if (!junction) throw new ApiError(404, "Junction not found");
    res.json(junction);
  });

  app.get("/api/observations", (req, res) => {
    const junctionId = queryValue(req.query.junctionId);
    const observations = store.getData().observations;
    res.json(junctionId ? observations.filter((o) => o.junctionId === junctionId) : observations);
  });

  app.get("/api/recommendations", (req, res) => {
    const status = queryValue(req.query.status);
    const recommendations = store.getData().recommendations;
    res.json(status ? recommendations.filter((r) => r.status === status) : recommendations);
  });

  app.post("/api/recommendations/generate", (_req, res) => {
    res.json(store.generateDrafts());
  });

  app.put("/api/recommendations/drafts", (req, res) => {
    res.json(store.replaceDraftRecommendations(req.body));
  });

  app.post("/api/recommendations/:id/review", (req, res) => {
    res.json(store.reviewRecommendation(req.params.id, parseDecision(req.body)));
  });

  app.get("/api/schedule-versions", (_req, res) => {
    res.json(store.getData().scheduleVersions);
  });

  app.get("/api/insights", (_req, res) => {
    const data = store.getData();
    res.json(findKeyInsight(data.institutions, data.junctions, approvedShifts(data.recommendations)));
  });

  app.get("/api/volume", (req, res) => {
    const data = store.getData();
    const junctionId = queryValue(req.query.junctionId) ?? "all";
    const rangeKey = queryValue(req.query.range) ?? "day";
    const scenario = queryValue(req.query.scenario) ?? "proposed";
    if (!(rangeKey in REPORT_RANGES)) throw new ApiError(400, "Range must be morning, afternoon, or day.");
    if (scenario !== "baseline" && scenario !== "proposed" && scenario !== "approved") {
      throw new ApiError(400, "Scenario must be baseline, proposed, or approved.");
    }
    if (junctionId !== "all" && !data.junctions.some((j) => j.id === junctionId)) {
      throw new ApiError(404, "Junction not found");
    }

    const range = REPORT_RANGES[rangeKey as ReportRange];
    const junctionIds = junctionId === "all" ? data.junctions.map((j) => j.id) : [junctionId];
    const shifts =
      scenario === "baseline" ? {} : scenario === "approved" ? approvedShifts(data.recommendations) : proposedShifts(data.recommendations);
    const series = volumeSeries(junctionIds, data.institutions, data.observations, shifts).filter((point) => {
      const minute = toMinutes(point.time);
      return minute >= range.from && minute < range.to;
    });
    res.json({
      junctionId,
      range: rangeKey,
      scenario,
      label: range.label,
      peakReductionPct: peakReductionPct(series),
      series,
    });
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof ApiError) {
      res.status(err.status).json({ error: err.message, ...(err.fields ? { fields: err.fields } : {}) });
      return;
    }
    if (err instanceof SyntaxError && "body" in err) {
      res.status(400).json({ error: "Request body must be valid JSON." });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  };
  app.use(onError);

  return app;
}
