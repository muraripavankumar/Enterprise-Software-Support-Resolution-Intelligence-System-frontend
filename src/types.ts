export type RetrievalMode = "agent" | "vector" | "sql";

export type CitationReference = {
  citation_id: number;
  document_name: string;
  pages: number[];
  source_file?: string | null;
};

export type RetrievalSourceNode = {
  text_preview: string;
  source_file?: string | null;
  page_number?: number | null;
  content_type?: string | null;
  category?: string | null;
  similarity_score?: number | null;
};

export type StructuredQueryResult = {
  answer: string;
  sql_query?: string | null;
  table_used?: string | null;
  row_count: number;
  raw_results: Record<string, unknown>[];
};

export type AgentTraceEvent = {
  agent_name: string;
  action?: string | null;
  input_summary?: string | null;
  output_summary?: string | null;
  status?: string | null;
  timestamp?: string | null;
  latency_ms?: number | null;
};

export type JiraTracking = {
  issue_key?: string | null;
  issue_url?: string | null;
  priority?: string | null;
  issue_type?: string | null;
  status?: string | null;
};

export type AnswerQuality = {
  faithfulness_score?: number | null;
  answer_relevance_score?: number | null;
  overall_quality_score?: number | null;
  evaluation_status?: string | null;
  evaluation_reasoning?: string | null;
};

export type QualitySLOWarning = {
  metric: string;
  display_name: string;
  value: number;
  target: number;
  message: string;
};

export type RetrievalResponse = {
  success: boolean;
  mode: RetrievalMode;
  question: string;
  answer: string;
  citations: string[];
  citation_references: CitationReference[];
  source_nodes: RetrievalSourceNode[];
  chunk_count: number;
  structured_result?: StructuredQueryResult | null;
  jira_tracking?: JiraTracking | null;
  intent?: string | null;
  route_decision?: string | null;
  severity?: string | null;
  confidence_score?: number | null;
  escalation_flag: boolean;
  escalation_target?: string | null;
  tools_used: string[];
  agent_trace: AgentTraceEvent[];
  suggested_questions: string[];
  answer_quality?: AnswerQuality | null;
  quality_warnings?: QualitySLOWarning[];
  error?: string | null;
  latency_ms: number;
  agent_trace_latency_ms?: number | null;
  runtime_overhead_ms?: number | null;
  cache_status?: string | null;
  cache_route?: string | null;
  cache_strategy?: string | null;
};

export type BackendPrincipal = {
  sub: string;
  roles: string[];
  primary_role: string;
  permissions: string[];
  audience?: string | string[] | null;
  issuer?: string | null;
  expires_at?: number | null;
};

export type JiraIssue = {
  key: string;
  summary: string;
  status: string;
  assignee: string;
  created?: string | null;
  priority?: string | null;
  issue_type?: string | null;
  url?: string | null;
};

export type JiraIssueListResponse = {
  project_key: string;
  count: number;
  issues: JiraIssue[];
};

export type IngestionFileMetadata = {
  original_filename: string;
  file_extension: string;
  file_size_bytes: number;
  temporary_path: string;
  source_name: string;
};

export type IngestionSourceItem = {
  item_id: string;
  document_id: string;
  searchable_text: string;
  content_type: "text" | "table_summary" | "image_caption";
  source: string;
  text_preview: string;
  metadata: Record<string, unknown>;
};

export type PdfIngestionResponse = {
  success: boolean;
  message: string;
  document_id: string;
  original_filename: string;
  file_metadata: IngestionFileMetadata;
  items_created: number;
  text_nodes: number;
  table_nodes: number;
  image_nodes: number;
  indexed: boolean;
  items: IngestionSourceItem[];
  created_at: string;
};
