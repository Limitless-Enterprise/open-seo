import { createServerFn } from "@tanstack/react-start";
import { ResearchSearchHistoryService } from "@/server/features/research/services/ResearchSearchHistoryService";
import { requireProjectContext } from "@/serverFunctions/middleware";
import {
  addResearchSearchHistorySchema,
  importResearchSearchHistorySchema,
  listResearchSearchHistorySchema,
  removeResearchSearchHistorySchema,
} from "@/types/schemas/research-search-history";

export const listResearchSearchHistory = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(listResearchSearchHistorySchema)
  .handler(async ({ data, context }) => {
    return ResearchSearchHistoryService.listSearchHistory({
      ...data,
      projectId: context.projectId,
    });
  });

export const addResearchSearchHistory = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(addResearchSearchHistorySchema)
  .handler(async ({ data, context }) => {
    await ResearchSearchHistoryService.addSearchHistory(
      { ...data, projectId: context.projectId },
      context.userId,
    );
  });

export const removeResearchSearchHistory = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(removeResearchSearchHistorySchema)
  .handler(async ({ data, context }) => {
    await ResearchSearchHistoryService.removeSearchHistory({
      ...data,
      projectId: context.projectId,
    });
  });

export const importResearchSearchHistory = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(importResearchSearchHistorySchema)
  .handler(async ({ data, context }) => {
    await ResearchSearchHistoryService.importSearchHistory(
      { ...data, projectId: context.projectId },
      context.userId,
    );
  });
