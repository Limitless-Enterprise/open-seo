import { useResearchSearchHistory } from "@/client/hooks/researchSearchHistory/useResearchSearchHistory";
import type { BacklinksHistoryPayload } from "@/shared/research-search-history";

export type BacklinksSearchHistoryItem = BacklinksHistoryPayload & {
  id: string;
  searchedAt: string;
  searchedBy: {
    userId: string;
    name: string | null;
    email: string;
  };
};

type AddBacklinksSearchInput = BacklinksHistoryPayload;

export function useBacklinksSearchHistory(projectId: string) {
  const {
    history,
    isLoaded,
    hasMore,
    isLoadingMore,
    loadMore,
    addSearch,
    removeHistoryItem,
  } = useResearchSearchHistory(projectId, "backlinks");

  return {
    history,
    isLoaded,
    hasMore,
    isLoadingMore,
    loadMore,
    addSearch: (input: AddBacklinksSearchInput) => addSearch(input),
    removeHistoryItem,
  };
}
