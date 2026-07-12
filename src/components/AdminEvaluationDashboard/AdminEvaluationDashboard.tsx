import { BarChart3, Clock, DatabaseZap, PlayCircle } from "lucide-react";
import { RetrievalResponse } from "../../types";

type Props = {
  response?: RetrievalResponse | null;
  onRunGoldenQuery: (query: string) => void;
};

const goldenQueries = [
  "How do I configure OAuth for API v3.2?",
  "Customer Beta Systems is getting 401 errors. Check their account and suggest fix.",
];

export function AdminEvaluationDashboard({ response, onRunGoldenQuery }: Props) {
  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-ocean">Admin Evaluation</p>
          <h2 className="mt-2 text-2xl font-black">Operational quality dashboard</h2>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <AdminMetric icon={<Clock />} label="Latest latency" value={response ? `${response.latency_ms} ms` : "--"} />
        <AdminMetric icon={<DatabaseZap />} label="Cache signal" value="semantic cache enabled" />
        <AdminMetric icon={<BarChart3 />} label="SLO status" value={response?.success ? "passing" : "waiting"} />
      </div>
      <div className="mt-6">
        <h3 className="font-black">Golden query runner</h3>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {goldenQueries.map((query) => (
            <button
              key={query}
              type="button"
              onClick={() => onRunGoldenQuery(query)}
              className="flex items-start gap-3 rounded-2xl border border-line bg-panel p-4 text-left font-semibold transition hover:border-ocean hover:bg-blue-50"
            >
              <PlayCircle className="mt-1 shrink-0 text-ocean" size={18} aria-hidden="true" />
              <span>{query}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function AdminMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="text-ocean">{icon}</div>
      <p className="mt-4 text-xs font-black uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}
