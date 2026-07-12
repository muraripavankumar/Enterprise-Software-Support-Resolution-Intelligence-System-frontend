import { useAuth0 } from "@auth0/auth0-react";
import { AlertCircle, Clipboard, FileText, Loader2, Send, Table2 } from "lucide-react";
import { FormEvent, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { streamSupportQuery } from "../../api/client";
import { RetrievalMode, RetrievalResponse, RetrievalSourceNode } from "../../types";
import { EscalationAlert } from "../EscalationAlert/EscalationAlert";

type Props = {
  canEscalate: boolean;
  onResponse: (response: RetrievalResponse | null) => void;
  onLoadingChange: (loading: boolean) => void;
  externalQuery?: string | null;
};

const prompts = [
  "How do I configure OAuth for API v3.2?",
  "Customer Beta Systems is getting 401 errors. Check their account and suggest fix.",
];

export function QueryInterface({ canEscalate, onResponse, onLoadingChange, externalQuery }: Props) {
  const { getAccessTokenSilently } = useAuth0();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<RetrievalMode>("agent");
  const [response, setResponse] = useState<RetrievalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState("");
  const [streamingAnswer, setStreamingAnswer] = useState("");
  const [streamStatus, setStreamStatus] = useState("Preparing request");
  const citationRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const disabledByEscalation = Boolean(response?.escalation_flag && !canEscalate);

  useMemo(() => {
    if (externalQuery) {
      setQuery(externalQuery);
    }
  }, [externalQuery]);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || loading || disabledByEscalation) return;

    setLoading(true);
    onLoadingChange(true);
    setError(null);
    setResponse(null);
    onResponse(null);
    setActiveQuestion(trimmed);
    setStreamingAnswer("");
    setStreamStatus("Opening secure stream");
    try {
      await streamSupportQuery(getAccessTokenSilently, trimmed, mode, {
        onStatus: (payload) => {
          setStreamStatus(payload.message || "Working on request");
        },
        onDelta: (text) => {
          setStreamingAnswer((current) => current + text);
        },
        onFinal: (result) => {
          setResponse(result);
          onResponse(result);
        },
      });
    } catch (exc) {
      const message = exc instanceof Error ? exc.message : "Support query failed.";
      setError(message);
      onResponse(null);
    } finally {
      setLoading(false);
      onLoadingChange(false);
    }
  }

  function scrollToCitation(id: number) {
    citationRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <section className="space-y-5">
      <form onSubmit={submit} className="rounded-3xl border border-line bg-white shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-5">
          <div>
            <h1 className="text-2xl font-black">Ask ERIS</h1>
            <p className="text-sm text-muted">Ask support questions, inspect evidence, and route escalations.</p>
          </div>
          <label className="sr-only" htmlFor="query-mode">
            Retrieval mode
          </label>
          <select
            id="query-mode"
            value={mode}
            onChange={(event) => setMode(event.target.value as RetrievalMode)}
            className="rounded-2xl border border-line bg-white px-4 py-3 font-semibold"
          >
            <option value="agent">Agent</option>
            <option value="vector">RAG</option>
            <option value="sql">SQL</option>
          </select>
        </div>
        <div className="p-5">
          <textarea
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={loading || disabledByEscalation}
            placeholder="Ask about incidents, tickets, APIs, customers, policies, or troubleshooting..."
            className="min-h-36 w-full resize-y rounded-2xl border border-line bg-white p-4 leading-7 outline-none transition focus:border-ocean focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setQuery(prompt)}
                  className="rounded-full border border-line bg-panel px-3 py-2 text-xs font-bold text-muted transition hover:border-ocean hover:text-ocean"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={!query.trim() || loading || disabledByEscalation}
              className="inline-flex items-center gap-2 rounded-2xl bg-ocean px-5 py-3 font-black text-white shadow-lg transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
              Analyze
            </button>
          </div>
          {disabledByEscalation ? (
            <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Input is paused because this case escalated. A support_manager or admin can continue escalation handling.
            </p>
          ) : null}
        </div>
      </form>

      {loading ? <StreamingCard question={activeQuestion} answer={streamingAnswer} status={streamStatus} /> : null}
      {error ? <ErrorCard message={error} onRetry={() => submit()} /> : null}
      {response ? (
        <AnswerCard response={response} onCitationClick={scrollToCitation} citationRefs={citationRefs.current} />
      ) : !loading && !error ? (
        <EmptyState onPickPrompt={setQuery} />
      ) : null}
      <EscalationAlert response={response} />
    </section>
  );
}

