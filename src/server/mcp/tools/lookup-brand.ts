import { z } from "zod";
import { assertAiVisibilityPaidPlan } from "@/server/features/ai-search/assertAiVisibilityPaidPlan";
import { getBrandLookup } from "@/server/features/ai-search/services/brandLookup";
import { buildProjectMeta } from "@/server/mcp/context";
import { mcpResponse } from "@/server/mcp/formatters";
import { optionalMetaOutputSchema } from "@/server/mcp/output-schemas";
import { withMcpProjectAuth } from "@/server/mcp/project-auth";
import {
  languageCodeSchema,
  locationCodeSchema,
  projectIdSchema,
} from "@/server/mcp/schemas";
import {
  RESEARCH_SCOPE_PARAM_DESCRIPTION,
  researchScopeSchema,
} from "@/shared/researchScope";
import { brandLookupResultSchema } from "@/types/schemas/ai-search";

const inputSchema = {
  projectId: projectIdSchema,
  query: z
    .string()
    .trim()
    .min(1)
    .max(250)
    .describe("Brand name or domain to look up in AI search (ChatGPT + Google AI Overview)."),
  competitors: z
    .array(z.string().trim().min(1).max(250))
    .max(5)
    .optional()
    .describe(
      "Optional competitor brands/domains for Share of Voice comparison (max 5).",
    ),
  scope: researchScopeSchema
    .optional()
    .describe(RESEARCH_SCOPE_PARAM_DESCRIPTION),
  locationCode: locationCodeSchema.optional(),
  languageCode: languageCodeSchema.optional(),
} as const;

type Args = z.infer<z.ZodObject<typeof inputSchema>>;

function formatBrandLookupText(
  result: z.infer<typeof brandLookupResultSchema>,
): string {
  const lines = [
    `Target: ${result.resolvedTarget} (${result.detectedTargetType}, scope: ${result.scope ?? "n/a"})`,
    `Total mentions: ${result.totalMentions ?? "?"}`,
    `Total AI search volume: ${result.totalAiSearchVolume ?? "?"}`,
    ...(result.aggregatesAreDomainLevel
      ? ["Note: totals are domain-wide; page rows are scoped."]
      : []),
  ];

  for (const platform of result.perPlatform) {
    lines.push(
      `${platform.platform}: ${platform.status === "success" ? `mentions ${platform.mentions ?? "?"}, vol ${platform.aiSearchVolume ?? "?"}` : "error"}`,
    );
  }

  if (result.shareOfVoice?.entries.length) {
    lines.push("Share of voice:");
    for (const entry of result.shareOfVoice.entries.slice(0, 6)) {
      lines.push(
        `  ${entry.isTarget ? "*" : " "} ${entry.label}: ${entry.sharePct != null ? `${entry.sharePct.toFixed(1)}%` : "?"} (${entry.mentions ?? "?"} mentions)`,
      );
    }
  }

  if (result.topQueries.length > 0) {
    lines.push("Top queries:");
    for (const q of result.topQueries.slice(0, 5)) {
      lines.push(`  - [${q.platform}] ${q.question}`);
    }
  }

  return lines.join("\n");
}

export const lookupBrandTool = {
  name: "lookup_brand",
  config: {
    title: "Brand lookup (AI visibility)",
    description:
      "Measures how a brand or domain appears in ChatGPT and Google AI Overview: mention counts, AI search volume, top cited pages and queries, and optional competitor Share of Voice. Charges credits (multiple DataForSEO LLM calls; cached 24h per target). Hosted accounts require a paid plan; self-hosted is not plan-gated.",
    inputSchema,
    outputSchema: brandLookupResultSchema
      .extend({ ...optionalMetaOutputSchema })
      .passthrough(),
    annotations: {
      readOnlyHint: false,
      openWorldHint: false,
      destructiveHint: false,
    },
  },
  handler: withMcpProjectAuth(async (args: Args, context) => {
    await assertAiVisibilityPaidPlan(context.auth.organizationId);

    const result = await getBrandLookup(
      {
        projectId: args.projectId,
        query: args.query,
        competitors: args.competitors ?? [],
        scope: args.scope,
        locationCode: args.locationCode ?? context.project.locationCode,
        languageCode: args.languageCode ?? context.project.languageCode,
      },
      context.billing,
    );

    return mcpResponse({
      text: result.hasData
        ? formatBrandLookupText(result)
        : `No AI visibility data found for "${args.query}".`,
      meta: buildProjectMeta(
        context,
        args.projectId,
        `/p/${args.projectId}/brand-lookup`,
        { q: args.query },
      ),
      structuredContent: result,
    });
  }),
};
