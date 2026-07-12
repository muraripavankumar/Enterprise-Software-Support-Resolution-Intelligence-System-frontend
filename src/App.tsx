import { useAuth0 } from "@auth0/auth0-react";
import {
  BarChart3,
  Bell,
  Bot,
  CheckCircle2,
  Circle,
  Clock3,
  ExternalLink,
  FileText,
  Layers,
  LogOut,
  MessageSquare,
  Network,
  RefreshCw,
  Send,
  Shield,
  UserRound,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Navigate, Route, Routes } from "react-router-dom";
import remarkGfm from "remark-gfm";
import { fetchCurrentPrincipal, fetchJiraIssues, ingestPdfDocument, streamSupportQuery } from "./api/client";
import { LoginPage } from "./auth/LoginPage";
import { usePermissions } from "./hooks/usePermissions";
import { logger } from "./lib/logger";
import { BackendPrincipal, JiraIssue, PdfIngestionResponse, RetrievalResponse } from "./types";

type View = "chat" | "log" | "jira" | "evaluation" | "ingestion";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: string;
};

type ConversationEntry = {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
  route?: string | null;
  severity?: string | null;
  latencyMs?: number | null;
  status: "completed" | "failed";
};

type LiveFlowEvent = {
  node?: string;
  message?: string;
  elapsed_seconds?: number;
  route_decision?: string | null;
  severity?: string | null;
};

