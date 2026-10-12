import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";
import { createApp } from "./app.js";
import { createStore } from "./store.js";
import type { AppData, Institution, Recommendation } from "./types.js";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cityweave-api-"));
const dataFile = path.join(dir, "store.json");
const store = createStore(dataFile);
const app = createApp(store);

let server: Server;
let base: string;

before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind a port");
  base = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  fs.rmSync(dir, { recursive: true, force: true });
});

async function api(pathname: string, init?: RequestInit) {
  const response = await fetch(`${base}${pathname}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await response.text();
  const body: unknown = text ? JSON.parse(text) : null;
  return { status: response.status, body, headers: response.headers };
}

describe("CityWeave API", { concurrency: 1 }, () => {
  it("serves the sample dataset and a health check", async () => {
    const health = await api("/api/health");
    assert.equal(health.status, 200);
    assert.equal(health.headers.get("access-control-allow-origin"), "*");

    const data = await api("/api/data");
    assert.equal(data.status, 200);
    const snapshot = data.body as AppData;
    assert.equal(snapshot.institutions.length, 6);
    assert.equal(snapshot.junctions.length, 3);
    assert.equal(snapshot.observations.length, 168);
    assert.equal(snapshot.recommendations.length, 0);
  });

  it("rejects an incomplete institution with the form's field errors", async () => {
    const response = await api("/api/institutions", {
      method: "POST",
      body: JSON.stringify({ name: "  ", type: "college", startTime: "16:00", endTime: "09:00" }),
    });
    assert.equal(response.status, 400);
    const fields = (response.body as { fields: Record<string, string> }).fields;
    assert.equal(fields.name, "Institution name is required.");
    assert.equal(fields.endTime, "End time must be after the start time.");
    assert.equal(fields.dailyArrivals, "Enter an approximate number of daily arrivals greater than 0.");
    assert.equal(fields.junctionId, "Select the junction most affected by this institution.");
  });

  it("creates, updates, and deletes an institution", async () => {
    const created = await api("/api/institutions", {
      method: "POST",
      body: JSON.stringify({
        name: "  North Gate College  ",
        type: "college",
        lat: 13.07,
        lng: 74.99,
        startTime: "09:00",
        endTime: "16:00",
        dailyArrivals: 500,
        flexibilityMinutes: 30,
        junctionId: "j-bus-stand",
        notes: "  test  ",
      }),
    });
    assert.equal(created.status, 201);
    const institution = created.body as Institution;
    assert.equal(institution.name, "North Gate College");
    assert.equal(institution.notes, "test");
    assert.ok(institution.id.startsWith("i-"));

    const updated = await api(`/api/institutions/${institution.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...institution, name: "North Gate Institute", dailyArrivals: 550 }),
    });
    assert.equal(updated.status, 200);
    assert.equal((updated.body as Institution).name, "North Gate Institute");

    const removed = await api(`/api/institutions/${institution.id}`, { method: "DELETE" });
    assert.equal(removed.status, 204);
    const missing = await api(`/api/institutions/${institution.id}`);
    assert.equal(missing.status, 404);
  });

  it("generates drafts, keeps them across an unrelated review, and records an approved schedule", async () => {
    const generated = await api("/api/recommendations/generate", { method: "POST" });
    assert.equal(generated.status, 200);
    const drafts = generated.body as Recommendation[];
    assert.ok(drafts.length >= 2);
    assert.ok(drafts.every((r) => r.status === "draft"));

    const insight = await api("/api/insights");
    assert.equal(insight.status, 200);
    assert.equal(typeof (insight.body as { windowLabel: string }).windowLabel, "string");

    const approved = await api(`/api/recommendations/${drafts[0].id}/review`, {
      method: "POST",
      body: JSON.stringify({ decision: "approved" }),
    });
    assert.equal(approved.status, 200);
    const review = approved.body as {
      recommendation: Recommendation;
      scheduleVersion: { startTime: string; endTime: string; institutionId: string };
    };
    assert.equal(review.recommendation.status, "approved");
    assert.equal(review.scheduleVersion.startTime, drafts[0].proposedStart);
    assert.equal(review.scheduleVersion.institutionId, drafts[0].institutionId);

    const again = await api(`/api/recommendations/${drafts[0].id}/review`, {
      method: "POST",
      body: JSON.stringify({ decision: "rejected" }),
    });
    assert.equal(again.status, 409);

    const current = await api(`/api/institutions/${drafts[1].institutionId}`);
    const edited = await api(`/api/institutions/${drafts[1].institutionId}`, {
      method: "PUT",
      body: JSON.stringify({ ...(current.body as Institution), notes: "schedule edited" }),
    });
    assert.equal(edited.status, 200);
    const remaining = (await api("/api/recommendations?status=draft")).body as Recommendation[];
    assert.equal(remaining.some((r) => r.institutionId === drafts[1].institutionId), false);
    assert.equal(remaining.some((r) => r.id === drafts[0].id), false);

    const volume = await api("/api/volume?junctionId=all&range=morning&scenario=approved");
    assert.equal(volume.status, 200);
    const series = (volume.body as { series: unknown[] }).series;
    assert.ok(series.length > 0);

    const reloaded = createStore(dataFile).getData();
    assert.equal(reloaded.scheduleVersions.length, 1);
    assert.equal(reloaded.recommendations.some((r) => r.status === "approved"), true);
  });

  it("resets back to the Moodbidri sample", async () => {
    const reset = await api("/api/data/reset", { method: "POST" });
    assert.equal(reset.status, 200);
    const data = reset.body as AppData;
    assert.equal(data.institutions.length, 6);
    assert.equal(data.recommendations.length, 0);
    assert.equal(data.scheduleVersions.length, 0);
    assert.equal(fs.existsSync(dataFile), true);
  });
});
