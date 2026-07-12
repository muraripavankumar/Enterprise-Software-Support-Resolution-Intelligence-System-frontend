import { useAuth0 } from "@auth0/auth0-react";
import { CheckCircle2, Database, FileSearch, Lock, Mail, ShieldCheck, Siren, Zap } from "lucide-react";

const audience = import.meta.env.VITE_AUTH0_AUDIENCE as string;
const scope = import.meta.env.VITE_AUTH0_SCOPE as string;

export function LoginPage() {
  const { loginWithRedirect, error, isLoading } = useAuth0();
  const signInWithAuth0 = () =>
    loginWithRedirect({
      appState: { returnTo: "/console" },
      authorizationParams: {
        audience,
        scope,
        redirect_uri: window.location.origin,
      },
    });

  return (
    <main className="min-h-screen bg-slate-100 text-ink">
      <section className="grid min-h-screen lg:grid-cols-[0.56fr_1fr]">
        <aside className="relative flex min-h-[38vh] flex-col justify-between overflow-hidden bg-[#101a2e] px-7 py-7 text-white sm:px-10 lg:min-h-screen">
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(59,130,246,0.26),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.08)_0,transparent_36%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:44px_44px]" />
          </div>

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ocean text-white shadow-soft ring-1 ring-white/20">
                <Zap size={22} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-200/70">ERIS</p>
                <h1 className="text-xl font-black">Enterprise Support Intelligence</h1>
              </div>
            </div>

            <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-100">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-40" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300" />
              </span>
              Governed support operations workspace
            </div>

            <h2 className="mt-7 max-w-xl text-3xl font-black leading-tight sm:text-4xl xl:text-[2.7rem]">
              Resolve incidents with governed evidence.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-blue-100/78">
              ERIS gives support teams one controlled console to ask operational questions, verify
              customer context, inspect cited evidence, and escalate high-risk cases.
            </p>

            <div className="mt-7 grid gap-3">
              <AssuranceRow
                icon={<ShieldCheck size={18} aria-hidden="true" />}
                title="Role-aware access"
                description="Auth0-protected sessions with backend-enforced permissions for support, escalation, and evaluation views."
              />
              <AssuranceRow
                icon={<FileSearch size={18} aria-hidden="true" />}
                title="Evidence-first answers"
                description="Responses are grounded in indexed support documentation and operational records with citations where required."
              />
              <AssuranceRow
                icon={<Siren size={18} aria-hidden="true" />}
                title="Escalation control"
                description="Critical security, outage, and data-loss cases create structured Jira handoffs and support notifications."
              />
            </div>

            <div className="mt-7 hidden gap-3 sm:grid-cols-3 min-[820px]:grid">
              <MetricCard icon={<Database size={18} aria-hidden="true" />} label="Data sources" value="RAG + SQL" trend="governed" />
              <MetricCard icon={<CheckCircle2 size={18} aria-hidden="true" />} label="Guardrails" value="IG / OG" trend="active" />
              <MetricCard icon={<FileSearch size={18} aria-hidden="true" />} label="Audit trail" value="Langfuse" trend="observed" />
            </div>
          </div>

          <p className="relative mt-6 text-xs text-blue-100/45">
            Enterprise Software Support & Resolution Intelligence System
          </p>
        </aside>

        <div className="flex items-start justify-center px-6 py-8 sm:px-10 lg:pt-24 xl:pt-28">
          <div className="w-full max-w-lg">
            <div>
              <h2 className="text-3xl font-black">Sign in to your account</h2>
              <p className="mt-1 text-base text-muted">Enterprise support console</p>
            </div>

            <div className="mt-7 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-ink">Email address</span>
                <div className="mt-2 flex items-center gap-3 rounded-md border border-line bg-white px-4 py-3 text-muted">
                  <Mail size={20} aria-hidden="true" />
                  <span>you@company.com</span>
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-ink">Password</span>
                <div className="mt-2 flex items-center gap-3 rounded-md border border-line bg-white px-4 py-3 text-muted">
                  <Lock size={20} aria-hidden="true" />
                  <span aria-hidden="true">********</span>
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-ink">Demo role</span>
                <select
                  className="mt-2 w-full rounded-md border border-line bg-white px-4 py-3 text-base font-medium text-ink"
                  defaultValue="Admin"
                  aria-label="Demo role"
                >
                  <option>Admin</option>
                  <option>Support manager</option>
                  <option>Support agent</option>
                  <option>Customer user</option>
                </select>
              </label>
            </div>

            {error ? (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error.message}
              </div>
            ) : null}

            <button
              type="button"
              disabled={isLoading}
              onClick={signInWithAuth0}
              className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-ocean px-6 py-3.5 text-lg font-black text-white shadow-soft hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
            >
              {isLoading ? "Preparing authentication..." : "Sign in"}
            </button>

            <div className="my-6 flex items-center gap-4 text-sm text-muted">
              <span className="h-px flex-1 bg-line" />
              or continue with
              <span className="h-px flex-1 bg-line" />
            </div>

            <button
              type="button"
              disabled={isLoading}
              onClick={signInWithAuth0}
              className="inline-flex w-full items-center justify-center gap-3 rounded-md border border-line bg-white px-6 py-3.5 text-lg font-black text-ink hover:bg-panel disabled:cursor-wait disabled:opacity-60"
            >
              <ShieldCheck size={20} aria-hidden="true" />
              Single Sign-On (SSO)
            </button>

            <p className="mt-6 text-center text-sm text-muted">
              No account? <span className="font-bold text-ocean">Create one</span>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function AssuranceRow({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-white/12 bg-white/[0.055] p-3 shadow-[0_16px_50px_rgba(0,0,0,0.16)] backdrop-blur">
      <div className="flex gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-400/15 text-blue-200 ring-1 ring-blue-200/20">
          {icon}
        </div>
        <div>
          <h3 className="font-black text-white">{title}</h3>
          <p className="mt-1 text-sm leading-5 text-blue-100/68">{description}</p>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: string;
}) {
  return (
    <div className="rounded-xl border border-white/12 bg-white/[0.055] p-3">
      <div className="flex items-center gap-2 text-blue-200/80">
        {icon}
        <p className="text-xs font-black uppercase tracking-[0.16em]">{label}</p>
      </div>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
      <p className="mt-1 text-sm font-semibold text-emerald-200">{trend}</p>
    </div>
  );
}
