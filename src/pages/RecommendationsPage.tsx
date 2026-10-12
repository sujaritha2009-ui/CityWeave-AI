import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Lightbulb, Sparkles, X } from "lucide-react";
import { Badge, Button, Card, EmptyState, EstimateNotice, PageHeader, Spinner, StatusBadge } from "../components/common/ui";
import type { RecommendationStatus } from "@shared/types";
import { useStore } from "../data/useStore";
import { cx } from "../lib/cx";
import { INSTITUTION_TYPES } from "../lib/institutionMeta";
import { approvedShifts, findKeyInsight } from "@shared/recommendationEngine";
import { formatShift, formatTime } from "@shared/time";

type Filter = "all" | RecommendationStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "draft", label: "Awaiting review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

export function RecommendationsPage() {
  const { institutions, junctions, recommendations, generateRecommendations, reviewRecommendation } = useStore();
  const [filter, setFilter] = useState<Filter>("draft");
  const [generating, setGenerating] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

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
          ? `Generated ${drafts.length} recommendation${drafts.length === 1 ? "" : "s"} for review.`
          : "No further shifts found that reduce a junction peak within the institutions' stated flexibility.",
      });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Could not generate recommendations.", error: true });
    } finally {
      setGenerating(false);
    }
  };

  const review = async (id: string, decision: "approved" | "rejected") => {
    setReviewingId(id);
    setMessage(null);
    try {
      await reviewRecommendation(id, decision);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Could not save the review.", error: true });
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Schedule Recommendations"
        description="Suggested timing changes to spread arrivals at busy junctions. Coordinators approve or reject each one."
        actions={
          <Button onClick={generate} disabled={generating || institutions.length === 0}>
            {generating ? <Spinner /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Analysing schedules…" : "Generate New Recommendations"}
          </Button>
        }
      />

      {insight && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-card">
          <div className="flex gap-3">
            <span className="h-fit rounded-lg bg-amber-100 p-2 text-warning">
              <Lightbulb className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">Key insight</p>
              <p className="mt-1 text-sm text-slate-700">
                {insight.institutionCount} institution{insight.institutionCount === 1 ? "" : "s"} contribute arrivals in the{" "}
                <strong>{insight.windowLabel}</strong> window at <strong>{insight.junction.name}</strong>, an estimated{" "}
                {insight.peakArrivals.toLocaleString()} people in 15 minutes. Staggering start times can spread this peak.
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

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const count = recommendations.filter((r) => f.value === "all" || r.status === f.value).length;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cx(
                "rounded-full border px-3 py-1 text-sm font-medium",
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

      {visible.length === 0 ? (
        <EmptyState
          title={recommendations.length === 0 ? "No recommendations yet" : "Nothing in this list"}
          description={
            recommendations.length === 0
              ? "Click “Generate New Recommendations” to analyse overlapping institution schedules."
              : "Choose another filter to see other recommendations."
          }
        />
      ) : (
        <div className="space-y-3">
          {visible.map((r) => {
            const inst = institutions.find((i) => i.id === r.institutionId);
            const junction = junctions.find((j) => j.id === r.junctionId);
            const meta = inst ? INSTITUTION_TYPES[inst.type] : INSTITUTION_TYPES.office;
            const Icon = meta.icon;
            return (
              <Card key={r.id} className="p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <span className={`rounded-lg p-2.5 ${meta.tile}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-64 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{inst?.name ?? "Unknown institution"}</p>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-xs text-muted">{junction?.name}</p>
                    <p className="mt-2 text-lg font-semibold">
                      {formatTime(r.originalStart)} <ArrowRight className="inline h-4 w-4 text-muted" />{" "}
                      <span className="text-success">{formatTime(r.proposedStart)}</span>{" "}
                      <span className="text-sm font-medium text-muted">({formatShift(r.shiftMinutes)})</span>
                    </p>
                    <p className="mt-2 text-sm text-slate-600">{r.rationale}</p>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <Badge tone="green">−{r.estimatedPeakReductionPct}% est. peak</Badge>
                    {r.status === "draft" && (
                      <div className="flex gap-2">
                        <Button variant="danger" disabled={reviewingId !== null} onClick={() => review(r.id, "rejected")}>
                          <X className="h-4 w-4" /> Reject
                        </Button>
                        <Button variant="success" disabled={reviewingId !== null} onClick={() => review(r.id, "approved")}>
                          <Check className="h-4 w-4" /> Approve
                        </Button>
                      </div>
                    )}
                    {r.reviewedAt && <p className="text-xs text-muted">Reviewed {new Date(r.reviewedAt).toLocaleString()}</p>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <EstimateNotice>
          Peak reductions are calculated by a simple arrival model from each institution's schedule and stated flexibility. Approving
          a recommendation records a new schedule version; the original schedule is kept for comparison.
        </EstimateNotice>
      </div>
    </>
  );
}
