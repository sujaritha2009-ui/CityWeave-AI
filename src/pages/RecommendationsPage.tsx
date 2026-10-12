import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Pencil,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  EstimateNotice,
  PageHeader,
  Spinner,
  StatusBadge,
} from "../components/common/ui";
import type { Recommendation, RecommendationStatus } from "@shared/types";
import { useStore } from "../data/useStore";
import { cx } from "../lib/cx";
import { INSTITUTION_TYPES } from "../lib/institutionMeta";
import { approvedShifts, findKeyInsight } from "@shared/recommendationEngine";
import { formatShift, formatTime, shiftTime } from "@shared/time";

type Filter = "all" | RecommendationStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "draft", label: "Awaiting review" },
  { value: "approved", label: "Approved" },
  { value: "modified", label: "Modified" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

export function RecommendationsPage() {
  const {
    institutions,
    junctions,
    recommendations,
    generateRecommendations,
    reviewRecommendation,
    askCivicAssistant,
  } = useStore();

  const [filter, setFilter] = useState<Filter>("draft");
  const [generating, setGenerating] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Modify modal / drawer state
  const [modifyingRec, setModifyingRec] = useState<Recommendation | null>(null);
  const [modShift, setModShift] = useState<number>(15);
  const [modNotes, setModNotes] = useState<string>("");

  // Ask AI state
  const [showAssistant, setShowAssistant] = useState(false);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [assistantReply, setAssistantReply] = useState<{ answer: string; source: "gemini" | "rule-based" } | null>(null);

  const insight = useMemo(
    () => findKeyInsight(institutions, junctions, approvedShifts(recommendations)),
    [institutions, junctions, recommendations],
  );

  const visible = recommendations
    .filter((r) => filter === "all" || r.status === filter)
    .sort((a, b) => b.estimatedPeakReductionPct - a.estimatedPeakReductionPct);

  const generate = async () => {
    setGenerating(true);
    setMessage(null);
    try {
      const drafts = await generateRecommendations();
      setFilter("draft");
      setMessage({
        text: drafts.length
          ? `Generated ${drafts.length} AI-analyzed schedule recommendation${drafts.length === 1 ? "" : "s"} with Google Gemini explanations.`
          : "No further schedule shifts found that reduce junction peaks within institutions' flexibility limits.",
      });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Could not generate recommendations.", error: true });
    } finally {
      setGenerating(false);
    }
  };

  const handleReview = async (id: string, decision: "approved" | "rejected") => {
    setReviewingId(id);
    setMessage(null);
    try {
      await reviewRecommendation(id, decision);
      setMessage({ text: `Recommendation ${decision} successfully.` });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Could not save the review.", error: true });
    } finally {
      setReviewingId(null);
    }
  };

  const openModifyModal = (rec: Recommendation) => {
    setModifyingRec(rec);
    setModShift(rec.shiftMinutes);
    setModNotes(rec.coordinatorNotes || "");
  };

  const submitModification = async () => {
    if (!modifyingRec) return;
    setReviewingId(modifyingRec.id);
    try {
      await reviewRecommendation(modifyingRec.id, "modified", {
        shiftMinutes: modShift,
        notes: modNotes.trim() || undefined,
      });
      setModifyingRec(null);
      setMessage({ text: "Modified schedule adopted and recorded." });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Could not modify recommendation.", error: true });
    } finally {
      setReviewingId(null);
    }
  };

  const handleAsk = async (queryText?: string) => {
    const q = queryText || question;
    if (!q.trim()) return;
    setAsking(true);
    setAssistantReply(null);
    try {
      const res = await askCivicAssistant(q);
      setAssistantReply(res);
    } catch (err) {
      setAssistantReply({
        answer: err instanceof Error ? err.message : "Failed to query AI assistant.",
        source: "rule-based",
      });
    } finally {
      setAsking(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Schedule Recommendations"
        description="AI-assisted schedule adjustments to stagger arrivals at congested junctions. Evaluated deterministically and explained by Google Gemini."
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowAssistant(!showAssistant)}
              className="flex items-center gap-1.5"
            >
              <Bot className="h-4 w-4 text-purple-600" />
              <span>Ask Civic AI</span>
            </Button>
            <Button onClick={generate} disabled={generating || institutions.length === 0}>
              {generating ? <Spinner /> : <Sparkles className="h-4 w-4" />}
              {generating ? "Running Gemini Analysis…" : "Generate AI Recommendations"}
            </Button>
          </div>
        }
      />

      {/* Ask Civic AI Assistant Drawer */}
      {showAssistant && (
        <Card className="mb-6 border-purple-200 bg-gradient-to-br from-purple-50/70 to-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-purple-100 p-2 text-purple-700">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-semibold text-sm text-brand flex items-center gap-2">
                  CityWeave Civic Assistant
                  <Badge tone="blue" className="text-[10px]">Powered by Google Gemini</Badge>
                </h3>
                <p className="text-xs text-muted">
                  Ask questions about institutional schedules, junction bottlenecks, or traffic patterns in Moodbidri.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAssistant(false)}
              className="rounded p-1 text-slate-400 hover:text-slate-600"
            >
              &times;
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="text-muted self-center">Try asking:</span>
            {[
              "Why is Vidyagiri Junction congested around 8:45 AM?",
              "How does Central Public School contribute to Bus Stand Junction delays?",
              "What happens if college start times are staggered by 15 minutes?",
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setQuestion(preset);
                  void handleAsk(preset);
                }}
                className="rounded-full border border-purple-200 bg-white px-2.5 py-1 text-[11px] text-purple-700 hover:bg-purple-100/50"
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="Ask a question about pilot traffic or schedules…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleAsk();
              }}
              className="flex-1 rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-2xs focus:border-purple-500 focus:outline-hidden"
            />
            <Button onClick={() => void handleAsk()} disabled={asking || !question.trim()}>
              {asking ? <Spinner /> : <Send className="h-3.5 w-3.5" />}
              <span>{asking ? "Consulting Gemini…" : "Ask AI"}</span>
            </Button>
          </div>

          {assistantReply && (
            <div className="mt-3 rounded-lg border border-purple-100 bg-white p-3 text-xs text-slate-700">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-[11px] text-purple-800">Civic AI Analysis:</span>
                <Badge tone={assistantReply.source === "gemini" ? "blue" : "gray"} className="text-[10px]">
                  {assistantReply.source === "gemini" ? "Google Gemini" : "Rule-based Fallback"}
                </Badge>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{assistantReply.answer}</p>
            </div>
          )}
        </Card>
      )}

      {/* Key Insight Banner */}
      {insight && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-card">
          <div className="flex gap-3">
            <span className="h-fit rounded-lg bg-amber-100 p-2 text-warning">
              <Lightbulb className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-sm">Key Junction Influx Insight</p>
              <p className="mt-1 text-sm text-slate-700">
                {insight.institutionCount} institution{insight.institutionCount === 1 ? "" : "s"} generate overlapping arrivals in the{" "}
                <strong>{insight.windowLabel}</strong> window at <strong>{insight.junction.name}</strong>, contributing approximately{" "}
                <strong>{insight.peakArrivals.toLocaleString()}</strong> people in 15 minutes. Staggering start times distributes this peak across approach corridors.
              </p>
            </div>
          </div>
        </div>
      )}

      {message && (
        <p
          className={cx(
            "mb-4 rounded-lg px-4 py-2 text-sm",
            message.error ? "border border-red-200 bg-red-50 text-red-700" : "bg-primary-soft text-primary",
          )}
        >
          {message.text}
        </p>
      )}

      {/* Filter Tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const count = recommendations.filter((r) => f.value === "all" || r.status === f.value).length;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cx(
                "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                filter === f.value ? "border-primary bg-primary text-white" : "border-line bg-white text-slate-600 hover:bg-primary-soft",
              )}
            >
              {f.label} ({count})
            </button>
          );
        })}
        {recommendations.some((r) => r.status !== "rejected") && (
          <Link to="/app/compare" className="ml-auto flex items-center gap-1 text-sm font-semibold text-primary">
            Compare schedules <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* List of Recommendations */}
      {visible.length === 0 ? (
        <EmptyState
          title={recommendations.length === 0 ? "No recommendations generated yet" : "No recommendations in this status"}
          description={
            recommendations.length === 0
              ? "Click “Generate AI Recommendations” to analyze overlapping schedules and generate Gemini-explained proposals."
              : "Switch filter tabs to view draft, approved, or modified recommendations."
          }
        />
      ) : (
        <div className="space-y-4">
          {visible.map((r) => {
            const inst = institutions.find((i) => i.id === r.institutionId);
            const junction = junctions.find((j) => j.id === r.junctionId);
            const meta = inst ? INSTITUTION_TYPES[inst.type] : INSTITUTION_TYPES.office;
            const Icon = meta.icon;
            const isExpanded = expandedCardId === r.id;

            return (
              <Card key={r.id} className="p-5 transition-all hover:shadow-hover">
                <div className="flex flex-wrap items-start gap-4">
                  <span className={`rounded-lg p-2.5 ${meta.tile}`}>
                    <Icon className="h-5 w-5" />
                  </span>

                  <div className="min-w-64 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-base">{inst?.name ?? "Unknown institution"}</p>
                      <StatusBadge status={r.status} />
                      {r.aiExplanation && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                          <Sparkles className="h-3 w-3 text-purple-600" />
                          {r.aiExplanation.source === "gemini" ? "Google Gemini Explanation" : "Rule-based Explanation"}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted mt-0.5">
                      Bottleneck junction: <strong>{junction?.name}</strong>
                    </p>

                    {/* Schedule Shift Display */}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="rounded-lg bg-slate-50 px-3 py-1.5 border border-line">
                        <span className="text-[10px] text-muted uppercase font-bold block">Current Start</span>
                        <span className="text-sm font-semibold">{formatTime(r.originalStart)}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted" />
                      <div className="rounded-lg bg-emerald-50 px-3 py-1.5 border border-emerald-200">
                        <span className="text-[10px] text-emerald-700 uppercase font-bold block">Proposed Start</span>
                        <span className="text-sm font-bold text-emerald-800">{formatTime(r.proposedStart)}</span>
                      </div>
                      <Badge tone="blue">{formatShift(r.shiftMinutes)}</Badge>
                      <Badge tone="green">−{r.estimatedPeakReductionPct}% est. junction peak</Badge>
                    </div>

                    {/* Executive Summary */}
                    <p className="mt-3 text-sm text-slate-700 leading-relaxed font-medium">
                      {r.aiExplanation?.summary || r.rationale}
                    </p>

                    {/* Coordinator Notes if modified */}
                    {r.coordinatorNotes && (
                      <div className="mt-2 text-xs bg-blue-50 border border-blue-200 rounded p-2 text-blue-900">
                        <strong>Coordinator Note:</strong> {r.coordinatorNotes}
                      </div>
                    )}

                    {/* Expandable AI Breakdown */}
                    {r.aiExplanation && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => setExpandedCardId(isExpanded ? null : r.id)}
                          className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          {isExpanded ? "Hide detailed AI reasoning & observations" : "Show detailed AI reasoning, observations & assumptions"}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3.5 text-xs border border-line">
                            <div>
                              <strong className="text-slate-900 block font-semibold">AI Reasoning & Traffic Impact:</strong>
                              <p className="mt-0.5 text-slate-600 leading-relaxed">{r.aiExplanation.reasoning}</p>
                            </div>

                            {r.aiExplanation.supportingObservations.length > 0 && (
                              <div className="pt-2 border-t border-line/60">
                                <strong className="text-slate-900 block font-semibold">Supporting Observations:</strong>
                                <ul className="mt-1 list-disc list-inside space-y-0.5 text-slate-600">
                                  {r.aiExplanation.supportingObservations.map((obs, idx) => (
                                    <li key={idx}>{obs}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {r.aiExplanation.assumptions.length > 0 && (
                              <div className="pt-2 border-t border-line/60">
                                <strong className="text-slate-900 block font-semibold">Operational Assumptions & Limitations:</strong>
                                <ul className="mt-1 list-disc list-inside space-y-0.5 text-slate-500">
                                  {r.aiExplanation.assumptions.map((asm, idx) => (
                                    <li key={idx}>{asm}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {r.status === "draft" && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          variant="danger"
                          disabled={reviewingId !== null}
                          onClick={() => void handleReview(r.id, "rejected")}
                          className="px-2.5 py-1.5 text-xs"
                        >
                          <X className="h-3.5 w-3.5" /> Reject
                        </Button>

                        <Button
                          variant="secondary"
                          disabled={reviewingId !== null}
                          onClick={() => openModifyModal(r)}
                          className="px-2.5 py-1.5 text-xs"
                        >
                          <Pencil className="h-3.5 w-3.5 text-primary" /> Modify
                        </Button>

                        <Button
                          variant="success"
                          disabled={reviewingId !== null}
                          onClick={() => void handleReview(r.id, "approved")}
                          className="px-2.5 py-1.5 text-xs"
                        >
                          <Check className="h-3.5 w-3.5" /> Approve
                        </Button>
                      </div>
                    )}

                    {r.reviewedAt && (
                      <p className="text-[11px] text-muted">
                        Reviewed {new Date(r.reviewedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modify Proposal Modal */}
      {modifyingRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-line bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-brand flex items-center gap-2">
                <Pencil className="h-4 w-4 text-primary" />
                Modify Schedule Recommendation
              </h3>
              <button
                type="button"
                onClick={() => setModifyingRec(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <p className="mt-1 text-xs text-muted">
              Adjust the proposed arrival shift for coordinator approval.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block">Baseline Start Time</label>
                <p className="text-sm font-semibold">{formatTime(modifyingRec.originalStart)}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block">Adjust Shift (Minutes)</label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {[-30, -15, -10, 10, 15, 30].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setModShift(mins)}
                      className={cx(
                        "rounded-lg border px-3 py-1 text-xs font-semibold",
                        modShift === mins
                          ? "border-primary bg-primary text-white"
                          : "border-line bg-white text-slate-700 hover:bg-slate-50",
                      )}
                    >
                      {formatShift(mins)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-200">
                <span className="text-xs text-emerald-800 font-semibold block">Adjusted Start Time:</span>
                <span className="text-base font-bold text-emerald-900">
                  {formatTime(shiftTime(modifyingRec.originalStart, modShift))} ({formatShift(modShift)})
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block">Coordinator Note (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Adjusted to 9:10 AM to accommodate college bus arrivals..."
                  value={modNotes}
                  onChange={(e) => setModNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-white p-2 text-xs shadow-2xs focus:border-primary focus:outline-hidden"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModifyingRec(null)}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <Button onClick={() => void submitModification()} disabled={reviewingId !== null}>
                <Check className="h-3.5 w-3.5" />
                Adopt Modified Schedule
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <EstimateNotice>
          Recommendations are generated by combining deterministic arrival profiling with Google Gemini plain-language explanations.
          All peak reductions are scenario estimates based on pilot observations; schedule adjustments must be voluntarily adopted by institutional coordinators.
        </EstimateNotice>
      </div>
    </>
  );
}
