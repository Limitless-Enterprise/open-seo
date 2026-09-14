import { z } from "zod";
import {
  RESEARCH_SEARCH_HISTORY_PAGE_SIZE,
  researchSearchHistoryFeatureSchema,
} from "@/shared/research-search-history";

export const listResearchSearchHistorySchema = z.object({
  projectId: z.string().min(1),
  feature: researchSearchHistoryFeatureSchema,
  page: z.number().int().positive().default(1),
  pageSize: z
    .number()
    .int()
    .positive()
    .max(RESEARCH_SEARCH_HISTORY_PAGE_SIZE)
    .default(RESEARCH_SEARCH_HISTORY_PAGE_SIZE),
});

export const addResearchSearchHistorySchema = z.object({
  projectId: z.string().min(1),
  feature: researchSearchHistoryFeatureSchema,
  payload: z.unknown(),
});

export const removeResearchSearchHistorySchema = z.object({
  projectId: z.string().min(1),
  id: z.string().min(1),
});

export const importResearchSearchHistoryItemSchema = z.object({
  feature: researchSearchHistoryFeatureSchema,
  payload: z.unknown(),
  searchedAt: z.string(),
});

export const importResearchSearchHistorySchema = z.object({
  projectId: z.string().min(1),
  items: z.array(importResearchSearchHistoryItemSchema),
});
