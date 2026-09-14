import { Link } from "@tanstack/react-router";
import { Clock, History, Link2, X } from "lucide-react";
import type { BacklinksSearchHistoryItem } from "@/client/hooks/useBacklinksSearchHistory";
import { SearchHistoryLoadMore } from "@/client/features/research/SearchHistoryLoadMore";
import { SearchHistoryMeta } from "@/client/features/research/SearchHistoryMeta";
import { RESEARCH_SCOPE_LABELS } from "@/shared/researchScope";
import { toScopeSearchParam } from "@/shared/researchScope";

type Props = {
  projectId: string;
  history: BacklinksSearchHistoryItem[];
  historyLoaded: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onRemoveHistoryItem: (id: string) => void;
};

export function BacklinksHistorySection({
  projectId,
  history,
  historyLoaded,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onRemoveHistoryItem,
}: Props) {
  if (!historyLoaded) {
    return null;
  }

  if (history.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-base-300 bg-base-100/70 p-6 text-center text-base-content/55 space-y-2">
        <Link2 className="size-9 mx-auto opacity-35" />
        <p className="text-base font-medium text-base-content/80">
          Enter a domain or URL to get started
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-base-300 bg-base-100 p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="size-4 text-base-content/45" />
          <span className="text-sm text-base-content/60">
            {history.length} recent search{history.length !== 1 ? "es" : ""}
          </span>
        </div>
      </div>

      <div className="grid gap-2">
        {history.map((item) => (
          <div
            key={item.id}
            className="group flex items-center gap-2 rounded-lg border border-base-300 bg-base-100 p-2"
          >
            <Link
              to="/p/$projectId/backlinks"
              params={{ projectId }}
              search={(prev) => ({
                ...prev,
                target: item.target,
                scope: toScopeSearchParam(item.target, item.scope),
                tab: undefined,
                page: undefined,
                sort: undefined,
                order: undefined,
              })}
              replace
              className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-1 py-1 text-left transition-colors hover:bg-base-200"
            >
              <Clock className="size-4 text-base-content/40 shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-base-content truncate">
                  {item.target}
                </p>
                <p className="text-sm text-base-content/60 truncate">
                  {RESEARCH_SCOPE_LABELS[item.scope]}
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              <SearchHistoryMeta
                searchedAt={item.searchedAt}
                searchedBy={item.searchedBy}
              />
              <button
                type="button"
                className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 p-1"
                onClick={() => onRemoveHistoryItem(item.id)}
                aria-label="Remove from history"
              >
                <X className="size-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {onLoadMore ? (
        <SearchHistoryLoadMore
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={onLoadMore}
        />
      ) : null}
    </section>
  );
}
