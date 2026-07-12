import { Auth0Provider, AppState } from "@auth0/auth0-react";
import { PropsWithChildren } from "react";
import { useNavigate } from "react-router-dom";

const domain = import.meta.env.VITE_AUTH0_DOMAIN as string;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID as string;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE as string;
const scope = import.meta.env.VITE_AUTH0_SCOPE as string;

export function Auth0ProviderWithNavigate({ children }: PropsWithChildren) {
  const navigate = useNavigate();

  const onRedirectCallback = (appState?: AppState) => {
    navigate(appState?.returnTo || "/console", { replace: true });
  };

  if (!domain || !clientId || !audience) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 shadow-soft">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Configuration</p>
          <h1 className="mt-3 text-2xl font-semibold">Auth0 environment is incomplete</h1>
          <p className="mt-3 text-slate-300">
            Add VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, and VITE_AUTH0_AUDIENCE to
            frontend/.env.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      cacheLocation="memory"
      useRefreshTokens={false}
      onRedirectCallback={onRedirectCallback}
      authorizationParams={{
        audience,
        redirect_uri: window.location.origin,
        scope,
      }}
    >
      {children}
    </Auth0Provider>
  );
}
