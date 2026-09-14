import { ResearchSearchHistoryRepository } from "@/server/features/research/repositories/ResearchSearchHistoryRepository";
import { parseResearchSearchHistoryPayload } from "@/shared/research-search-history";
import type {
  addResearchSearchHistorySchema,
  importResearchSearchHistorySchema,
  listResearchSearchHistorySchema,
  removeResearchSearchHistorySchema,
} from "@/types/schemas/research-search-history";
import type { z } from "zod";

type ListInput = z.infer<typeof listResearchSearchHistorySchema>;
type AddInput = z.infer<typeof addResearchSearchHistorySchema>;
type RemoveInput = z.infer<typeof removeResearchSearchHistorySchema>;
type ImportInput = z.infer<typeof importResearchSearchHistorySchema>;

async function listSearchHistory(input: ListInput) {
  return ResearchSearchHistoryRepository.listByProjectAndFeature({
    projectId: input.projectId,
    feature: input.feature,
    page: input.page,
    pageSize: input.pageSize,
  });
}

async function addSearchHistory(
  input: AddInput,
  searchedByUserId: string,
) {
  const payload = parseResearchSearchHistoryPayload(
    input.feature,
    input.payload,
  );
  await ResearchSearchHistoryRepository.upsertSearch({
    projectId: input.projectId,
    feature: input.feature,
    payload,
    searchedByUserId,
  });
}

async function removeSearchHistory(input: RemoveInput) {
  await ResearchSearchHistoryRepository.removeById(input.projectId, input.id);
}

async function importSearchHistory(
  input: ImportInput,
  searchedByUserId: string,
) {
  for (const item of input.items) {
    const payload = parseResearchSearchHistoryPayload(
      item.feature,
      item.payload,
    );
    await ResearchSearchHistoryRepository.upsertSearch({
      projectId: input.projectId,
      feature: item.feature,
      payload,
      searchedByUserId,
      searchedAt: item.searchedAt,
      onlyUpdateIfNewer: true,
    });
  }
}

export const ResearchSearchHistoryService = {
  listSearchHistory,
  addSearchHistory,
  removeSearchHistory,
  importSearchHistory,
};
