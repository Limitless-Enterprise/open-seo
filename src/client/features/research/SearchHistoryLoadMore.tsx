type Props = {
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
};

export function SearchHistoryLoadMore({
  hasMore,
  isLoadingMore,
  onLoadMore,
}: Props) {
  if (!hasMore) return null;

  return (
    <div className="mt-4 flex justify-center">
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={onLoadMore}
        disabled={isLoadingMore}
      >
        {isLoadingMore ? "Loading..." : "Load more"}
      </button>
    </div>
  );
}
