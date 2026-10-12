import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button, Card, PageHeader } from "../components/common/ui";
import { useStore } from "../data/useStore";

export function SettingsPage() {
  const { institutions, junctions, observations, recommendations, scheduleVersions, resetSampleData } = useStore();
  const [done, setDone] = useState(false);

  const reset = () => {
    if (window.confirm("Reset all data to the Moodbidri sample? Your institutions and review decisions will be lost.")) {
      resetSampleData();
      setDone(true);
    }
  };

  return (
    <>
      <PageHeader title="Settings" description="Prototype data and storage." />
      <Card className="max-w-2xl p-6">
        <h2 className="font-semibold">Stored data</h2>
        <p className="mt-1 text-sm text-muted">
          This prototype stores everything in your browser&apos;s local storage. Nothing is sent to a server.
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
          <Button variant="danger" className="mt-3" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Reset sample data
          </Button>
          {done && <p className="mt-2 text-sm text-success">Sample data restored.</p>}
        </div>
      </Card>
    </>
  );
}
