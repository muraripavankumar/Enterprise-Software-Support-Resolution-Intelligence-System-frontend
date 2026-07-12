import { AlertTriangle, ExternalLink } from "lucide-react";
import { RetrievalResponse } from "../../types";

type Props = {
  response?: RetrievalResponse | null;
};

export function EscalationAlert({ response }: Props) {
  if (!response?.escalation_flag) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-900">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-red-100 p-2">
          <AlertTriangle aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-black">Escalation triggered</h3>
          <p className="mt-1 text-sm leading-6">
            This request requires human review before a final automated resolution is provided.
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold uppercase tracking-wide text-red-700">Recommended team</dt>
              <dd>{response.escalation_target || "incident_response"}</dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wide text-red-700">Severity</dt>
              <dd>{response.severity || "critical"}</dd>
            </div>
          </dl>
          {response.jira_tracking?.issue_key ? (
            <a
              href={response.jira_tracking.issue_url || "#"}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
            >
              {response.jira_tracking.issue_key}
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
