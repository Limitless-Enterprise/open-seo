import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { researchSearchHistory, user } from "@/db/schema";
import {
  buildResearchSearchHistoryDedupKey,
  parseResearchSearchHistoryPayload,
  type ResearchSearchHistoryFeature,
  type ResearchSearchHistoryPayloadByFeature,
} from "@/shared/research-search-history";

type ResearchSearchHistoryRow = typeof researchSearchHistory.$inferSelect;

export type ResearchSearchHistoryListItem<
  TFeature extends ResearchSearchHistoryFeature = ResearchSearchHistoryFeature,
> = {
  id: string;
  feature: TFeature;
  payload: ResearchSearchHistoryPayloadByFeature[TFeature];
  searchedAt: string;
  searchedBy: {
    userId: string;
    name: string | null;
    email: string;
  };
};

type ListParams = {
  projectId: string;
  feature: ResearchSearchHistoryFeature;
  page: number;
  pageSize: number;
};

type UpsertParams<TFeature extends ResearchSearchHistoryFeature> = {
  projectId: string;
  feature: TFeature;
  payload: ResearchSearchHistoryPayloadByFeature[TFeature];
  searchedByUserId: string;
  searchedAt?: string;
  onlyUpdateIfNewer?: boolean;
};

function mapRow<
  TFeature extends ResearchSearchHistoryFeature,
>(
  row: ResearchSearchHistoryRow,
  searchedByName: string | null,
  searchedByEmail: string,
): ResearchSearchHistoryListItem<TFeature> {
  return {
    id: row.id,
    feature: row.feature as TFeature,
    payload: parseResearchSearchHistoryPayload(
      row.feature as TFeature,
      JSON.parse(row.payloadJson),
    ),
    searchedAt: row.searchedAt,
    searchedBy: {
      userId: row.searchedByUserId,
      name: searchedByName,
      email: searchedByEmail,
    },
  };
}

async function listByProjectAndFeature<
  TFeature extends ResearchSearchHistoryFeature,
>(params: ListParams & { feature: TFeature }) {
  const offset = (params.page - 1) * params.pageSize;

  const [totalResult] = await db
    .select({ value: count() })
    .from(researchSearchHistory)
    .where(
      and(
        eq(researchSearchHistory.projectId, params.projectId),
        eq(researchSearchHistory.feature, params.feature),
      ),
    );

  const rows = await db
    .select({
      row: researchSearchHistory,
      searchedByName: user.name,
      searchedByEmail: user.email,
    })
    .from(researchSearchHistory)
    .innerJoin(user, eq(researchSearchHistory.searchedByUserId, user.id))
    .where(
      and(
        eq(researchSearchHistory.projectId, params.projectId),
        eq(researchSearchHistory.feature, params.feature),
      ),
    )
    .orderBy(
      desc(researchSearchHistory.searchedAt),
      desc(researchSearchHistory.id),
    )
    .limit(params.pageSize + 1)
    .offset(offset);

  const hasMore = rows.length > params.pageSize;
  const pageRows = hasMore ? rows.slice(0, params.pageSize) : rows;

  return {
    items: pageRows.map(({ row, searchedByName, searchedByEmail }) =>
      mapRow<TFeature>(row, searchedByName, searchedByEmail),
    ),
    totalCount: totalResult?.value ?? 0,
    hasMore,
  };
}

async function upsertSearch<TFeature extends ResearchSearchHistoryFeature>(
  params: UpsertParams<TFeature>,
) {
  const searchedAt = params.searchedAt ?? new Date().toISOString();
  const dedupKey = buildResearchSearchHistoryDedupKey(
    params.feature,
    params.payload,
  );
  const payloadJson = JSON.stringify(params.payload);

  const [existing] = await db
    .select()
    .from(researchSearchHistory)
    .where(
      and(
        eq(researchSearchHistory.projectId, params.projectId),
        eq(researchSearchHistory.feature, params.feature),
        eq(researchSearchHistory.dedupKey, dedupKey),
      ),
    )
    .limit(1);

  if (existing) {
    if (params.onlyUpdateIfNewer && existing.searchedAt >= searchedAt) {
      return existing;
    }

    const [row] = await db
      .update(researchSearchHistory)
      .set({
        payloadJson,
        searchedAt,
        searchedByUserId: params.searchedByUserId,
      })
      .where(eq(researchSearchHistory.id, existing.id))
      .returning();
    return row;
  }

  const [row] = await db
    .insert(researchSearchHistory)
    .values({
      id: crypto.randomUUID(),
      projectId: params.projectId,
      feature: params.feature,
      payloadJson,
      dedupKey,
      searchedByUserId: params.searchedByUserId,
      searchedAt,
    })
    .returning();

  return row;
}

async function removeById(projectId: string, id: string) {
  await db
    .delete(researchSearchHistory)
    .where(
      and(
        eq(researchSearchHistory.projectId, projectId),
        eq(researchSearchHistory.id, id),
      ),
    );
}

async function countForProjectFeature(
  projectId: string,
  feature: ResearchSearchHistoryFeature,
) {
  const [result] = await db
    .select({ value: count() })
    .from(researchSearchHistory)
    .where(
      and(
        eq(researchSearchHistory.projectId, projectId),
        eq(researchSearchHistory.feature, feature),
      ),
    );
  return result?.value ?? 0;
}

export const ResearchSearchHistoryRepository = {
  listByProjectAndFeature,
  upsertSearch,
  removeById,
  countForProjectFeature,
};
