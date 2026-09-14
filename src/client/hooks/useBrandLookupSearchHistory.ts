import { useResearchSearchHistory } from "@/client/hooks/researchSearchHistory/useResearchSearchHistory";
import type { BrandLookupHistoryPayload } from "@/shared/research-search-history";

export type BrandLookupSearchHistoryItem = BrandLookupHistoryPayload & {
  id: string;
  searchedAt: string;
  searchedBy: {
    userId: string;
    name: string | null;
    email: string;
  };
};

export function useBrandLookupSearchHistory(projectId: string) {
  const {
    history,
    isLoaded,
    hasMore,
    isLoadingMore,
    loadMore,
    addSearch,
    removeHistoryItem,
  } = useResearchSearchHistory(projectId, "brand_lookup");

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
