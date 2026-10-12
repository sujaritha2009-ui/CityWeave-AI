import { useState, useEffect } from "react";
import { Bot, Check, Layers, RotateCcw, Server, Sparkles } from "lucide-react";
import { Button, Card, PageHeader, Spinner } from "../components/common/ui";
import { useStore } from "../data/useStore";
import {
  getMapProvider,
  setMapProvider,
  type MapProvider,
} from "../lib/googleMaps";

export function SettingsPage() {
  const { institutions, junctions, observations, recommendations, scheduleVersions, resetSampleData } = useStore();
  const [result, setResult] = useState<{ text: string; error?: boolean } | null>(null);
  const [resetting, setResetting] = useState(false);
  const [provider, setProviderState] = useState<MapProvider>(getMapProvider());

  useEffect(() => {
    const handleProviderChange = () => setProviderState(getMapProvider());
    window.addEventListener("cityweave_map_provider_change", handleProviderChange);
    return () => {
      window.removeEventListener("cityweave_map_provider_change", handleProviderChange);
    };
  }, []);

  const handleProviderSelect = (newProvider: MapProvider) => {
    setProviderState(newProvider);
    setMapProvider(newProvider);
  };

  const reset = async () => {
    if (!window.confirm("Reset all data to the Moodbidri sample? Your institutions and review decisions will be lost.")) return;
    setResetting(true);
    setResult(null);
    try {
      await resetSampleData();
      setResult({ text: "Sample data restored." });
    } catch (err) {
      setResult({ text: err instanceof Error ? err.message : "Could not reset the data.", error: true });
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <PageHeader title="Settings" description="Platform configuration, Google AI &amp; Maps integrations, and prototype storage." />

      <div className="space-y-6 max-w-3xl">
        {/* Google Gemini AI Service Status */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="rounded-lg bg-purple-50 p-2 text-purple-700">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-base flex items-center gap-2">
                  Google Gemini AI Service
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Connected via Backend
                  </span>
                </h2>
                <p className="text-xs text-muted">
                  Schedule explanations and plain-language civic assistant connected directly through the server API.
                </p>
              </div>
            </div>
            <Server className="h-5 w-5 text-muted hidden sm:block" />
          </div>

          <div className="mt-4 rounded-lg bg-purple-50/50 p-4 border border-purple-100">
            <div className="flex items-center justify-between text-xs text-slate-700 mb-2">
              <span className="font-semibold text-purple-900">Active AI Model:</span>
              <span className="font-mono font-semibold text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200">
                gemini-3.5-flash
              </span>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <span>AI Schedule Explanations</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <span>Supporting Traffic Observations</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <span>Transparent Model Assumptions</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <span>Interactive Civic AI Q&amp;A Assistant</span>
              </li>
            </ul>
          </div>
        </Card>

        {/* Google Maps Platform Service Status & Provider Toggle */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="rounded-lg bg-blue-50 p-2 text-primary">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-base flex items-center gap-2">
                  Google Maps Platform
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Connected via Backend
                  </span>
                </h2>
                <p className="text-xs text-muted">
                  Interactive vector &amp; satellite maps, live traffic overlays, and corridor routing.
                </p>
              </div>
            </div>
            <Layers className="h-5 w-5 text-muted hidden sm:block" />
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Map Engine Selector</label>
              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => handleProviderSelect("google")}
                  className={`flex flex-1 items-center justify-between rounded-xl border p-3 text-left transition-all ${
                    provider === "google"
                      ? "border-primary bg-primary-soft/50 ring-2 ring-primary/20"
                      : "border-line bg-white hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-brand">Google Maps Platform (Default)</p>
                    <p className="text-[11px] text-muted">Live TrafficLayer, Places Autocomplete &amp; Corridors</p>
                  </div>
                  {provider === "google" && <Check className="h-4 w-4 text-primary" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleProviderSelect("osm")}
                  className={`flex flex-1 items-center justify-between rounded-xl border p-3 text-left transition-all ${
                    provider === "osm"
                      ? "border-primary bg-primary-soft/50 ring-2 ring-primary/20"
                      : "border-line bg-white hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-brand">OpenStreetMap (Leaflet)</p>
                    <p className="text-[11px] text-muted">Local OSM tile view</p>
                  </div>
                  {provider === "osm" && <Check className="h-4 w-4 text-primary" />}
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-canvas p-3.5 border border-line/60">
              <h3 className="text-xs font-semibold text-brand">Connected Google Maps Platform Products:</h3>
              <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <strong>Maps JavaScript API:</strong> Vector &amp; Satellite base maps
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <strong>TrafficLayer:</strong> Real-time road congestion overlay
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <strong>Places API:</strong> Institutional address search &amp; autocomplete
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <strong>Geocoding API:</strong> Latitude/Longitude address resolution
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <strong>Routes &amp; Directions:</strong> Influx corridor alignment lines
                </li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Prototype Data Summary */}
        <Card className="p-6">
          <h2 className="font-semibold">Stored Data</h2>
          <p className="mt-1 text-sm text-muted">
            Data is stored by the CityWeave API in <code>backend/data/store.json</code>.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {[
              ["Institutions", institutions.length],
              ["Junctions", junctions.length],
              ["Traffic observations", observations.length],
              ["Recommendations", recommendations.length],
              ["Approved schedule versions", scheduleVersions.length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-canvas p-3">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="text-lg font-bold">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 border-t border-line pt-6">
            <h2 className="font-semibold">Reset Sample Data</h2>
            <p className="mt-1 text-sm text-muted">Restore the original Moodbidri sample institutions, junctions, and observations.</p>
            <Button variant="danger" className="mt-3" onClick={reset} disabled={resetting}>
              {resetting ? <Spinner /> : <RotateCcw className="h-4 w-4" />} Reset sample data
            </Button>
            {result && <p className={`mt-2 text-sm ${result.error ? "text-danger" : "text-success"}`}>{result.text}</p>}
          </div>
        </Card>
      </div>
    </>
  );
}
