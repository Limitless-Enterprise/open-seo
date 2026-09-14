import { z } from "zod";
import { assertAiVisibilityPaidPlan } from "@/server/features/ai-search/assertAiVisibilityPaidPlan";
import { explorePrompt } from "@/server/features/ai-search/services/promptExplorer";
import { buildProjectMeta } from "@/server/mcp/context";
import { mcpResponse } from "@/server/mcp/formatters";
import { optionalMetaOutputSchema } from "@/server/mcp/output-schemas";
import { withMcpProjectAuth } from "@/server/mcp/project-auth";
import { projectIdSchema } from "@/server/mcp/schemas";
import {
  promptExplorerModelSchema,
  promptExplorerResultSchema,
  webSearchCountryCodeSchema,
  type PromptExplorerResult,
} from "@/types/schemas/ai-search";

/** Keep MCP payloads under typical client limits while preserving structure. */
const MCP_MODEL_TEXT_MAX_CHARS = 6_000;
const MCP_CITATIONS_MAX = 25;
const MCP_FAN_OUT_MAX = 15;

const inputSchema = {
  projectId: projectIdSchema,
  prompt: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .describe("Question or prompt to send to each selected LLM."),
  models: z
    .array(promptExplorerModelSchema)
    .min(1)
    .max(4)
    .describe(
      "One to four models: chat_gpt, claude, gemini, perplexity. Duplicates are deduped.",
    ),
  highlightBrand: z
    .string()
    .trim()
    .min(1)
    .max(250)
    .optional()
    .describe(
      "Optional brand name to highlight in citations and brand-mention detection.",
    ),
  webSearch: z
    .boolean()
    .optional()
    .describe("Enable web search in model answers. Defaults to true."),
  webSearchCountryCode: webSearchCountryCodeSchema
    .optional()
    .describe(
      "ISO-2 country for web search grounding when webSearch is true (e.g. US, GB).",
    ),
} as const;

type Args = z.infer<z.ZodObject<typeof inputSchema>>;

type McpPromptExplorerResult = PromptExplorerResult & {
  responseTruncated?: boolean;
};

function truncatePromptExplorerForMcp(
  result: PromptExplorerResult,
): McpPromptExplorerResult {
  let responseTruncated = false;

  const results = result.results.map((entry) => {
    if (entry.status !== "success") return entry;

    let { text, citations, fanOutQueries } = entry;
    if (text.length > MCP_MODEL_TEXT_MAX_CHARS) {
      responseTruncated = true;
      text = `${text.slice(0, MCP_MODEL_TEXT_MAX_CHARS)}\n… [truncated for MCP payload limit]`;
    }
    if (citations.length > MCP_CITATIONS_MAX) {
      responseTruncated = true;
      citations = citations.slice(0, MCP_CITATIONS_MAX);
    }
    if (fanOutQueries.length > MCP_FAN_OUT_MAX) {
      responseTruncated = true;
      fanOutQueries = fanOutQueries.slice(0, MCP_FAN_OUT_MAX);
    }

    if (
      text === entry.text &&
      citations === entry.citations &&
      fanOutQueries === entry.fanOutQueries
    ) {
      return entry;
    }

    return { ...entry, text, citations, fanOutQueries };
  });

  return responseTruncated ? { ...result, results, responseTruncated } : result;
}

function formatPromptExplorerText(result: McpPromptExplorerResult): string {
  const lines = [`Prompt: ${result.prompt}`];
  if (result.highlightBrand) {
    lines.push(`Highlight brand: ${result.highlightBrand}`);
  }
  if (result.responseTruncated) {
    lines.push(
      "Note: Long model text or citation lists were truncated in this response.",
    );
  }

  for (const entry of result.results) {
    lines.push("");
    if (entry.status === "error") {
      lines.push(`${entry.model}: error — ${entry.message}`);
      continue;
    }
    lines.push(`=== ${entry.model}${entry.modelName ? ` (${entry.modelName})` : ""} ===`);
    lines.push(entry.text);
    if (entry.citations.length > 0) {
      lines.push("Citations:");
      for (const c of entry.citations.slice(0, 10)) {
        lines.push(`  - ${c.domain ?? c.url}${c.matchedBrand ? " [brand]" : ""}`);
      }
    }
  }

  return lines.join("\n");
}

export const explorePromptTool = {
  name: "explore_prompt",
  config: {
    title: "Explore prompt (LLM answers)",
    description:
      "Asks the same prompt across one to four LLMs (ChatGPT, Claude, Gemini, Perplexity) and returns side-by-side answers with citations. Charges credits per model call (cached 7 days per prompt/model). Hosted accounts require a paid plan; self-hosted is not plan-gated. Very long answers may be truncated in the MCP payload.",
    inputSchema,
    outputSchema: promptExplorerResultSchema
      .extend({
        responseTruncated: z.boolean().optional(),
        ...optionalMetaOutputSchema,
      })
      .passthrough(),
    annotations: {
      readOnlyHint: false,
      openWorldHint: false,
      destructiveHint: false,
    },
  },
  handler: withMcpProjectAuth(async (args: Args, context) => {
    await assertAiVisibilityPaidPlan(context.auth.organizationId);

    const raw = await explorePrompt(
      {
        projectId: args.projectId,
        prompt: args.prompt,
        models: args.models,
        highlightBrand: args.highlightBrand,
        webSearch: args.webSearch ?? true,
        webSearchCountryCode: args.webSearchCountryCode,
      },
      context.billing,
    );

    const result = truncatePromptExplorerForMcp(raw);

    return mcpResponse({
      text: formatPromptExplorerText(result),
      meta: buildProjectMeta(
        context,
        args.projectId,
        `/p/${args.projectId}/prompt-explorer`,
        { q: args.prompt },
      ),
      structuredContent: result,
    });
  }),
};
