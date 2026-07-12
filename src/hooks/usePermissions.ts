import { useAuth0 } from "@auth0/auth0-react";
import { useMemo } from "react";
import { BackendPrincipal } from "../types";

type AppRole = "customer_user" | "support_agent" | "support_manager" | "admin";

const ROLE_PRIORITY: AppRole[] = ["customer_user", "support_agent", "support_manager", "admin"];

function normalizeRoles(rawRoles: unknown): string[] {
  if (Array.isArray(rawRoles)) {
    return rawRoles.map(String);
  }
  if (typeof rawRoles === "string") {
    return rawRoles.split(/\s+/).filter(Boolean);
  }
  return [];
}

export function usePermissions(backendPrincipal?: BackendPrincipal | null) {
  const { user } = useAuth0();
  const namespace = import.meta.env.VITE_AUTH0_ROLE_NAMESPACE || "https://stateful-agent.com";

  return useMemo(() => {
    const rolesClaim = user?.[`${namespace}/roles`];
    const rawRoles = backendPrincipal?.roles?.length ? backendPrincipal.roles : normalizeRoles(rolesClaim);
    const normalized = new Set(rawRoles.map((role) => role.toLowerCase()));
    if (normalized.has("user")) {
      normalized.add("customer_user");
    }

    const role =
      [...ROLE_PRIORITY].reverse().find((candidate) => normalized.has(candidate)) || "customer_user";

    return {
      role,
      roles: Array.from(normalized),
      isCustomer: role === "customer_user",
      isSupportAgent: role === "support_agent" || role === "support_manager" || role === "admin",
      isSupportManager: role === "support_manager" || role === "admin",
      isAdmin: role === "admin",
      canQuery: true,
      canReadOperationalEvidence: role !== "customer_user",
      canEscalate: role === "support_manager" || role === "admin",
      canViewEvaluation: role === "admin",
    };
  }, [backendPrincipal, namespace, user]);
}
