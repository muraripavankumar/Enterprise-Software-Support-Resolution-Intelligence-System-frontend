import { GetTokenSilentlyOptions } from "@auth0/auth0-react";
import { BackendPrincipal, JiraIssueListResponse, PdfIngestionResponse, RetrievalMode, RetrievalResponse } from "../types";
import { logger } from "../lib/logger";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const audience = import.meta.env.VITE_AUTH0_AUDIENCE as string;
const scope = import.meta.env.VITE_AUTH0_SCOPE as string;

type GetToken = (options?: GetTokenSilentlyOptions) => Promise<string>;

type StreamStatusPayload = {
  message?: string;
  elapsed_seconds?: number;
};

type StreamHandlers = {
  onStatus?: (payload: StreamStatusPayload) => void;
  onDelta?: (text: string) => void;
  onFinal?: (response: RetrievalResponse) => void;
};

function tokenOptions(): GetTokenSilentlyOptions {
  return {
    authorizationParams: {
      audience,
      scope,
    },
  };
}

export async function runSupportQuery(
  getAccessTokenSilently: GetToken,
  question: string,
  mode: RetrievalMode,
): Promise<RetrievalResponse> {
  const token = await getAccessTokenSilently(tokenOptions());

  const response = await fetch(`${API_BASE_URL}/api/v1/retrieval/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      question,
      mode,
      include_sources: true,
      include_raw_results: true,
      metadata: {
        frontend: "react",
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    logger.error("api_request_failed", { endpoint: "/api/v1/retrieval/query", status: response.status });
    const detail = payload?.detail?.detail || payload?.detail || payload?.error || response.statusText;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  logger.info("api_request_succeeded", { endpoint: "/api/v1/retrieval/query", status: response.status });

  return payload as RetrievalResponse;
}

function parseSseMessage(message: string): { event: string; data: unknown } | null {
  let event = "message";
  const dataLines: string[] = [];

  for (const line of message.split(/\r?\n/)) {
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }

  if (!dataLines.length) return null;
  const dataText = dataLines.join("\n");
  try {
    return { event, data: JSON.parse(dataText) };
  } catch {
    return { event, data: dataText };
  }
}

export async function streamSupportQuery(
  getAccessTokenSilently: GetToken,
  question: string,
  mode: RetrievalMode,
  handlers: StreamHandlers,
): Promise<RetrievalResponse> {
  const token = await getAccessTokenSilently(tokenOptions());

  const response = await fetch(`${API_BASE_URL}/api/v1/retrieval/query/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      question,
      mode,
      include_sources: true,
      include_raw_results: true,
      metadata: {
        frontend: "react",
        transport: "stream",
      },
    }),
  });

  if (!response.ok || !response.body) {
    const payload = await response.json().catch(() => ({}));
    logger.error("stream_connect_failed", { endpoint: "/api/v1/retrieval/query/stream", status: response.status });
    const detail = payload?.detail?.detail || payload?.detail || payload?.error || response.statusText;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  logger.info("stream_connected", { endpoint: "/api/v1/retrieval/query/stream", status: response.status });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResponse: RetrievalResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const messages = buffer.split(/\r?\n\r?\n/);
    buffer = messages.pop() || "";

    for (const message of messages) {
      const parsed = parseSseMessage(message);
      if (!parsed) continue;

      if (parsed.event === "status" || parsed.event === "node") {
        handlers.onStatus?.(parsed.data as StreamStatusPayload);
      } else if (parsed.event === "delta") {
        const payload = parsed.data as { text?: string };
        handlers.onDelta?.(payload.text || "");
      } else if (parsed.event === "final") {
        finalResponse = parsed.data as RetrievalResponse;
        handlers.onFinal?.(finalResponse);
      } else if (parsed.event === "error") {
        const payload = parsed.data as { error?: string; message?: string; status_code?: number };
        logger.error("stream_event_error", { endpoint: "/api/v1/retrieval/query/stream", status: payload.status_code || null });
        if (payload.error === "unsafe_request") {
          throw new Error(
            "This request was blocked by safety guardrails because it asks to suppress or bypass a required security notification.",
          );
        }
        throw new Error(payload.message || "Streaming query failed.");
      }
    }
  }

  if (!finalResponse) {
    logger.warn("stream_disconnected_without_final", { endpoint: "/api/v1/retrieval/query/stream" });
    throw new Error("Streaming query ended before the final response was received.");
  }
  logger.info("stream_completed", { endpoint: "/api/v1/retrieval/query/stream" });

  return finalResponse;
}

export async function fetchCurrentPrincipal(getAccessTokenSilently: GetToken): Promise<BackendPrincipal> {
  const token = await getAccessTokenSilently(tokenOptions());

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    logger.error("api_request_failed", { endpoint: "/api/v1/auth/me", status: response.status });
    const detail = payload?.detail?.detail || payload?.detail || payload?.error || response.statusText;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  logger.info("api_request_succeeded", { endpoint: "/api/v1/auth/me", status: response.status });
  return payload as BackendPrincipal;
}

export async function fetchJiraIssues(getAccessTokenSilently: GetToken, limit = 50): Promise<JiraIssueListResponse> {
  const token = await getAccessTokenSilently(tokenOptions());

  const response = await fetch(`${API_BASE_URL}/api/v1/jira/issues?limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    logger.error("api_request_failed", { endpoint: "/api/v1/jira/issues", status: response.status });
    const detail = payload?.detail?.detail || payload?.detail || payload?.error || response.statusText;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  logger.info("api_request_succeeded", { endpoint: "/api/v1/jira/issues", status: response.status });
  return payload as JiraIssueListResponse;
}

export async function ingestPdfDocument(
  getAccessTokenSilently: GetToken,
  file: File,
): Promise<PdfIngestionResponse> {
  const token = await getAccessTokenSilently(tokenOptions());
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/v1/ingestion/pdf`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    logger.error("api_request_failed", { endpoint: "/api/v1/ingestion/pdf", status: response.status });
    const detail = payload?.detail?.detail || payload?.detail || payload?.error || response.statusText;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  logger.info("api_request_succeeded", { endpoint: "/api/v1/ingestion/pdf", status: response.status });
  return payload as PdfIngestionResponse;
}