function StreamingCard({ question, answer, status }: { question: string; answer: string; status: string }) {
  return (
    <div className="rounded-3xl border border-line bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-ocean">Streaming response</p>
          <h2 className="mt-1 text-lg font-black">{question}</h2>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-black text-ocean">
          <Loader2 className="animate-spin" size={16} aria-hidden="true" />
          Live
        </span>
      </div>
      <div className="mt-5 rounded-2xl border border-line bg-panel p-4">
        <div className="flex items-center gap-3 text-sm font-bold text-muted">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-ocean" />
          {status}
        </div>
      </div>
      <div className="mt-5 rounded-2xl border border-line bg-white p-5">
        {answer ? (
          <div className="prose-support max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
            <span className="ml-1 inline-block h-5 w-2 animate-pulse rounded-sm bg-ocean align-middle" aria-hidden="true" />
          </div>
        ) : (
          <div className="space-y-3" aria-label="Waiting for first answer tokens">
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  const isPermissionError = /permission|403|forbidden/i.test(message);
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-800">
      <div className="flex gap-3">
        <AlertCircle aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="font-black">Request failed</h2>
          <p className="mt-1 text-sm">{message}</p>
          {isPermissionError ? (
            <p className="mt-2 text-sm">
              Your Auth0 role may not include the required API permission. Confirm the user has
              `ask:support_query` in the access token.
            </p>
          ) : null}
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-black text-red-700 hover:bg-red-100"
          >
            Retry request
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onPickPrompt }: { onPickPrompt: (prompt: string) => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-white p-8 text-center shadow-soft">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-ocean">
        <FileText aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-xl font-black">Start an investigation</h2>
      <p className="mt-2 text-muted">Pick an example or ask your own support question.</p>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPickPrompt(prompt)}
            className="rounded-2xl border border-line bg-panel p-4 text-left font-semibold transition hover:border-ocean hover:bg-blue-50"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

function AnswerCard({
  response,
  onCitationClick,
  citationRefs,
}: {
  response: RetrievalResponse;
  onCitationClick: (id: number) => void;
  citationRefs: Record<number, HTMLDivElement | null>;
}) {
  const rows = response.structured_result?.raw_results || [];
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).slice(0, 8);

  async function copyAnswer() {
    await navigator.clipboard.writeText(response.answer);
  }

  return (
    <article className="rounded-3xl border border-line bg-white shadow-soft">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-5">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-ocean">Question</p>
          <h2 className="mt-1 text-lg font-black">{response.question}</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-black uppercase">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{response.route_decision || response.mode}</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{response.severity || "severity --"}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{formatSeconds(response.latency_ms)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={copyAnswer}
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold hover:bg-panel"
        >
          <Clipboard size={16} aria-hidden="true" />
          Copy
        </button>
      </header>

      <div className="p-5">
        <section className="rounded-2xl border border-line bg-white p-5">
          <h3 className="text-sm font-black uppercase tracking-wide text-muted">Answer</h3>
          <div className="prose-support mt-3 max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noreferrer" className="font-bold text-ocean underline decoration-blue-200">
                    {children}
                  </a>
                ),
              }}
            >
              {response.answer || "No answer returned."}
            </ReactMarkdown>
          </div>
          {response.citation_references.length ? (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
              <span className="text-xs font-black uppercase tracking-wide text-muted">References</span>
              {response.citation_references.map((citation) => (
                <button
                  key={citation.citation_id}
                  type="button"
                  onClick={() => onCitationClick(citation.citation_id)}
                  className="rounded-lg border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-black text-signal"
                >
                  [{citation.citation_id}]
                </button>
              ))}
            </div>
          ) : null}
        </section>

        {rows.length ? (
          <section className="mt-5 rounded-2xl border border-line bg-white p-5">
            <div className="flex items-center gap-2">
              <Table2 className="text-ocean" aria-hidden="true" />
              <h3 className="font-black">Structured Result</h3>
            </div>
            <p className="mt-1 text-sm text-muted">
              Table checked: {response.structured_result?.table_used || "unknown"} · Records found:{" "}
              {response.structured_result?.row_count ?? rows.length}
            </p>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
              <table className="min-w-full divide-y divide-line text-sm">
                <thead className="bg-panel text-left text-xs uppercase tracking-wide text-muted">
                  <tr>{columns.map((column) => <th key={column} className="px-4 py-3">{column}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((row, index) => (
                    <tr key={index}>
                      {columns.map((column) => (
                        <td key={column} className="max-w-64 truncate px-4 py-3">
                          {String(row[column] ?? "--")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="mt-5 rounded-2xl border border-line bg-panel p-5">
          <h3 className="font-black">Sources</h3>
          {response.source_nodes.length || response.citation_references.length ? (
            <div className="mt-4 grid gap-3">
              {(response.citation_references.length ? response.citation_references : []).map((citation) => {
                const node = response.source_nodes.find((source) => source.source_file === citation.document_name) || response.source_nodes[citation.citation_id - 1];
                return (
                  <CitationCard
                    key={citation.citation_id}
                    citationId={citation.citation_id}
                    title={citation.document_name}
                    pages={citation.pages}
                    node={node}
                    setRef={(element) => {
                      citationRefs[citation.citation_id] = element;
                    }}
                  />
                );
              })}
              {!response.citation_references.length
                ? response.source_nodes.map((node, index) => (
                    <CitationCard
                      key={`${node.source_file}-${index}`}
                      citationId={index + 1}
                      title={node.source_file || "Retrieved evidence"}
                      pages={node.page_number ? [node.page_number] : []}
                      node={node}
                      setRef={(element) => {
                        citationRefs[index + 1] = element;
                      }}
                    />
                  ))
                : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">Evidence unavailable for this response.</p>
          )}
        </section>

      </div>
    </article>
  );
}

function formatSeconds(milliseconds?: number | null) {
  if (milliseconds == null) return "--";
  return `${(milliseconds / 1000).toFixed(milliseconds < 1000 ? 2 : 1)} s`;
}

function CitationCard({
  citationId,
  title,
  pages,
  node,
  setRef,
}: {
  citationId: number;
  title: string;
  pages: number[];
  node?: RetrievalSourceNode;
  setRef: (element: HTMLDivElement | null) => void;
}) {
  const score = node?.similarity_score == null ? null : Math.round((node.similarity_score <= 1 ? node.similarity_score * 100 : node.similarity_score));
  return (
    <div ref={setRef} className="rounded-2xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black">
            [{citationId}] <span className="truncate">{title}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
            {pages.length ? <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">Page {pages.join(", ")}</span> : null}
            {score != null ? <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">{score}% match</span> : null}
            {node?.content_type ? <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">{node.content_type}</span> : null}
          </div>
        </div>
      </div>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">
        {node?.text_preview || "No snippet available."}
      </p>
    </div>
  );
}
