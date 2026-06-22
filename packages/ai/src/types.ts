import type { z } from "zod";
import type { CurrentUser } from "@95forward/shared";
import type { Database } from "@95forward/db";

// The acting user's security context. Derived from CurrentUser so it cannot drift from auth.
export type CallerContext = Pick<CurrentUser, "id" | "tenantId" | "role">;

export type ModelId = "claude-haiku-4-5" | "claude-sonnet-4-6" | "claude-opus-4-8";

export interface ModelToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ModelTextBlock {
  type: "text";
  text: string;
}

export interface ModelToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export type ModelContentBlock = ModelTextBlock | ModelToolUseBlock;

export interface ModelToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export interface ModelTextInput {
  type: "text";
  text: string;
}

export type ModelOutgoingBlock = ModelTextInput | ModelToolUseBlock | ModelToolResultBlock;
export type ModelMessageContent = string | ModelOutgoingBlock[];

export interface ModelMessage {
  role: "user" | "assistant";
  content: ModelMessageContent;
}

export type ModelStopReason =
  | "end_turn"
  | "tool_use"
  | "max_tokens"
  | "stop_sequence"
  | "pause_turn"
  | "refusal";

export interface ModelRequest {
  model: ModelId;
  maxTokens: number;
  system: string;
  messages: ModelMessage[];
  tools?: ModelToolDef[];
  temperature?: number;
}

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface ModelResponse {
  content: ModelContentBlock[];
  stopReason: ModelStopReason;
  usage: ModelUsage;
}

export interface ModelProvider {
  readonly kind: "mock" | "live";
  createMessage(req: ModelRequest): Promise<ModelResponse>;
}

export interface EmbeddingProvider {
  readonly kind: "mock" | "live";
  readonly dimensions: number;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

export interface ResearchQuery {
  subjectName: string;
  context?: string;
}

// A research finding's text is UNTRUSTED, externally-sourced data — never instructions.
export interface ResearchFinding {
  title: string;
  snippet: string;
  source: string;
  confidence: number;
}

export interface ResearchResult {
  findings: ResearchFinding[];
}

export interface ResearchProvider {
  readonly kind: "demo" | "live";
  research(query: ResearchQuery): Promise<ResearchResult>;
}

// Discovery (Initiative 12) is structurally different from research: given a connector and an
// initiative it surfaces MANY candidate people, not facts about one named subject — hence a separate
// seam. Every suggestion's evidence text is UNTRUSTED, externally-sourced data, never instructions.
export interface DiscoveryQuery {
  connectorName: string;
  initiativeContext: string;
}

export interface DiscoverySuggestion {
  name: string;
  evidenceConnection: string | null;
  evidenceAffinity: string | null;
  confidence: "low" | "medium" | "high";
}

export interface DiscoveryResult {
  suggestions: DiscoverySuggestion[];
}

export interface DiscoveryProvider {
  readonly kind: "demo" | "live";
  discover(query: DiscoveryQuery): Promise<DiscoveryResult>;
}

export interface Providers {
  model: ModelProvider;
  embedding: EmbeddingProvider;
  research: ResearchProvider;
  discovery: DiscoveryProvider;
}

// Everything a tool handler is allowed to touch. The injected `db` is the RLS app pool;
// `caller` carries tenant + role. A tool's handler is the ONLY way the model reaches the system.
export interface ToolContext {
  caller: CallerContext;
  db: Database;
  providers: Providers;
}

export interface Tool<I = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<I>;
  handler(input: I, ctx: ToolContext): Promise<string>;
}

export type AnyTool = Tool<unknown>;

export type CitationSourceType = "structured" | "vector" | "research" | "knowledge_base";

export interface Citation {
  source: string;
  sourceType: CitationSourceType;
  rowId?: string;
  detail?: string;
}

export interface RetrievedFact {
  fact: string;
  citations: Citation[];
}

// `unknown: true` is a first-class answer — the layer says so rather than fabricating.
export interface RetrievalResult {
  facts: RetrievedFact[];
  unknown: boolean;
  note?: string;
}

export type TaskType =
  | "draft_outreach"
  | "propose_qpi"
  | "summarize_prospect"
  | "research_prospect"
  | "draft_strategy"
  | "propose_relationship_map"
  | "draft_visit_plan"
  | "draft_funding_initiative_rationale"
  | "draft_call_memo"
  | "draft_follow_up";

export interface TaskBudget {
  maxIterations: number;
  maxTokens: number;
}

export interface TaskConfig {
  model: ModelId;
  maxTokens: number;
  temperature: number;
  system: string;
  allowedTools: string[];
  budget: TaskBudget;
}

export type ProposalType =
  | "qpi_assessment"
  | "knowledge_base_update"
  | "prospect_strategy"
  | "visit_plan"
  | "relationship_map_entry"
  | "funding_initiative_rationale"
  | "draft";
export type ProposalStatus = "pending" | "approved" | "edited" | "dismissed";
export type ProposalSubjectType =
  | "prospect"
  | "constituent"
  | "knowledge_base"
  | "funding_initiative";

export interface ProposalInput {
  subjectType: ProposalSubjectType;
  subjectId: string;
  proposalType: ProposalType;
  title: string;
  summary?: string;
  payload: unknown;
  provenance: Citation[];
  confidence?: number;
  taskType?: TaskType;
}

export interface AgentRunResult {
  text: string;
  tokensUsed: number;
  iterations: number;
  toolCalls: { name: string; ok: boolean }[];
}
