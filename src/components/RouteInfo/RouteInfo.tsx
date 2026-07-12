import {
  Activity,
  Bot,
  CheckCircle2,
  Database,
  FileSearch,
  Gauge,
  GitBranch,
  MessageSquareText,
  Shield,
  ShieldCheck,
  Sparkles,
  Timer,
  Wrench,
} from "lucide-react";
import { AgentTraceEvent, RetrievalResponse } from "../../types";

type Props = {
  response?: RetrievalResponse | null;
  isLoading?: boolean;
};

function confidencePercent(value?: number | null) {
  if (value == null) return 0;
  return value <= 1 ? Math.round(value * 100) : Math.round(value);
}

function Badge({ children, tone = "slate" }: { children: React.ReactNode; tone?: "green" | "amber" | "red" | "blue" | "slate" }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    slate: "bg-slate-50 text-slate-600 border-slate-200",
  };
  return <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${tones[tone]}`}>{children}</span>;
}

export function RouteInfo({ response, isLoading }: Props) {
  const route = response?.route_decision?.toUpperCase() || (isLoading ? "RUNNING" : "PENDING");
  const severity = response?.severity?.toUpperCase() || "--";
  const confidence = confidencePercent(response?.confidence_score);
  const tools = response?.tools_used || [];
  const quality = response?.answer_quality;

  return (
    <aside className="space-y-4">
      <section className="rounded-3xl border border-line bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black">SLO Metrics</h2>
            <p className="text-sm text-muted">Latency, quality, relevance, and confidence</p>
          </div>
          <Sparkles className="text-ocean" aria-hidden="true" />
        </div>
        <div className="mt-5 grid gap-3">
          <SloMetric
            icon={<Timer size={17} />}
            label="Latency"
            value={response ? formatSeconds(response.latency_ms) : "--"}
            percent={latencyScore(response?.latency_ms)}
            tone={latencyTone(response?.latency_ms)}
          />
          <SloMetric
            icon={<ShieldCheck size={17} />}
            label="Faithfulness"
            value={formatQuality(quality?.faithfulness_score)}
            percent={qualityPercent(quality?.faithfulness_score)}
            tone={qualityTone(quality?.faithfulness_score)}
          />
          <SloMetric
            icon={<MessageSquareText size={17} />}
            label="Relevance"
            value={formatQuality(quality?.answer_relevance_score)}
            percent={qualityPercent(quality?.answer_relevance_score)}
            tone={qualityTone(quality?.answer_relevance_score)}
          />
          <SloMetric
            icon={<Gauge size={17} />}
            label="Confidence"
            value={response ? `${confidence}%` : "--"}
            percent={response ? confidence : 0}
            tone={confidence >= 80 ? "green" : confidence >= 60 ? "amber" : response ? "red" : "slate"}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black">Decision Summary</h2>
            <p className="text-sm text-muted">Route, confidence, severity, and cache</p>
          </div>
          <Badge tone={response?.escalation_flag ? "red" : response ? "green" : "slate"}>
            {response ? "complete" : "idle"}
          </Badge>
        </div>
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between rounded-2xl bg-panel p-3">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted">
              <Activity size={16} aria-hidden="true" /> Route
            </span>
            <Badge tone={route === "HIGH_RISK" ? "red" : route === "HYBRID" ? "amber" : "blue"}>{route}</Badge>
          </div>
          <div className="rounded-2xl bg-panel p-3">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="inline-flex items-center gap-2 text-muted">
                <Gauge size={16} aria-hidden="true" /> Confidence
              </span>
              <span>{response ? `${confidence}%` : "--"}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-signal transition-all"
                style={{ width: response ? `${Math.min(confidence, 100)}%` : "0%" }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-panel p-3">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted">
              <ShieldCheck size={16} aria-hidden="true" /> Severity
            </span>
            <Badge tone={severity === "CRITICAL" ? "red" : severity === "HIGH" ? "amber" : "green"}>
              {severity}
            </Badge>
          </div>
        </div>
      </section>

      <OrchestrationFlow response={response} isLoading={isLoading} />

      <section className="rounded-3xl border border-line bg-white p-5 shadow-soft">
        <h2 className="text-lg font-black">Execution</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Metric label="Latency" value={response ? formatSeconds(response.latency_ms) : "--"} />
          <Metric label="Chunks" value={response ? String(response.chunk_count) : "--"} />
          <Metric label="Trace" value={response ? `${response.agent_trace.length} steps` : "--"} />
          <Metric label="Overhead" value={response?.runtime_overhead_ms != null ? formatSeconds(response.runtime_overhead_ms) : "--"} />
          <Metric label="Cache" value={response?.cache_status || "--"} />
          <Metric label="Cache route" value={response?.cache_route || "--"} />
        </div>
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Tools used</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {tools.length ? (
              tools.map((tool) => (
                <span key={tool} className="inline-flex items-center gap-1 rounded-full border border-line bg-panel px-3 py-1 text-xs font-semibold">
                  <Wrench size={13} aria-hidden="true" /> {tool}
                </span>
              ))
            ) : (
              <span className="text-sm text-muted">Not selected</span>
            )}
          </div>
        </div>
      </section>

    </aside>
  );
}

const IDLE_FLOW = [
  {
    agent_name: "Input guardrails",
    output_summary: "Validate request, safety checks, and PII scrub.",
    status: "pending",
  },
  {
    agent_name: "Redis semantic cache",
    output_summary: "Check route-aware cache hit/miss and TTL before agent execution.",
    status: "pending",
  },
  {
    agent_name: "Intent classifier",
    output_summary: "Classify intent and select the route.",
    status: "pending",
  },
  {
    agent_name: "Route decision",
    output_summary: "Choose RAG, SQL, hybrid, clarification, or escalation.",
    status: "pending",
  },
  {
    agent_name: "Evidence tools",
    output_summary: "Run document retrieval and/or SQL evidence collection.",
    status: "pending",
  },
  {
    agent_name: "Severity assessor",
    output_summary: "Assess impact, priority, and escalation need.",
    status: "pending",
  },
  {
    agent_name: "Response validator",
    output_summary: "Check grounding, attribution, and safety.",
    status: "pending",
  },
  {
    agent_name: "Response composer",
    output_summary: "Compose answer, citations, and next steps.",
    status: "pending",
  },
] satisfies AgentTraceEvent[];

function OrchestrationFlow({ response, isLoading }: Props) {
  const trace = response?.agent_trace?.length ? response.agent_trace : IDLE_FLOW;
  return (
    <section className="rounded-3xl border border-line bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black">Orchestration Flow</h2>
          <p className="text-sm text-muted">Live LangGraph execution path</p>
        </div>
        <Badge tone={isLoading ? "blue" : response ? "green" : "slate"}>
          {isLoading ? "running" : response ? "complete" : "preview"}
        </Badge>
      </div>
      <div className="relative mt-5 space-y-3">
        <div className="absolute bottom-6 left-5 top-6 w-px bg-line" aria-hidden="true" />
        {trace.map((step, index) => (
          <FlowStep key={`${step.agent_name}-${index}`} step={step} index={index} isIdle={!response} />
        ))}
      </div>
    </section>
  );
}

function FlowStep({ step, index, isIdle }: { step: AgentTraceEvent; index: number; isIdle: boolean }) {
  const status = (step.status || "pending").toLowerCase();
  const isComplete = status.includes("complete") || status.includes("pass") || status === "completed";
  const isFailed = status.includes("fail") || status.includes("error") || status.includes("escalat");
  const Icon = flowIcon(step.agent_name, index);
  const tone = isIdle ? "border-slate-200 bg-slate-50 text-slate-500" : isFailed ? "border-red-200 bg-red-50 text-red-700" : isComplete ? "border-emerald-200 bg-emerald-50 text-signal" : "border-blue-200 bg-blue-50 text-ocean";

  return (
    <div className="relative flex gap-3">
      <div className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${tone}`}>
        {isComplete ? <CheckCircle2 size={18} aria-hidden="true" /> : <Icon size={18} aria-hidden="true" />}
      </div>
      <div className={`min-w-0 flex-1 rounded-2xl border p-3 transition ${tone}`}>
        <div className="flex items-start justify-between gap-2">
          <p className="font-black">{cleanAgentName(step.agent_name)}</p>
          <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] font-black uppercase">
            {isIdle ? "pending" : step.status || "done"}
          </span>
        </div>
        <p className="mt-1 text-sm leading-5 opacity-85">
          {step.output_summary || step.action || "Waiting for execution."}
        </p>
        {step.latency_ms != null ? (
          <p className="mt-2 text-xs font-black">{formatSeconds(step.latency_ms)}</p>
        ) : null}
      </div>
    </div>
  );
}

