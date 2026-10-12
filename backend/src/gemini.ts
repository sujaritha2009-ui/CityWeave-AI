import { GoogleGenAI } from "@google/genai";
import { formatTime, formatShift } from "../../shared/time.js";
import type { AIExplanation, Institution, Junction, Recommendation } from "../../shared/types.js";

interface ExplanationContext {
  recommendation: Recommendation;
  institution: Institution;
  junction: Junction;
  peers: Institution[];
  peakWindow: string;
  apiKeyOverride?: string;
}

function ruleBasedExplanation(ctx: ExplanationContext): AIExplanation {
  const { recommendation, institution, junction, peers, peakWindow } = ctx;
  const shiftText = formatShift(recommendation.shiftMinutes);
  const peerNames = peers.map((p) => `${p.name} (${formatTime(p.startTime)})`).join(", ");

  const summary = `${institution.name} currently starts at ${formatTime(recommendation.originalStart)}. Staggering arrival by ${shiftText} moves arrivals out of the ${peakWindow} bottleneck at ${junction.name}.`;

  const reasoning = peers.length > 0
    ? `Multiple institutions (${peerNames}) currently have arrivals overlapping at ${junction.name} during the ${peakWindow} peak window. Adjusting ${institution.name} by ${shiftText} spreads out student and commuter bus arrivals, achieving an estimated ${recommendation.estimatedPeakReductionPct}% reduction in the busiest 15-minute influx.`
    : `${institution.name} contributes approximately ${institution.dailyArrivals.toLocaleString()} arrivals close to the peak period at ${junction.name}. Shifting start time by ${shiftText} helps stagger vehicular approaches without exceeding the institution's stated ±${institution.flexibilityMinutes}-minute flexibility limit.`;

  const supportingObservations = [
    `Junction ${junction.name} experiences peak congestion during ${peakWindow} with estimated delays of ${junction.avgDelayMinutes[0]}–${junction.avgDelayMinutes[1]} minutes.`,
    ...(junction.commonIssues.length > 0
      ? [`Observed field issue: ${junction.commonIssues[0]}.`]
      : []),
    peers.length > 0
      ? `Simultaneous arrival window with ${peerNames} concentrates vehicles on shared road approaches.`
      : `High concentrated influx of ~${institution.dailyArrivals.toLocaleString()} daily commuters.`,
  ];

  const assumptions = [
    "Arrival distribution assumes passenger approaches ramp up in the 45 minutes prior to the opening bell.",
    "Calculated peak reduction is an arrival-curve scenario estimate, not a guaranteed real-world measurement.",
    `Subject to coordinator review and feasibility regarding bus timetables and ${institution.flexibilityMinutes}-minute operational flexibility.`,
  ];

  return {
    summary,
    reasoning,
    supportingObservations,
    assumptions,
    source: "rule-based",
  };
}

function resolveApiKey(override?: string): string {
  if (override && override.trim() && !override.startsWith("AIzaSy")) {
    return override.trim();
  }
  const envKey = process.env.GEMINI_API_KEY?.trim();
  if (envKey && !envKey.startsWith("AIzaSy")) {
    return envKey;
  }
  return "";
}