export function App() {
  const { isAuthenticated, isLoading, user, logout, getAccessTokenSilently } = useAuth0();
  const [principal, setPrincipal] = useState<BackendPrincipal | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<View>("chat");
  const [latestResponse, setLatestResponse] = useState<RetrievalResponse | null>(null);
  const [conversationLog, setConversationLog] = useState<ConversationEntry[]>([]);
  const permissions = usePermissions(principal);

  useEffect(() => {
    if (!isAuthenticated) {
      logger.info("auth_state_unauthenticated");
      setPrincipal(null);
      setIdentityError(null);
      return;
    }

    logger.info("auth_state_authenticated");
    let cancelled = false;
    fetchCurrentPrincipal(getAccessTokenSilently)
      .then((currentPrincipal) => {
        if (!cancelled) {
          setPrincipal(currentPrincipal);
          setIdentityError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          logger.error("backend_identity_fetch_failed");
          setIdentityError(error instanceof Error ? error.message : "Failed to verify backend identity.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [getAccessTokenSilently, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-muted">
        Loading authentication...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/console" replace /> : <LoginPage />} />
      <Route
        path="/console"
        element={
          isAuthenticated ? (
            <Console
              activeView={activeView}
              getAccessTokenSilently={getAccessTokenSilently}
              identityError={identityError}
              latestResponse={latestResponse}
              onLogout={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              onAddConversation={(entry) => setConversationLog((current) => [entry, ...current])}
              onSetActiveView={setActiveView}
              onSetLatestResponse={setLatestResponse}
              conversationLog={conversationLog}
              permissions={permissions}
              userName={user?.name || user?.email || "Support user"}
            />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to={isAuthenticated ? "/console" : "/"} replace />} />
    </Routes>
  );
}

function Console({
  activeView,
  getAccessTokenSilently,
  identityError,
  latestResponse,
  onLogout,
  onAddConversation,
  onSetActiveView,
  onSetLatestResponse,
  conversationLog,
  permissions,
  userName,
}: {
  activeView: View;
  getAccessTokenSilently: Parameters<typeof fetchCurrentPrincipal>[0];
  identityError: string | null;
  latestResponse: RetrievalResponse | null;
  onLogout: () => void;
  onAddConversation: (entry: ConversationEntry) => void;
  onSetActiveView: (view: View) => void;
  onSetLatestResponse: (response: RetrievalResponse | null) => void;
  conversationLog: ConversationEntry[];
  permissions: ReturnType<typeof usePermissions>;
  userName: string;
}) {
  const roleLabel = permissions.role.replace(/_/g, " ");

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="flex min-h-[88px] items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ocean text-white shadow-soft">
              <Shield size={28} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-black">Enterprise Support Intelligence</h1>
              <p className="text-muted">Resolution assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 font-bold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Online
            </span>
            <span className="hidden items-center gap-2 rounded-2xl border border-line bg-panel px-4 py-3 font-semibold text-muted md:inline-flex">
              <Bell size={18} aria-hidden="true" />
              {roleLabel}
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-5 py-3 font-black hover:bg-panel"
            >
              <LogOut size={19} aria-hidden="true" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {identityError ? (
        <div className="border-b border-amber-200 bg-amber-50 px-8 py-3 text-sm text-amber-900">
          <span className="font-black">Backend identity check failed:</span> {identityError}
        </div>
      ) : null}

      <div className="grid gap-5 px-6 py-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="rounded-card border border-line bg-white p-4 shadow-soft">
          <div className="mb-5 flex items-center gap-3 border-b border-line pb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-ocean">
              <UserRound size={22} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-black">{userName}</p>
              <p className="text-sm capitalize text-muted">{roleLabel}</p>
            </div>
          </div>
          <nav className="space-y-2">
            <NavButton active={activeView === "chat"} icon={<MessageSquare />} label="Chat Console" onClick={() => onSetActiveView("chat")} />
            <NavButton active={activeView === "log"} icon={<Clock3 />} label="Conversation Log" onClick={() => onSetActiveView("log")} />
            {permissions.isAdmin ? (
              <>
                <NavButton active={activeView === "jira"} icon={<Layers />} label="Jira Tickets" onClick={() => onSetActiveView("jira")} />
                <NavButton active={activeView === "evaluation"} icon={<BarChart3 />} label="Evaluation" onClick={() => onSetActiveView("evaluation")} />
                <NavButton active={activeView === "ingestion"} icon={<FileText />} label="PDF Ingestion" onClick={() => onSetActiveView("ingestion")} />
              </>
            ) : null}
          </nav>
        </aside>

        <section className="min-w-0">
          {activeView === "chat" ? (
            <ChatWorkspace
              getAccessTokenSilently={getAccessTokenSilently}
              latestResponse={latestResponse}
              onAddConversation={onAddConversation}
              onSetLatestResponse={onSetLatestResponse}
            />
          ) : null}
          {activeView === "log" ? <ConversationLogView entries={conversationLog} /> : null}
          {activeView === "jira" && permissions.isAdmin ? <JiraTicketsView getAccessTokenSilently={getAccessTokenSilently} /> : null}
          {activeView === "evaluation" && permissions.isAdmin ? <EvaluationView response={latestResponse} /> : null}
          {activeView === "ingestion" && permissions.isAdmin ? <PdfIngestionView getAccessTokenSilently={getAccessTokenSilently} /> : null}
        </section>
      </div>
    </main>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-black ${
        active ? "bg-blue-50 text-ocean" : "text-muted hover:bg-panel hover:text-ink"
      }`}
    >
      <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
      {label}
    </button>
  );
}

function ChatWorkspace({
  getAccessTokenSilently,
  latestResponse,
  onAddConversation,
  onSetLatestResponse,
}: {
  getAccessTokenSilently: Parameters<typeof streamSupportQuery>[0];
  latestResponse: RetrievalResponse | null;
  onAddConversation: (entry: ConversationEntry) => void;
  onSetLatestResponse: (response: RetrievalResponse | null) => void;
}) {
  const [question, setQuestion] = useState("");
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamStatus, setStreamStatus] = useState("");
  const [flowEvents, setFlowEvents] = useState<LiveFlowEvent[]>([]);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const assistantId = `assistant-${Date.now()}`;
    setCurrentMessages([
      { id: `user-${Date.now()}`, role: "user", content: trimmed },
      { id: assistantId, role: "assistant", content: "", status: "running" },
    ]);
    setQuestion("");
    setLoading(true);
    setStreamStatus("Starting ERIS orchestration");
    setFlowEvents([{ message: "Starting ERIS orchestration", elapsed_seconds: 0 }]);
    onSetLatestResponse(null);

    try {
      await streamSupportQuery(getAccessTokenSilently, trimmed, "agent", {
        onStatus: (payload) => {
          const event = payload as LiveFlowEvent;
          setStreamStatus(event.message || "Running agent workflow");
          setFlowEvents((current) => [...current, event]);
        },
        onDelta: (text) => {
          setCurrentMessages((current) =>
            current.map((message) =>
              message.id === assistantId ? { ...message, content: `${message.content}${text}` } : message,
            ),
          );
        },
        onFinal: (response) => {
          const answer = response.answer || "No answer returned.";
          onSetLatestResponse(response);
          onAddConversation({
            id: `conversation-${Date.now()}`,
            question: trimmed,
            answer,
            createdAt: new Date().toLocaleString(),
            route: response.route_decision,
            severity: response.severity,
            latencyMs: response.latency_ms,
            status: "completed",
          });
          setCurrentMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, content: answer, status: "complete" }
                : message,
            ),
          );
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed.";
      logger.error("chat_stream_failed");
      onAddConversation({
        id: `conversation-${Date.now()}`,
        question: trimmed,
        answer: message,
        createdAt: new Date().toLocaleString(),
        status: "failed",
      });
      setCurrentMessages((current) =>
        current.map((item) =>
          item.id === assistantId ? { ...item, content: `Request failed: ${message}`, status: "failed" } : item,
        ),
      );
    } finally {
      setLoading(false);
      setStreamStatus("");
    }
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <section className="rounded-card border border-line bg-white shadow-soft">
          <div className="border-b border-line px-5 py-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">Ask ERIS</h2>
                <p className="mt-1 text-sm text-muted">Ask support questions, inspect evidence, and route escalations.</p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-ocean">
                Agent
              </span>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-3 p-4">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              className="min-h-24 w-full resize-y rounded-2xl border border-line bg-white p-4 text-base outline-none focus:border-ocean"
              placeholder="Ask about incidents, tickets, APIs, customers, policies, or troubleshooting..."
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!question.trim() || loading}
              className="inline-flex items-center gap-3 rounded-2xl bg-ocean px-6 py-3 text-base font-black text-white shadow-soft hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={18} aria-hidden="true" />
              {loading ? "Analyzing..." : "Analyze"}
            </button>
          </form>
        </section>

        <section>
          <div className="rounded-card border border-line bg-white p-5 shadow-soft">
          <h2 className="text-xl font-black">Conversation</h2>
          <p className="mt-1 text-sm text-muted">Only the current query and response are shown here. Previous exchanges move to Conversation Log.</p>
          {currentMessages.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-line bg-panel p-8 text-center text-muted">
              Ask a support question to start a focused ERIS response.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {currentMessages.map((message) => (
                <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`rounded-2xl px-5 py-4 leading-7 ${
                      message.role === "user" ? "bg-ocean text-white" : "border border-line bg-panel text-ink"
                    } ${message.role === "assistant" ? "w-full max-w-none" : "max-w-3xl"}`}
                  >
                    {message.role === "assistant" ? (
                      <AnswerMarkdown content={message.content || "Working..."} />
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </section>
      </div>

      <StatusPanel response={latestResponse} loading={loading} streamStatus={streamStatus} flowEvents={flowEvents} />
    </div>
  );
}

function ConversationLogView({ entries }: { entries: ConversationEntry[] }) {
  return (
    <section className="rounded-card border border-line bg-white shadow-soft">
      <div className="border-b border-line p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black">Conversation Log</h2>
            <p className="mt-1 text-muted">Previous questions and ERIS responses from this session.</p>
          </div>
          <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-ocean">
            {entries.length} saved
          </span>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="m-6 rounded-2xl border border-dashed border-line bg-panel p-10 text-center">
          <Clock3 className="mx-auto text-muted" size={34} aria-hidden="true" />
          <h3 className="mt-4 text-xl font-black">No previous conversations yet</h3>
          <p className="mt-2 text-muted">
            Ask a question in Chat Console. Completed responses will be stored here automatically.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-line">
          {entries.map((entry) => (
            <article key={entry.id} className="p-6">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
                    entry.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                  }`}
                >
                  {entry.status}
                </span>
                {entry.route ? <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase text-ocean">{entry.route}</span> : null}
                {entry.severity ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase text-amber">{entry.severity}</span> : null}
                {entry.latencyMs != null ? <span className="text-sm font-semibold text-muted">{(entry.latencyMs / 1000).toFixed(2)}s</span> : null}
                <span className="text-sm text-muted">{entry.createdAt}</span>
              </div>
              <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="rounded-2xl bg-blue-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-ocean">Question</p>
                  <p className="mt-2 leading-7">{entry.question}</p>
                </div>
                <div className="rounded-2xl border border-line bg-panel p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-muted">Response</p>
                  <div className="mt-2">
                    <AnswerMarkdown content={entry.answer} />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function StatusPanel({
  loading,
  response,
  streamStatus,
  flowEvents,
}: {
  loading: boolean;
  response: RetrievalResponse | null;
  streamStatus: string;
  flowEvents: LiveFlowEvent[];
}) {
  return (
    <aside className="space-y-5">
      <div className="rounded-card border border-line bg-white p-6 shadow-soft">
        <h2 className="text-xl font-black">Decision Summary</h2>
        <div className="mt-5 space-y-3">
          <MetricLine label="Route" value={response?.route_decision || (loading ? "running" : "--")} />
          <MetricLine label="Severity" value={response?.severity || "--"} />
          <MetricLine label="Confidence" value={formatPercent(response?.confidence_score)} />
          <MetricLine label="Latency" value={response ? `${(response.latency_ms / 1000).toFixed(2)}s` : "--"} />
        </div>
        {loading ? <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-ocean">{streamStatus}</p> : null}
      </div>

      <OrchestrationFlow loading={loading} response={response} flowEvents={flowEvents} />
    </aside>
  );
}

const orchestrationSteps = [
  {
    title: "Input guardrails",
    detail: "Safety, schema, and request checks",
    nodes: ["input_guardrails", "request_accepted"],
  },
  {
    title: "Redis semantic cache",
    detail: "Route-aware cache hit/miss and TTL check",
    nodes: ["semantic_cache", "redis", "cache", "cache_lookup", "cache_hit", "cache_miss"],
  },
  {
    title: "Intent classifier",
    detail: "Classifies intent and route",
    nodes: ["intent_classifier", "intent_classification_agent"],
  },
  {
    title: "Route decision",
    detail: "RAG, SQL, hybrid, or escalation",
    nodes: ["route_decision", "intent_classifier", "intent_classification_agent"],
  },
  {
    title: "Evidence tools",
    detail: "Document and structured retrieval",
    nodes: ["parallel_evidence", "document_retrieval", "sql_agent", "account_validator", "incident_investigator"],
  },
  {
    title: "Severity assessor",
    detail: "Priority and escalation signal",
    nodes: ["severity_assessor", "severity_assessment_agent"],
  },
  {
    title: "Response composer",
    detail: "Final answer and citations",
    nodes: ["response_validator", "response_composer", "escalation_manager", "response_validation_agent", "response_composer_agent"],
  },
];

function nodeLabel(node?: string) {
  return String(node || "")
    .replace(/_agent$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

function stepProgressFromEvents(events: LiveFlowEvent[], response: RetrievalResponse | null, loading: boolean) {
  const completed = new Set<number>();
  const nodeEvents = events.filter((event) => event.node);
  const allEvents = [...events];

  if (events.length || loading || response) {
    completed.add(0);
  }

  for (const event of nodeEvents) {
    const node = String(event.node || "").toLowerCase();
    orchestrationSteps.forEach((step, index) => {
      if (step.nodes.some((candidate) => node.includes(candidate))) {
        completed.add(index);
      }
    });
    if (node.includes("intent")) {
      completed.add(1);
      completed.add(2);
    }
  }

  if (response) {
    orchestrationSteps.forEach((_step, index) => completed.add(index));
  }

  let activeIndex = -1;
  if (loading) {
    activeIndex = Math.min(orchestrationSteps.length - 1, Math.max(0, completed.size));
    if (nodeEvents.length) {
      const lastNode = String(nodeEvents[nodeEvents.length - 1].node || "").toLowerCase();
      const matchedIndex = orchestrationSteps.findIndex((step) => step.nodes.some((candidate) => lastNode.includes(candidate)));
      activeIndex = Math.min(orchestrationSteps.length - 1, Math.max(matchedIndex + 1, 0));
    }
  }

  const latest = allEvents[allEvents.length - 1];
  const route = response?.route_decision || [...allEvents].reverse().find((event) => event.route_decision)?.route_decision;
  const severity = response?.severity || [...allEvents].reverse().find((event) => event.severity)?.severity;
  const elapsed = response ? response.latency_ms / 1000 : latest?.elapsed_seconds;
  const cacheStatus = response?.cache_status || response?.cache_route;

  return { completed, activeIndex, latest, route, severity, elapsed, cacheStatus, nodeEvents };
}

function OrchestrationFlow({
  loading,
  response,
  flowEvents,
}: {
  loading: boolean;
  response: RetrievalResponse | null;
  flowEvents: LiveFlowEvent[];
}) {
  const { completed, activeIndex, latest, route, severity, elapsed, cacheStatus, nodeEvents } = stepProgressFromEvents(flowEvents, response, loading);
  const hasCompleted = Boolean(response);
  const progressPercent = hasCompleted
    ? 100
    : loading
      ? Math.min(92, Math.max(12, ((activeIndex + 1) / orchestrationSteps.length) * 100))
      : 0;

  return (
    <div className="overflow-hidden rounded-card border border-line bg-white shadow-soft">
      <div className="relative border-b border-line bg-gradient-to-br from-white via-blue-50/40 to-emerald-50/50 p-6">
        <div className="absolute right-5 top-5 h-20 w-20 rounded-full bg-ocean/10 blur-2xl" />
        {loading ? <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-blue-100"><div className="h-full rounded-r-full bg-gradient-to-r from-ocean via-emerald-400 to-ocean transition-all duration-500" style={{ width: `${progressPercent}%` }} /></div> : null}
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-ocean">
              <Network size={14} aria-hidden="true" />
              Live graph
            </div>
            <h2 className="text-xl font-black">Orchestration Flow</h2>
            <p className="mt-1 text-sm text-muted">
              {loading ? "Agents are moving through the workflow." : hasCompleted ? "Workflow completed for the latest query." : "Idle until the next query starts."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-wide">
              {route ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-ocean">Route {route}</span> : null}
              {severity ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber">Severity {severity}</span> : null}
              {cacheStatus ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">Cache {cacheStatus}</span> : null}
              {elapsed != null ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-muted">{Number(elapsed).toFixed(1)}s</span> : null}
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black uppercase tracking-wide ${
              loading
                ? "bg-blue-50 text-ocean"
                : hasCompleted
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-muted"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${loading ? "animate-pulse bg-ocean" : hasCompleted ? "bg-emerald-500" : "bg-slate-400"}`} />
            {loading ? "Running" : hasCompleted ? "Complete" : "Standby"}
          </span>
        </div>
      </div>

      <div className="relative p-5">
        <div className="absolute bottom-9 left-[37px] top-9 w-px bg-gradient-to-b from-emerald-200 via-blue-200 to-slate-200" />
        {loading ? <div className="absolute left-[35px] top-9 h-14 w-1 animate-pulse rounded-full bg-ocean/50 blur-[1px]" /> : null}
        <div className="space-y-3">
          {orchestrationSteps.map((step, index) => {
            const isActive = loading && index === activeIndex;
            const isDone = hasCompleted || completed.has(index) || (loading && index < activeIndex);
            const isWaiting = !isActive && !isDone;
            const stepEvent = [...nodeEvents].reverse().find((event) => {
              const node = String(event.node || "").toLowerCase();
              return step.nodes.some((candidate) => node.includes(candidate));
            });

            return (
              <div
                key={step.title}
                className={`relative grid grid-cols-[40px_minmax(0,1fr)] gap-3 rounded-2xl border p-3 transition ${
                  isActive
                    ? "scale-[1.01] border-blue-200 bg-blue-50 shadow-[0_14px_34px_rgba(37,99,235,0.16)]"
                    : isDone
                      ? "border-emerald-100 bg-emerald-50/50"
                      : "border-line bg-panel"
                }`}
              >
                {isActive ? <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-ocean" /> : null}
                <span
                  className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border ${
                    isActive
                      ? "border-blue-200 bg-white text-ocean ring-4 ring-blue-100"
                      : isDone
                        ? "border-emerald-100 bg-white text-emerald-700"
                        : "border-slate-200 bg-white text-slate-400"
                  }`}
                >
                  {isDone ? <CheckCircle2 size={18} aria-hidden="true" /> : <Circle size={16} className={isActive ? "animate-pulse fill-current" : ""} aria-hidden="true" />}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black">
                      {index + 1}. {step.title}
                    </p>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-black uppercase tracking-wide ${
                        isActive
                          ? "bg-white text-ocean"
                          : isDone
                            ? "bg-white text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {isActive ? "Active" : isDone ? "Done" : isWaiting ? "Queued" : "Idle"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{step.detail}</p>
                  {stepEvent || (isActive && latest?.message) ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className="rounded-full bg-white px-2 py-1 font-semibold">
                        {stepEvent?.node ? nodeLabel(stepEvent.node) : latest?.message}
                      </span>
                      {stepEvent?.elapsed_seconds != null ? (
                        <span className="font-mono">{Number(stepEvent.elapsed_seconds).toFixed(1)}s</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        {latest?.message ? (
          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-ocean">
            {latest.message}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AnswerMarkdown({ content }: { content: string }) {
  return (
    <div className="prose-support max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-2xl font-black text-ink">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-black text-ink">{children}</h2>,
          h3: ({ children }) => (
            <h3 className="mt-5 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-ocean">
              <span className="h-2 w-2 rounded-full bg-ocean" />
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="text-base leading-8 text-ink">{children}</p>,
          ul: ({ children }) => <ul className="space-y-2 pl-0">{children}</ul>,
          ol: ({ children }) => <ol className="space-y-2 pl-0">{children}</ol>,
          li: ({ children }) => (
            <li className="flex gap-3 rounded-xl border border-line bg-white/70 px-4 py-3 leading-7 text-ink">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ocean" />
              <span className="min-w-0">{children}</span>
            </li>
          ),
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className="font-bold text-ocean underline decoration-blue-200 underline-offset-4">
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-sm text-slate-800">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-2xl bg-slate-950 p-4 text-sm text-slate-100">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-panel px-4 py-3">
      <span className="text-sm font-semibold text-muted">{label}</span>
      <span className="font-black capitalize">{value}</span>
    </div>
  );
}

function JiraTicketsView({ getAccessTokenSilently }: { getAccessTokenSilently: Parameters<typeof fetchJiraIssues>[0] }) {
  const [issues, setIssues] = useState<JiraIssue[]>([]);
  const [projectKey, setProjectKey] = useState("--");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadIssues() {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchJiraIssues(getAccessTokenSilently);
      setIssues(result.issues);
      setProjectKey(result.project_key);
    } catch (exc) {
      logger.error("jira_issue_fetch_failed");
      setError(exc instanceof Error ? exc.message : "Failed to load Jira issues.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadIssues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="rounded-card border border-line bg-white shadow-soft">
      <div className="flex items-center justify-between border-b border-line p-6">
        <div>
          <h2 className="text-3xl font-black">Jira Tickets</h2>
          <p className="text-muted">Existing issues synced from project {projectKey}</p>
        </div>
        <button
          type="button"
          onClick={loadIssues}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-5 py-3 font-black hover:bg-panel"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          Sync
        </button>
      </div>
      {error ? (
        <div className="m-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          <p className="font-black">Jira tickets unavailable</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-100 text-xs uppercase tracking-[0.18em] text-muted">
            <tr>
              <th className="px-6 py-4">Jira Key</th>
              <th className="px-6 py-4">Summary</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Assignee</th>
              <th className="px-6 py-4">Created</th>
              <th className="px-6 py-4">Link</th>
            </tr>
          </thead>
          <tbody>
            {loading && !issues.length ? (
              <tr><td className="px-6 py-6 text-muted" colSpan={6}>Loading Jira tickets...</td></tr>
            ) : null}
            {!loading && !issues.length && !error ? (
              <tr><td className="px-6 py-6 text-muted" colSpan={6}>No Jira tickets found.</td></tr>
            ) : null}
            {issues.map((issue) => (
              <tr key={issue.key} className="border-t border-line">
                <td className="px-6 py-4 font-mono font-black text-ocean">{issue.key}</td>
                <td className="px-6 py-4">{issue.summary}</td>
                <td className="px-6 py-4">{issue.status}</td>
                <td className="px-6 py-4">{issue.assignee}</td>
                <td className="px-6 py-4 font-mono text-muted">{issue.created || "--"}</td>
                <td className="px-6 py-4">
                  {issue.url ? <a className="text-ocean" href={issue.url} target="_blank" rel="noreferrer"><ExternalLink size={18} /></a> : "--"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EvaluationView({ response }: { response: RetrievalResponse | null }) {
  const quality = response?.answer_quality;
  return (
    <section className="space-y-6">
      <div className="rounded-card border border-line bg-white p-6 shadow-soft">
        <h2 className="text-3xl font-black">Evaluation</h2>
        <p className="mt-1 text-muted">Current session metrics from the latest ERIS response.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <ScoreCard label="Faithfulness" value={formatPercent(quality?.faithfulness_score)} />
        <ScoreCard label="Relevance" value={formatPercent(quality?.answer_relevance_score)} />
        <ScoreCard label="Confidence" value={formatPercent(response?.confidence_score)} />
        <ScoreCard label="Overall quality" value={formatPercent(quality?.overall_quality_score)} />
      </div>
    </section>
  );
}

function PdfIngestionView({ getAccessTokenSilently }: { getAccessTokenSilently: Parameters<typeof ingestPdfDocument>[0] }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<PdfIngestionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedFile || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const uploadResult = await ingestPdfDocument(getAccessTokenSilently, selectedFile);
      setResult(uploadResult);
    } catch (exc) {
      logger.error("pdf_ingestion_failed");
      setError(exc instanceof Error ? exc.message : "PDF ingestion failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-card border border-line bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black">PDF Ingestion</h2>
            <p className="mt-1 text-muted">
              Upload support PDFs into the RAG index for document retrieval.
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-black uppercase tracking-wide text-ocean">
            Admin only
          </span>
        </div>
      </div>

      <form onSubmit={submit} className="rounded-card border border-line bg-white p-6 shadow-soft">
        <label className="block">
          <span className="text-sm font-black uppercase tracking-[0.16em] text-muted">Source PDF</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            disabled={loading}
            onChange={(event) => {
              setSelectedFile(event.target.files?.[0] || null);
              setResult(null);
              setError(null);
            }}
            className="mt-3 block w-full rounded-2xl border border-line bg-panel p-4 text-base file:mr-4 file:rounded-xl file:border-0 file:bg-ocean file:px-4 file:py-2 file:font-black file:text-white hover:file:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
          />
        </label>

        {selectedFile ? (
          <div className="mt-5 grid gap-3 rounded-2xl border border-line bg-panel p-4 md:grid-cols-3">
            <MetricLine label="File" value={selectedFile.name} />
            <MetricLine label="Type" value={selectedFile.type || "application/pdf"} />
            <MetricLine label="Size" value={formatBytes(selectedFile.size)} />
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-line bg-panel p-8 text-center text-muted">
            Choose a product guide, runbook, policy, or troubleshooting PDF to index.
          </div>
        )}

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            <p className="font-black">Ingestion failed</p>
            <p className="mt-1">{error}</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!selectedFile || loading}
          className="mt-6 inline-flex items-center gap-3 rounded-2xl bg-ocean px-7 py-4 text-lg font-black text-white shadow-soft hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FileText size={20} aria-hidden="true" />
          {loading ? "Ingesting PDF..." : "Ingest into RAG"}
        </button>
      </form>

      {result ? (
        <section className="rounded-card border border-line bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-black">Ingestion complete</h3>
              <p className="mt-1 text-muted">{result.message}</p>
            </div>
            <span
              className={`rounded-full px-4 py-2 text-sm font-black uppercase tracking-wide ${
                result.indexed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber"
              }`}
            >
              {result.indexed ? "Indexed" : "Not indexed"}
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ScoreCard label="Items created" value={String(result.items_created)} />
            <ScoreCard label="Text nodes" value={String(result.text_nodes)} />
            <ScoreCard label="Table nodes" value={String(result.table_nodes)} />
            <ScoreCard label="Image nodes" value={String(result.image_nodes)} />
          </div>

          <div className="mt-6 rounded-2xl border border-line bg-panel p-5">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-muted">Document</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <MetricLine label="Filename" value={result.original_filename} />
              <MetricLine label="Document ID" value={result.document_id} />
              <MetricLine label="Created" value={new Date(result.created_at).toLocaleString()} />
              <MetricLine label="Stored size" value={formatBytes(result.file_metadata.file_size_bytes)} />
            </div>
          </div>

          {result.items.length ? (
            <div className="mt-6 overflow-hidden rounded-2xl border border-line">
              <div className="border-b border-line bg-slate-100 px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-muted">
                Indexed preview
              </div>
              <div className="divide-y divide-line">
                {result.items.slice(0, 5).map((item) => (
                  <article key={item.item_id} className="p-5">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase text-ocean">
                        {item.content_type.replace("_", " ")}
                      </span>
                      <span className="font-mono text-xs text-muted">{item.item_id}</span>
                    </div>
                    <p className="leading-7 text-ink">{item.text_preview}</p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}

function ScoreCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-line bg-white p-6 shadow-soft">
      <p className="text-muted">{label}</p>
      <p className="mt-4 text-4xl font-black">{value}</p>
    </div>
  );
}

function formatPercent(value?: number | null) {
  if (value == null) return "--";
  const percent = value <= 1 ? value * 100 : value;
  return `${Math.round(percent)}%`;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return "--";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}
