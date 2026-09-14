import { useResearchSearchHistory } from "@/client/hooks/researchSearchHistory/useResearchSearchHistory";
import type { DomainOverviewHistoryPayload } from "@/shared/research-search-history";

export type DomainSearchHistoryItem = DomainOverviewHistoryPayload & {
  id: string;
  searchedAt: string;
  searchedBy: {
    userId: string;
    name: string | null;
    email: string;
  };
};

type AddDomainSearchInput = DomainOverviewHistoryPayload;

export function useDomainSearchHistory(projectId: string) {
  const {
    history,
    isLoaded,
    hasMore,
    isLoadingMore,
    loadMore,
    addSearch,
    removeHistoryItem,
  } = useResearchSearchHistory(projectId, "domain_overview");

  return {
    history,
    isLoaded,
    hasMore,
    isLoadingMore,
    loadMore,
    addSearch: (input: AddDomainSearchInput) => addSearch(input),
    removeHistoryItem,
  };
}