export async function explainRecommendationWithGemini(ctx: ExplanationContext): Promise<AIExplanation> {
  const apiKey = resolveApiKey(ctx.apiKeyOverride);
  if (!apiKey) {
    return ruleBasedExplanation(ctx);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const { recommendation, institution, junction, peers, peakWindow } = ctx;

    const prompt = `
You are CityWeave AI's institutional traffic coordinator assistant for the pilot area of Moodbidri, Karnataka, India.
Explain the following calculated schedule adjustment recommendation in professional, constructive language for an institutional coordinator to review.

IMPORTANT RULES:
1. DO NOT invent or alter any numbers. Use only the provided calculated figures.
2. The recommendation is a proposal for voluntary institutional review, NOT an automatic mandate.
3. Be transparent about assumptions and model limitations.

DATA:
- Target Institution: ${institution.name} (${institution.type})
- Current Start Time: ${formatTime(recommendation.originalStart)}
- Proposed Start Time: ${formatTime(recommendation.proposedStart)} (${formatShift(recommendation.shiftMinutes)})
- Daily Commuter Arrivals: ~${institution.dailyArrivals.toLocaleString()}
- Stated Flexibility: ±${institution.flexibilityMinutes} minutes
- Bottleneck Junction: ${junction.name}
- Observed Peak Period: ${peakWindow}
- Reported Delay: ${junction.avgDelayMinutes[0]}–${junction.avgDelayMinutes[1]} minutes
- Junction Issues: ${junction.commonIssues.join("; ") || "General traffic surge"}
- Overlapping Institutions: ${peers.map((p) => `${p.name} (starts ${formatTime(p.startTime)})`).join(", ") || "None in same 15-minute slot"}
- Modelled Junction Peak Reduction: -${recommendation.estimatedPeakReductionPct}%

Respond strictly with a JSON object in this exact format:
{
  "summary": "1-2 sentence executive summary of the proposal for the institutional coordinator",
  "reasoning": "Clear explanation of why staggering this institution's timing away from peer institutions helps distribute arrivals and relieve junction congestion",
  "supportingObservations": ["Specific supporting observation 1 citing the data", "Specific supporting observation 2 citing junction or peer data"],
  "assumptions": ["Key operational assumption or limitation 1", "Key operational assumption or limitation 2"]
}
`.trim();

    const modelsToTry = ["gemini-3.5-flash", "gemini-3.5-flash-lite"];
    let lastError: unknown = null;
    let text = "";

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });
        const candidate = response.text?.trim();
        if (candidate) {
          text = candidate;
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Gemini model ${model} failed, attempting fallback:`, err instanceof Error ? err.message : err);
      }
    }

    if (!text) {
      throw lastError || new Error("Empty response from Gemini API");
    }

    const parsed = JSON.parse(text) as {
      summary?: string;
      reasoning?: string;
      supportingObservations?: string[];
      assumptions?: string[];
    };

    if (
      typeof parsed.summary === "string" &&
      typeof parsed.reasoning === "string" &&
      Array.isArray(parsed.supportingObservations) &&
      Array.isArray(parsed.assumptions)
    ) {
      return {
        summary: parsed.summary,
        reasoning: parsed.reasoning,
        supportingObservations: parsed.supportingObservations,
        assumptions: parsed.assumptions,
        source: "gemini",
      };
    }

    throw new Error("Invalid JSON structure from Gemini");
  } catch (err) {
    console.warn("Gemini explanation failed or fell back to rule-based engine:", err instanceof Error ? err.message : err);
    return ruleBasedExplanation(ctx);
  }
}

export async function askCivicAssistant(
  question: string,
  institutions: Institution[],
  junctions: Junction[],
  apiKeyOverride?: string,
): Promise<{ answer: string; source: "gemini" | "rule-based" }> {
  const apiKey = resolveApiKey(apiKeyOverride);
  if (!apiKey) {
    return {
      answer: `[Rule-based civic assistant] In the Moodbidri pilot area, ${institutions.length} institutions coordinate traffic around ${junctions.length} junctions. To get full generative AI explanations, please configure your Google Gemini API key in the backend or Settings.`,
      source: "rule-based",
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
You are CityWeave AI's civic traffic coordination expert for Moodbidri, Karnataka.
Answer the following coordinator question accurately based on the registered pilot data.

INSTITUTIONS:
${institutions.map((i) => `- ${i.name} (${i.type}): ${formatTime(i.startTime)}–${formatTime(i.endTime)}, ~${i.dailyArrivals} arrivals, junction: ${i.junctionId}`).join("\n")}

JUNCTIONS:
${junctions.map((j) => `- ${j.name} (${j.id}): delay ${j.avgDelayMinutes[0]}–${j.avgDelayMinutes[1]} min, issues: ${j.commonIssues.join("; ")}`).join("\n")}

QUESTION: ${question}

Provide a concise, helpful, and objective answer in 2-3 short paragraphs.
`.trim();

    const modelsToTry = ["gemini-3.5-flash", "gemini-3.5-flash-lite"];
    let lastError: unknown = null;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });
        const answer = response.text?.trim();
        if (answer) {
          return {
            answer,
            source: "gemini",
          };
        }
      } catch (err) {
        lastError = err;
        console.warn(`Civic Assistant model ${model} failed, attempting fallback:`, err instanceof Error ? err.message : err);
      }
    }

    throw lastError || new Error("Empty response from Gemini API");
  } catch (err) {
    return {
      answer: `Could not reach Gemini API: ${err instanceof Error ? err.message : "Network error"}. Please check your API key.`,
      source: "rule-based",
    };
  }
}
