import { identity, sortBy } from "remeda";
import { z } from "zod";
import {
  RESEARCH_SEARCH_HISTORY_FEATURES,
  RESEARCH_SEARCH_HISTORY_LOCAL_STORAGE_KEYS,
  RESEARCH_SEARCH_HISTORY_MIGRATION_KEY,
  backlinksHistoryPayloadSchema,
  brandLookupHistoryPayloadSchema,
  domainOverviewHistoryPayloadSchema,
  keywordResearchHistoryPayloadSchema,
  promptExplorerHistoryPayloadSchema,
  type ResearchSearchHistoryFeature,
} from "@/shared/research-search-history";
import { jsonCodec } from "@/shared/json";
import { researchScopeSchema } from "@/shared/researchScope";
import { promptExplorerModelSchema } from "@/types/schemas/ai-search";

const SCOPE_VERSION = 2;
const LEGACY_BACKLINKS_SCOPES: Record<string, string> = {
  domain: "subdomains",
  page: "exact_url",
};

const keywordMigrationItemSchema = z.object({
  keyword: z.string(),
  locationCode: z.number(),
  locationName: z.string(),
  timestamp: z.number(),
});

const domainMigrationItemSchema = z
  .object({
    domain: z.string(),
    scope: researchScopeSchema.optional(),
    subdomains: z.boolean().optional(),
    sort: z.enum(["rank", "traffic", "volume", "score", "cpc"]),
    tab: z.enum(["keywords", "pages"]),
    locationCode: z.number().int().positive().optional(),
    timestamp: z.number(),
  })
  .transform(({ subdomains, scope, timestamp, ...item }) => ({
    ...item,
    scope: scope ?? (subdomains === false ? "domain" : "subdomains"),
    timestamp,
  }));

const backlinksMigrationItemSchema = z
  .object({
    target: z.string(),
    scope: z.string(),
    scopeVersion: z.literal(SCOPE_VERSION).optional(),
    timestamp: z.number(),
  })
  .transform((item) => {
    const scope = researchScopeSchema.parse(
      item.scopeVersion === SCOPE_VERSION
        ? item.scope
        : LEGACY_BACKLINKS_SCOPES[item.scope],
    );
    return {
      target: item.target,
      scope,
      timestamp: item.timestamp,
    };
  });

const brandLookupMigrationItemSchema = z.object({
  query: z.string(),
  competitors: z.array(z.string()).optional().default([]),
  scope: researchScopeSchema.optional(),
  timestamp: z.number(),
});

const promptExplorerMigrationItemSchema = z.object({
  prompt: z.string(),
  highlightBrand: z.string(),
  models: z.array(promptExplorerModelSchema),
  webSearch: z.boolean(),
  webSearchCountryCode: z.string(),
  timestamp: z.number(),
});

const migrationParsers = {
  keyword_research: jsonCodec(z.array(keywordMigrationItemSchema)),
  domain_overview: jsonCodec(z.array(domainMigrationItemSchema)),
  backlinks: jsonCodec(z.array(backlinksMigrationItemSchema)),
  brand_lookup: jsonCodec(z.array(brandLookupMigrationItemSchema)),
  prompt_explorer: jsonCodec(z.array(promptExplorerMigrationItemSchema)),
} as const;

function readLocalStorageItems(projectId: string) {
  const items: Array<{
    feature: ResearchSearchHistoryFeature;
    payload: unknown;
    searchedAt: string;
  }> = [];

  for (const feature of RESEARCH_SEARCH_HISTORY_FEATURES) {
    const raw = localStorage.getItem(
      RESEARCH_SEARCH_HISTORY_LOCAL_STORAGE_KEYS[feature](projectId),
    );
    if (!raw) continue;

    const parsed = migrationParsers[feature].safeParse(raw);
    if (!parsed.success) continue;

    for (const item of parsed.data) {
      const { timestamp, ...payload } = item;
      switch (feature) {
        case "keyword_research": {
          const validated = keywordResearchHistoryPayloadSchema.parse(payload);
          items.push({
            feature,
            payload: validated,
            searchedAt: new Date(timestamp).toISOString(),
          });
          break;
        }
        case "domain_overview": {
          const validated = domainOverviewHistoryPayloadSchema.parse(payload);
          items.push({
            feature,
            payload: validated,
            searchedAt: new Date(timestamp).toISOString(),
          });
          break;
        }
        case "backlinks": {
          const validated = backlinksHistoryPayloadSchema.parse(payload);
          items.push({
            feature,
            payload: validated,
            searchedAt: new Date(timestamp).toISOString(),
          });
          break;
        }
        case "brand_lookup": {
          const validated = brandLookupHistoryPayloadSchema.parse(payload);
          items.push({
            feature,
            payload: validated,
            searchedAt: new Date(timestamp).toISOString(),
          });
          break;
        }
        case "prompt_explorer": {
          const promptPayload = promptExplorerMigrationItemSchema.parse(item);
          const validated = promptExplorerHistoryPayloadSchema.parse({
            prompt: promptPayload.prompt,
            highlightBrand: promptPayload.highlightBrand,
            models: sortBy(promptPayload.models, identity()),
            webSearch: promptPayload.webSearch,
            webSearchCountryCode: promptPayload.webSearchCountryCode,
          });
          items.push({
            feature,
            payload: validated,
            searchedAt: new Date(timestamp).toISOString(),
          });
          break;
        }
      }
    }
  }

  return items;
}

function clearMigratedLocalStorage(projectId: string) {
  for (const feature of RESEARCH_SEARCH_HISTORY_FEATURES) {
    localStorage.removeItem(
      RESEARCH_SEARCH_HISTORY_LOCAL_STORAGE_KEYS[feature](projectId),
    );
  }
  localStorage.setItem(RESEARCH_SEARCH_HISTORY_MIGRATION_KEY(projectId), "1");
}

export function hasMigratedResearchSearchHistory(projectId: string) {
  return (
    localStorage.getItem(RESEARCH_SEARCH_HISTORY_MIGRATION_KEY(projectId)) ===
    "1"
  );
}

export function readResearchSearchHistoryMigrationItems(projectId: string) {
  if (hasMigratedResearchSearchHistory(projectId)) {
    return [];
  }
  return readLocalStorageItems(projectId);
}

export function markResearchSearchHistoryMigrated(projectId: string) {
  clearMigratedLocalStorage(projectId);
}
