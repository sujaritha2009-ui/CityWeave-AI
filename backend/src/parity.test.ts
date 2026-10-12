import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSeedData as frontendSeed } from "../../src/data/seed.ts";
import { findKeyInsight as frontendInsight, generateRecommendations as frontendGenerate } from "../../src/lib/recommendationEngine.ts";
import { junctionStats as frontendStats, volumeSeries as frontendVolume } from "../../src/lib/traffic.ts";
import { findKeyInsight, generateRecommendations } from "./recommendationEngine.ts";
import { createSeedData } from "./seed.ts";
import { junctionStats, volumeSeries } from "./traffic.ts";
import type { Recommendation } from "./types.js";

function comparable(recommendations: Recommendation[]) {
  return recommendations.map(({ id: _id, createdAt: _createdAt, ...rest }) => rest);
}

describe("backend matches the frontend model", () => {
  it("seeds the same Moodbidri sample", () => {
    assert.deepEqual(createSeedData(), frontendSeed());
  });

  it("proposes the same schedule shifts", () => {
    const seed = createSeedData();
    const backend = generateRecommendations(seed.institutions, seed.junctions, []);
    const frontend = frontendGenerate(seed.institutions, seed.junctions, []);
    assert.ok(backend.length > 0);
    assert.deepEqual(comparable(backend), comparable(frontend));
  });

  it("computes the same junction stats, volume series, and key insight", () => {
    const seed = createSeedData();
    for (const junction of seed.junctions) {
      assert.deepEqual(junctionStats(junction.id, seed.observations), frontendStats(junction.id, seed.observations));
    }
    const ids = seed.junctions.map((j) => j.id);
    assert.deepEqual(
      volumeSeries(ids, seed.institutions, seed.observations, {}),
      frontendVolume(ids, seed.institutions, seed.observations, {}),
    );
    assert.deepEqual(findKeyInsight(seed.institutions, seed.junctions), frontendInsight(seed.institutions, seed.junctions));
  });
});
