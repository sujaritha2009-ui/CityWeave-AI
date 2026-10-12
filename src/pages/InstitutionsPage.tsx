import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button, Card, EmptyState, PageHeader } from "../components/common/ui";
import type { InstitutionType } from "@shared/types";
import { useStore } from "../data/useStore";
import { cx, inputClass } from "../lib/cx";
import { INSTITUTION_TYPES, INSTITUTION_TYPE_OPTIONS } from "../lib/institutionMeta";
import { formatTime } from "@shared/time";

export function InstitutionsPage() {
  const { institutions, junctions, deleteInstitution } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<InstitutionType | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return institutions.filter((i) => (type === "all" || i.type === type) && (!q || i.name.toLowerCase().includes(q)));
  }, [institutions, query, type]);

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete ${name}? Its recommendations and approved schedule versions will also be removed.`)) return;
    setDeleteError(null);
    try {
      await deleteInstitution(id);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : `Could not delete ${name}.`);
    }
  };

  return (
    <>
      <PageHeader
        title="Institutions"
        description="Institution details and operating schedules used for recommendations."
        actions={
          <Button onClick={() => navigate("/app/institutions/new")}>
            <Plus className="h-4 w-4" /> Add Institution
          </Button>
        }
      />

      <Card className="p-4">
        {deleteError && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{deleteError}</p>
        )}
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted" />
            <input
              className={cx(inputClass, "pl-9")}
              placeholder="Search institutions…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select className={cx(inputClass, "w-48")} value={type} onChange={(e) => setType(e.target.value as InstitutionType | "all")}>
            <option value="all">All types</option>
            {INSTITUTION_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {institutions.length === 0 ? (
          <EmptyState
            title="No institutions yet"
            description="Add the colleges, hospitals and offices near your pilot junctions to start analysing overlaps."
            action={<Button onClick={() => navigate("/app/institutions/new")}>Add Institution</Button>}
          />
        ) : filtered.length === 0 ? (
          <EmptyState title="No matching institutions" description="Try a different search term or type filter." />
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((i) => {
              const meta = INSTITUTION_TYPES[i.type];
              const Icon = meta.icon;
              const junction = junctions.find((j) => j.id === i.junctionId);
              return (
                <li key={i.id} className="flex flex-wrap items-center gap-4 py-4">
                  <span className={`rounded-lg p-2.5 ${meta.tile}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-48 flex-1">
                    <p className="font-semibold">{i.name}</p>
                    <p className="text-xs text-muted">
                      {meta.label}
                      {junction && ` · near ${junction.name}`}
                    </p>
                  </div>
                  <div className="w-40 text-sm">
                    <p>Start: {formatTime(i.startTime)}</p>
                    <p className="text-muted">End: {formatTime(i.endTime)}</p>
                  </div>
                  <div className="w-32 text-sm">
                    <p className="font-semibold">{i.dailyArrivals.toLocaleString()}</p>
                    <p className="text-xs text-muted">arrivals / day</p>
                  </div>
                  <div className="w-28 text-sm">
                    <p className="font-semibold">±{i.flexibilityMinutes} min</p>
                    <p className="text-xs text-muted">flexibility</p>
                  </div>
                  <div className="flex gap-1">
                    <Link
                      to={`/app/map?institution=${i.id}`}
                      className="rounded-lg p-2 text-muted hover:bg-primary-soft hover:text-primary"
                      title="View on map"
                    >
                      <MapPin className="h-4 w-4" />
                    </Link>
                    <Link
                      to={`/app/institutions/${i.id}/edit`}
                      className="rounded-lg p-2 text-muted hover:bg-primary-soft hover:text-primary"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(i.id, i.name)}
                      className="rounded-lg p-2 text-muted hover:bg-red-50 hover:text-danger"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
