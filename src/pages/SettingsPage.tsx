import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button, Card, PageHeader, Spinner } from "../components/common/ui";
import { useStore } from "../data/useStore";

export function SettingsPage() {
  const { institutions, junctions, observations, recommendations, scheduleVersions, resetSampleData } = useStore();
  const [result, setResult] = useState<{ text: string; error?: boolean } | null>(null);
  const [resetting, setResetting] = useState(false);

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
      <PageHeader title="Settings" description="Prototype data and storage." />
      <Card className="max-w-2xl p-6">
        <h2 className="font-semibold">Stored data</h2>
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
          <h2 className="font-semibold">Reset sample data</h2>
          <p className="mt-1 text-sm text-muted">Restore the original Moodbidri sample institutions, junctions and observations.</p>
          <Button variant="danger" className="mt-3" onClick={reset} disabled={resetting}>
            {resetting ? <Spinner /> : <RotateCcw className="h-4 w-4" />} Reset sample data
          </Button>
          {result && <p className={`mt-2 text-sm ${result.error ? "text-danger" : "text-success"}`}>{result.text}</p>}
        </div>
      </Card>
    </>
  );
}
