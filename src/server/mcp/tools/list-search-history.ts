import { z } from "zod";
import { ResearchSearchHistoryService } from "@/server/features/research/services/ResearchSearchHistoryService";
import { buildProjectMeta } from "@/server/mcp/context";
import { mcpResponse } from "@/server/mcp/formatters";
import {
  looseObjectOutputSchema,
  optionalMetaOutputSchema,
} from "@/server/mcp/output-schemas";
import { withMcpProjectAuth } from "@/server/mcp/project-auth";
import { projectIdSchema } from "@/server/mcp/schemas";
import {
  RESEARCH_SEARCH_HISTORY_PAGE_SIZE,
  researchSearchHistoryFeatureSchema,
} from "@/shared/research-search-history";

const inputSchema = {
  projectId: projectIdSchema,
  feature: researchSearchHistoryFeatureSchema.describe(
    "Which research surface's history to list (e.g. brand_lookup, prompt_explorer, keyword_research).",
  ),
  page: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Page number (1-based). Defaults to 1."),
  pageSize: z
    .number()
    .int()
    .positive()
    .max(RESEARCH_SEARCH_HISTORY_PAGE_SIZE)
    .optional()
    .describe(
      `Rows per page. Defaults to ${RESEARCH_SEARCH_HISTORY_PAGE_SIZE}.`,
    ),
} as const;

type Args = z.infer<z.ZodObject<typeof inputSchema>>;

function formatHistoryItem(
  item: Awaited<
    ReturnType<typeof ResearchSearchHistoryService.listSearchHistory>
  >["items"][number],
): string {
  const payload = JSON.stringify(item.payload);
  const preview =
    payload.length > 120 ? `${payload.slice(0, 117)}…` : payload;
  return `- ${item.id}  ${item.searchedAt}  ${preview}`;
}

export const listSearchHistoryTool = {
  name: "list_search_history",
  config: {
    title: "List research search history",
    description:
      "Lists recent searches for a project feature (keyword research, domain overview, backlinks, brand lookup, or prompt explorer). Uses no credits — reads from OpenSEO's database. Use this to recall prior queries before re-running paid lookups.",
    inputSchema,
    outputSchema: {
      items: z.array(looseObjectOutputSchema),
      totalCount: z.number(),
      hasMore: z.boolean(),
      ...optionalMetaOutputSchema,
    },
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    },
  },
  handler: withMcpProjectAuth(async (args: Args, context) => {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? RESEARCH_SEARCH_HISTORY_PAGE_SIZE;
    const { items, totalCount, hasMore } =
      await ResearchSearchHistoryService.listSearchHistory({
        projectId: args.projectId,
        feature: args.feature,
        page,
        pageSize,
      });

    const text =
      items.length === 0
        ? `No search history for feature "${args.feature}" yet.`
        : `Search history for "${args.feature}" (${items.length} of ${totalCount}, page ${page}):\n${items.map(formatHistoryItem).join("\n")}` +
          (hasMore ? "\n(more pages available — increase page)" : "");

    return mcpResponse({
      text,
      meta: buildProjectMeta(context, args.projectId, `/p/${args.projectId}`),
      structuredContent: { items, totalCount, hasMore },
    });
  }),
};
