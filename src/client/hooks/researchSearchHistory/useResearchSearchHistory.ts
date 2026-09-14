import { useCallback, useEffect, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  addResearchSearchHistory,
  listResearchSearchHistory,
  removeResearchSearchHistory,
} from "@/serverFunctions/researchSearchHistory";
import {
  RESEARCH_SEARCH_HISTORY_PAGE_SIZE,
  type ResearchSearchHistoryFeature,
  type ResearchSearchHistoryPayloadByFeature,
} from "@/shared/research-search-history";
import { migrateResearchSearchHistoryIfNeeded } from "./migrateResearchSearchHistory";

export type ResearchSearchHistoryEntry<
  TFeature extends ResearchSearchHistoryFeature,
> = ResearchSearchHistoryPayloadByFeature[TFeature] & {
  id: string;
  searchedAt: string;
  searchedBy: {
    userId: string;
    name: string | null;
    email: string;
  };
};

export function researchSearchHistoryQueryKey(
  projectId: string,
  feature: ResearchSearchHistoryFeature,
) {
  return ["researchSearchHistory", projectId, feature] as const;
}

export function useResearchSearchHistory<
  TFeature extends ResearchSearchHistoryFeature,
>(projectId: string, feature: TFeature) {
  const queryClient = useQueryClient();
  const [migrationReady, setMigrationReady] = useState(false);
  const queryKey = researchSearchHistoryQueryKey(projectId, feature);

  useEffect(() => {
    let cancelled = false;
    void migrateResearchSearchHistoryIfNeeded(projectId).finally(() => {
      if (!cancelled) setMigrationReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const listQuery = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const result = await listResearchSearchHistory({
        data: {
          projectId,
          feature,
          page: pageParam,
          pageSize: RESEARCH_SEARCH_HISTORY_PAGE_SIZE,
        },
      });

      return {
        ...result,
        items: result.items.map((item) => ({
          ...item.payload,
          id: item.id,
          searchedAt: item.searchedAt,
          searchedBy: item.searchedBy,
        })) as unknown as ResearchSearchHistoryEntry<TFeature>[],
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.hasMore ? lastPageParam + 1 : undefined,
    enabled: migrationReady,
    staleTime: 30_000,
  });

  const addMutation = useMutation({
    mutationFn: (payload: ResearchSearchHistoryPayloadByFeature[TFeature]) =>
      addResearchSearchHistory({
        data: {
          projectId,
          feature,
          payload,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) =>
      removeResearchSearchHistory({
        data: {
          projectId,
          id,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const history =
    listQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const addSearch = useCallback(
    (payload: ResearchSearchHistoryPayloadByFeature[TFeature]) => {
      addMutation.mutate(payload);
    },
    [addMutation],
  );

  const removeHistoryItem = useCallback(
    (id: string) => {
      removeMutation.mutate(id);
    },
    [removeMutation],
  );

  const loadMore = useCallback(() => {
    if (!listQuery.hasNextPage || listQuery.isFetchingNextPage) return;
    void listQuery.fetchNextPage();
  }, [listQuery]);

  return {
    history,
    isLoaded: migrationReady && listQuery.isSuccess,
    isLoading: !migrationReady || listQuery.isLoading,
    hasMore: listQuery.hasNextPage ?? false,
    isLoadingMore: listQuery.isFetchingNextPage,
    loadMore,
    addSearch,
    removeHistoryItem,
  };
}
