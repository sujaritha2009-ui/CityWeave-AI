import { useCallback, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { LocationPicker } from "../components/map/LocationPicker";
import { Button, Card, EmptyState, PageHeader } from "../components/common/ui";
import { PILOT_CENTER } from "../data/seed";
import type { InstitutionInput } from "../data/storeContext";
import type { Institution, InstitutionType, Junction } from "../data/types";
import { useStore } from "../data/useStore";
import { inputClass } from "../lib/cx";
import { INSTITUTION_TYPE_OPTIONS } from "../lib/institutionMeta";
import { toMinutes } from "../lib/time";

type Errors = Partial<Record<keyof InstitutionInput, string>>;

function nearestJunction(lat: number, lng: number, junctions: Junction[]): string {
  let best = junctions[0]?.id ?? "";
  let bestDist = Infinity;
  for (const j of junctions) {
    const d = (j.lat - lat) ** 2 + (j.lng - lng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = j.id;
    }
  }
  return best;
}

function emptyForm(junctions: Junction[]): InstitutionInput {
  return {
    name: "",
    type: "college",
    lat: PILOT_CENTER[0],
    lng: PILOT_CENTER[1],
    startTime: "09:00",
    endTime: "16:00",
    dailyArrivals: 500,
    flexibilityMinutes: 15,
    junctionId: nearestJunction(PILOT_CENTER[0], PILOT_CENTER[1], junctions),
    notes: "",
  };
}

function validate(form: InstitutionInput): Errors {
  const errors: Errors = {};
  if (!form.name.trim()) errors.name = "Institution name is required.";
  if (!form.startTime) errors.startTime = "Start time is required.";
  if (!form.endTime) errors.endTime = "End time is required.";
  if (form.startTime && form.endTime && toMinutes(form.endTime) <= toMinutes(form.startTime)) {
    errors.endTime = "End time must be after the start time.";
  }
  if (!Number.isFinite(form.dailyArrivals) || form.dailyArrivals <= 0) {
    errors.dailyArrivals = "Enter an approximate number of daily arrivals greater than 0.";
  }
  if (!Number.isFinite(form.flexibilityMinutes) || form.flexibilityMinutes < 0 || form.flexibilityMinutes > 120) {
    errors.flexibilityMinutes = "Flexibility must be between 0 and 120 minutes.";
  }
  if (!form.junctionId) errors.junctionId = "Select the junction most affected by this institution.";
  return errors;
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-danger">{error}</span> : hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function InstitutionFormPage() {
  const { id } = useParams();
  const { institutions, junctions } = useStore();
  const existing = id ? institutions.find((i) => i.id === id) : undefined;

  if (id && !existing) {
    return (
      <EmptyState
        title="Institution not found"
        action={<Link to="/app/institutions" className="font-semibold text-primary">Back to institutions</Link>}
      />
    );
  }
  return <InstitutionForm key={id ?? "new"} existing={existing} junctions={junctions} />;
}

function InstitutionForm({ existing, junctions }: { existing?: Institution; junctions: Junction[] }) {
  const { addInstitution, updateInstitution } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState<InstitutionInput>(() => {
    if (!existing) return emptyForm(junctions);
    const rest: Partial<Institution> = { ...existing };
    delete rest.id;
    return rest as InstitutionInput;
  });
  const [errors, setErrors] = useState<Errors>({});

  const set = <K extends keyof InstitutionInput>(key: K, value: InstitutionInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onLocationChange = useCallback(
    (lat: number, lng: number) => setForm((f) => ({ ...f, lat, lng, junctionId: nearestJunction(lat, lng, junctions) })),
    [junctions],
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next = validate(form);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const clean = { ...form, name: form.name.trim(), notes: form.notes.trim() };
    if (existing) updateInstitution(existing.id, clean);
    else addInstitution(clean);
    navigate("/app/institutions");
  };

  return (
    <>
      <Link to="/app/institutions" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
        <ArrowLeft className="h-4 w-4" /> Institutions
      </Link>
      <PageHeader
        title={existing ? "Edit Institution" : "Add Institution"}
        description="Enter the institution's operating schedule and approximate daily arrivals."
      />

      <form onSubmit={onSubmit} noValidate>
        <div className="grid gap-6 xl:grid-cols-5">
          <Card className="space-y-4 p-6 xl:col-span-3">
            <Field label="Institution name *" error={errors.name}>
              <input className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. ABC Engineering College" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type *">
                <select className={inputClass} value={form.type} onChange={(e) => set("type", e.target.value as InstitutionType)}>
                  {INSTITUTION_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nearest junction *" error={errors.junctionId} hint="Auto-selected from the map pin; change if needed.">
                <select className={inputClass} value={form.junctionId} onChange={(e) => set("junctionId", e.target.value)}>
                  {junctions.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Start time *" error={errors.startTime}>
                <input type="time" className={inputClass} value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
              </Field>
              <Field label="End time *" error={errors.endTime}>
                <input type="time" className={inputClass} value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Approx. daily arrivals *" error={errors.dailyArrivals} hint="Students, staff and visitors combined.">
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={Number.isFinite(form.dailyArrivals) ? form.dailyArrivals : ""}
                  onChange={(e) => set("dailyArrivals", e.target.valueAsNumber)}
                />
              </Field>
              <Field
                label="Schedule flexibility (minutes)"
                error={errors.flexibilityMinutes}
                hint="How far the start time could move earlier or later. 0 = fixed."
              >
                <input
                  type="number"
                  min={0}
                  max={120}
                  step={15}
                  className={inputClass}
                  value={Number.isFinite(form.flexibilityMinutes) ? form.flexibilityMinutes : ""}
                  onChange={(e) => set("flexibilityMinutes", e.target.valueAsNumber)}
                />
              </Field>
            </div>

            <Field label="Additional information">
              <textarea
                rows={3}
                className={inputClass}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Bus timings, special events, constraints…"
              />
            </Field>
          </Card>

          <Card className="space-y-3 p-6 xl:col-span-2">
            <p className="text-sm font-semibold">Location</p>
            <LocationPicker lat={form.lat} lng={form.lng} junctions={junctions} onChange={onLocationChange} />
            <p className="text-xs text-muted">
              Click the map or drag the pin. Blue circles are monitored junctions. ({form.lat.toFixed(5)}, {form.lng.toFixed(5)})
            </p>
          </Card>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => navigate("/app/institutions")}>
            Cancel
          </Button>
          <Button type="submit">Save Institution</Button>
        </div>
      </form>
    </>
  );
}
