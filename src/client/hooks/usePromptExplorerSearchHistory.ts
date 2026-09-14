import { useResearchSearchHistory } from "@/client/hooks/researchSearchHistory/useResearchSearchHistory";
import type { PromptExplorerHistoryPayload } from "@/shared/research-search-history";

export type PromptExplorerSearchHistoryItem = PromptExplorerHistoryPayload & {
  id: string;
  searchedAt: string;
  searchedBy: {
    userId: string;
    name: string | null;
    email: string;
  };
};

export function usePromptExplorerSearchHistory(projectId: string) {
  const {
    history,
    isLoaded,
    hasMore,
    isLoadingMore,
    loadMore,
    addSearch,
    removeHistoryItem,
  } = useResearchSearchHistory(projectId, "prompt_explorer");

  return {
    history,
    isLoaded,
    hasMore,
    isLoadingMore,
    loadMore,
    addSearch,
    removeHistoryItem,
  };
}
