import { identity, sortBy } from "remeda";
import { z } from "zod";
import {
  promptExplorerModelSchema,
  webSearchCountryCodeSchema,
} from "@/types/schemas/ai-search";
import { researchScopeSchema } from "@/shared/researchScope";

export const RESEARCH_SEARCH_HISTORY_FEATURES = [
  "keyword_research",
  "domain_overview",
  "backlinks",
  "brand_lookup",
  "prompt_explorer",
] as const;

export type ResearchSearchHistoryFeature =
  (typeof RESEARCH_SEARCH_HISTORY_FEATURES)[number];

export const researchSearchHistoryFeatureSchema = z.enum(
  RESEARCH_SEARCH_HISTORY_FEATURES,
);

export const keywordResearchHistoryPayloadSchema = z.object({
  keyword: z.string(),
  locationCode: z.number(),
  locationName: z.string(),
});

export const domainOverviewHistoryPayloadSchema = z.object({
  domain: z.string(),
  scope: researchScopeSchema,
  sort: z.enum(["rank", "traffic", "volume", "score", "cpc"]),
  tab: z.enum(["keywords", "pages"]),
  locationCode: z.number().int().positive().optional(),
});

export const backlinksHistoryPayloadSchema = z.object({
  target: z.string(),
  scope: researchScopeSchema,
});

export const brandLookupHistoryPayloadSchema = z.object({
  query: z.string(),
  competitors: z.array(z.string()),
  scope: researchScopeSchema.optional(),
});

export const promptExplorerHistoryPayloadSchema = z.object({
  prompt: z.string(),
  highlightBrand: z.string(),
  models: z.array(promptExplorerModelSchema),
  webSearch: z.boolean(),
  webSearchCountryCode: webSearchCountryCodeSchema,
});

export type KeywordResearchHistoryPayload = z.infer<
  typeof keywordResearchHistoryPayloadSchema
>;
export type DomainOverviewHistoryPayload = z.infer<
  typeof domainOverviewHistoryPayloadSchema
>;
export type BacklinksHistoryPayload = z.infer<
  typeof backlinksHistoryPayloadSchema
>;
export type BrandLookupHistoryPayload = z.infer<
  typeof brandLookupHistoryPayloadSchema
>;
export type PromptExplorerHistoryPayload = z.infer<
  typeof promptExplorerHistoryPayloadSchema
>;

export type ResearchSearchHistoryPayloadByFeature = {
  keyword_research: KeywordResearchHistoryPayload;
  domain_overview: DomainOverviewHistoryPayload;
  backlinks: BacklinksHistoryPayload;
  brand_lookup: BrandLookupHistoryPayload;
  prompt_explorer: PromptExplorerHistoryPayload;
};

const payloadSchemaByFeature = {
  keyword_research: keywordResearchHistoryPayloadSchema,
  domain_overview: domainOverviewHistoryPayloadSchema,
  backlinks: backlinksHistoryPayloadSchema,
  brand_lookup: brandLookupHistoryPayloadSchema,
  prompt_explorer: promptExplorerHistoryPayloadSchema,
} as const;

export function parseResearchSearchHistoryPayload<
  TFeature extends ResearchSearchHistoryFeature,
>(
  feature: TFeature,
  payload: unknown,
): ResearchSearchHistoryPayloadByFeature[TFeature] {
  return payloadSchemaByFeature[feature].parse(
    payload,
  ) as ResearchSearchHistoryPayloadByFeature[TFeature];
}

export function buildResearchSearchHistoryDedupKey(
  feature: ResearchSearchHistoryFeature,
  payload: unknown,
): string {
  switch (feature) {
    case "keyword_research": {
      const parsed = keywordResearchHistoryPayloadSchema.parse(payload);
      return `${parsed.keyword}\0${parsed.locationCode}`;
    }
    case "domain_overview": {
      const parsed = domainOverviewHistoryPayloadSchema.parse(payload);
      return [
        parsed.domain,
        parsed.scope,
        parsed.sort,
        parsed.tab,
        parsed.locationCode ?? "",
      ].join("\0");
    }
    case "backlinks": {
      const parsed = backlinksHistoryPayloadSchema.parse(payload);
      return `${parsed.target}\0${parsed.scope}`;
    }
    case "brand_lookup": {
      const parsed = brandLookupHistoryPayloadSchema.parse(payload);
      return [
        parsed.query,
        parsed.competitors.join(","),
        parsed.scope ?? "",
      ].join("\0");
    }
    case "prompt_explorer": {
      const parsed = promptExplorerHistoryPayloadSchema.parse(payload);
      return JSON.stringify({
        prompt: parsed.prompt,
        highlightBrand: parsed.highlightBrand,
        models: sortBy(parsed.models, identity()),
        webSearch: parsed.webSearch,
        webSearchCountryCode: parsed.webSearchCountryCode,
      });
    }
    default: {
      const _exhaustive: never = feature;
      return _exhaustive;
    }
  }
}

export const RESEARCH_SEARCH_HISTORY_PAGE_SIZE = 20;

export const RESEARCH_SEARCH_HISTORY_LOCAL_STORAGE_KEYS = {
  keyword_research: (projectId: string) => `search-history:${projectId}`,
  domain_overview: (projectId: string) =>
    `domain-search-history:${projectId}`,
  backlinks: (projectId: string) => `backlinks-search-history:${projectId}`,
  brand_lookup: (projectId: string) =>
    `brand-lookup-search-history:${projectId}`,
  prompt_explorer: (projectId: string) =>
    `prompt-explorer-search-history:${projectId}`,
} as const satisfies Record<
  ResearchSearchHistoryFeature,
  (projectId: string) => string
>;

export const RESEARCH_SEARCH_HISTORY_MIGRATION_KEY = (projectId: string) =>
  `research-search-history-migrated:${projectId}`;
