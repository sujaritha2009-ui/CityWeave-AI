import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { CityMap } from "../components/map/CityMap";
import { Card, PageHeader } from "../components/common/ui";
import type { CongestionLevel } from "@shared/types";
import { useStore } from "../data/useStore";
import { cx, inputClass } from "../lib/cx";
import { INSTITUTION_TYPES } from "../lib/institutionMeta";
import { CONGESTION_STYLES } from "../lib/congestion";

const LEVELS: CongestionLevel[] = ["low", "moderate", "high"];

export function TrafficMapPage() {
  const { junctions, institutions, observations } = useStore();
  const [params] = useSearchParams();
  const [query, setQuery] = useState("");
  const [levels, setLevels] = useState<CongestionLevel[]>(LEVELS);
  const [focus, setFocus] = useState<[number, number] | undefined>(() => {
    const inst = institutions.find((i) => i.id === params.get("institution"));
    return inst ? [inst.lat, inst.lng] : undefined;
  });

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return [
      ...junctions.map((j) => ({ id: j.id, name: j.name, kind: "Junction", lat: j.lat, lng: j.lng })),
      ...institutions.map((i) => ({ id: i.id, name: i.name, kind: INSTITUTION_TYPES[i.type].label, lat: i.lat, lng: i.lng })),
    ]
      .filter((m) => m.name.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query, junctions, institutions]);

  const toggle = (level: CongestionLevel) =>
    setLevels((prev) => (prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]));

  return (
    <>
      <PageHeader title="Traffic Map" description="Congestion hotspots and nearby institutions. Select a junction for details." />
      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted" />
            <input
              className={cx(inputClass, "pl-9")}
              placeholder="Search junctions or institutions…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {matches.length > 0 && (
              <ul className="absolute z-[1000] mt-1 w-full overflow-hidden rounded-lg border border-line bg-white shadow-hover">
                {matches.map((m) => (
                  <li key={m.id}>
                    <button
                      className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-primary-soft"
                      onClick={() => {
                        setFocus([m.lat, m.lng]);
                        setQuery("");
                      }}
                    >
                      <span className="font-medium">{m.name}</span>
                      <span className="text-xs text-muted">{m.kind}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => toggle(level)}
                className={cx(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
                  levels.includes(level) ? CONGESTION_STYLES[level].badge : "border-line bg-white text-slate-400",
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: CONGESTION_STYLES[level].color }} />
                {CONGESTION_STYLES[level].label}
              </button>
            ))}
          </div>
        </div>

        <CityMap
          junctions={junctions}
          institutions={institutions}
          observations={observations}
          visibleLevels={levels}
          focus={focus}
          zoom={focus ? 16 : 15}
          className="h-[560px]"
        />

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
          <span className="font-semibold text-brand">Institutions:</span>
          {Object.values(INSTITUTION_TYPES).map((t) => (
            <span key={t.label} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
              {t.label}
            </span>
          ))}
          <span className="ml-auto">Congestion levels are derived from sample 15-minute vehicle counts.</span>
        </div>
      </Card>
    </>
  );
}
