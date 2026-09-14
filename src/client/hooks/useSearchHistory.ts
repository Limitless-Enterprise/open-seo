import { useResearchSearchHistory } from "@/client/hooks/researchSearchHistory/useResearchSearchHistory";
import type { KeywordResearchHistoryPayload } from "@/shared/research-search-history";

export type SearchHistoryItem = KeywordResearchHistoryPayload & {
  id: string;
  searchedAt: string;
  searchedBy: {
    userId: string;
    name: string | null;
    email: string;
  };
};

export function useSearchHistory(projectId: string) {
  const {
    history,
    isLoaded,
    hasMore,
    isLoadingMore,
    loadMore,
    addSearch,
    removeHistoryItem,
  } = useResearchSearchHistory(projectId, "keyword_research");

  return {
    history,
    isLoaded,
    hasMore,
    isLoadingMore,
    loadMore,
    addSearch: (
      keyword: string,
      locationCode: number,
      locationName: string,
    ) => addSearch({ keyword, locationCode, locationName }),
    removeHistoryItem,
  };
}
