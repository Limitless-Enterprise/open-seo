import {
  formatRelativeTime,
  formatSearchedByLabel,
} from "@/client/lib/format-relative-time";

type Props = {
  searchedAt: string;
  searchedBy: {
    name: string | null;
    email: string;
  };
};

export function SearchHistoryMeta({ searchedAt, searchedBy }: Props) {
  return (
    <span className="text-xs text-base-content/40">
      {formatSearchedByLabel(searchedBy.name, searchedBy.email)} ·{" "}
      {formatRelativeTime(searchedAt)}
    </span>
  );
}