function flowIcon(agentName: string, index: number) {
  const name = agentName.toLowerCase();
  if (name.includes("guard")) return Shield;
  if (name.includes("cache") || name.includes("redis")) return Database;
  if (name.includes("intent")) return Bot;
  if (name.includes("route")) return GitBranch;
  if (name.includes("document") || name.includes("retrieval")) return FileSearch;
  if (name.includes("sql") || name.includes("evidence")) return Database;
  if (name.includes("severity")) return Activity;
  if (name.includes("validator")) return ShieldCheck;
  if (name.includes("composer")) return MessageSquareText;
  return [Shield, Bot, GitBranch, FileSearch, Activity, ShieldCheck, MessageSquareText][index] || Bot;
}

function cleanAgentName(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace("Agent", "Agent");
}

function qualityPercent(value?: number | null) {
  if (value == null) return 0;
  return value <= 1 ? Math.round(value * 100) : Math.round(value);
}

function formatQuality(value?: number | null) {
  return value == null ? "N/A" : `${qualityPercent(value)}%`;
}

function qualityTone(value?: number | null): "green" | "amber" | "red" | "slate" {
  if (value == null) return "slate";
  const percent = qualityPercent(value);
  if (percent >= 75) return "green";
  if (percent >= 60) return "amber";
  return "red";
}

function latencyScore(value?: number | null) {
  if (value == null) return 0;
  if (value <= 3000) return 100;
  if (value <= 8000) return 80;
  if (value <= 15000) return 55;
  return 30;
}

function latencyTone(value?: number | null): "green" | "amber" | "red" | "slate" {
  if (value == null) return "slate";
  if (value <= 8000) return "green";
  if (value <= 15000) return "amber";
  return "red";
}

function formatSeconds(milliseconds?: number | null) {
  if (milliseconds == null) return "--";
  return `${(milliseconds / 1000).toFixed(milliseconds < 1000 ? 2 : 1)} s`;
}

function SloMetric({
  icon,
  label,
  value,
  percent,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  percent: number;
  tone: "green" | "amber" | "red" | "blue" | "slate";
}) {
  const bar = {
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
    slate: "bg-slate-300",
  }[tone];

  return (
    <div className="rounded-2xl border border-line bg-panel p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-black">
          <span className="text-ocean">{icon}</span>
          {label}
        </span>
        <span className="font-black">{value}</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-200">
        <div className={`h-2 rounded-full ${bar} transition-all`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-panel p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}
