import { readFileSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type * as ResearchSearchHistoryRepositoryModule from "./ResearchSearchHistoryRepository";

vi.mock("cloudflare:workers", () => ({
  env: { DATABASE_PROVIDER: "d1" },
}));

let client: Client;
let ResearchSearchHistoryRepository: typeof ResearchSearchHistoryRepositoryModule.ResearchSearchHistoryRepository;

const PROJECT_A = "proj_a";
const PROJECT_B = "proj_b";
const USER_A = "user_a";
const USER_B = "user_b";

beforeAll(async () => {
  client = createClient({ url: "file::memory:" });
  const testDb = drizzle(client);
  vi.doMock("@/db", () => ({ db: testDb }));

  await client.executeMultiple(
    [
      `CREATE TABLE projects (id text PRIMARY KEY);`,
      `CREATE TABLE user (id text PRIMARY KEY, name text, email text NOT NULL);`,
      `INSERT INTO projects (id) VALUES ('${PROJECT_A}'), ('${PROJECT_B}');`,
      `INSERT INTO user (id, name, email) VALUES ('${USER_A}', 'Alice', 'alice@example.com'), ('${USER_B}', 'Bob', 'bob@example.com');`,
      readFileSync("drizzle/0047_research_search_history.sql", "utf8"),
    ].join("\n"),
  );

  ({ ResearchSearchHistoryRepository } = await import(
    "./ResearchSearchHistoryRepository"
  ));
});

afterAll(() => {
  client.close();
});

beforeEach(async () => {
  vi.useFakeTimers();
  await client.execute(`DELETE FROM research_search_history;`);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ResearchSearchHistoryRepository", () => {
  it("updates searched_at on duplicate payload instead of inserting a new row", async () => {
    vi.setSystemTime("2026-01-01T00:00:00.000Z");
    const first = await ResearchSearchHistoryRepository.upsertSearch({
      projectId: PROJECT_A,
      feature: "keyword_research",
      payload: {
        keyword: "seo tools",
        locationCode: 2840,
        locationName: "United States",
      },
      searchedByUserId: USER_A,
    });

    vi.setSystemTime("2026-01-02T00:00:00.000Z");
    const second = await ResearchSearchHistoryRepository.upsertSearch({
      projectId: PROJECT_A,
      feature: "keyword_research",
      payload: {
        keyword: "seo tools",
        locationCode: 2840,
        locationName: "United States",
      },
      searchedByUserId: USER_B,
    });

    expect(second?.id).toBe(first?.id);
    expect(second?.searchedAt).toBe("2026-01-02T00:00:00.000Z");
    expect(second?.searchedByUserId).toBe(USER_B);

    const count = await ResearchSearchHistoryRepository.countForProjectFeature(
      PROJECT_A,
      "keyword_research",
    );
    expect(count).toBe(1);
  });

  it("paginates list results newest-first", async () => {
    for (const [index, keyword] of [
      "alpha",
      "beta",
      "gamma",
      "delta",
      "epsilon",
    ].entries()) {
      vi.setSystemTime(`2026-01-0${index + 1}T00:00:00.000Z`);
      await ResearchSearchHistoryRepository.upsertSearch({
        projectId: PROJECT_A,
        feature: "keyword_research",
        payload: {
          keyword,
          locationCode: 2840,
          locationName: "United States",
        },
        searchedByUserId: USER_A,
      });
    }

    const page1 = await ResearchSearchHistoryRepository.listByProjectAndFeature(
      {
        projectId: PROJECT_A,
        feature: "keyword_research",
        page: 1,
        pageSize: 2,
      },
    );
    const page2 = await ResearchSearchHistoryRepository.listByProjectAndFeature(
      {
        projectId: PROJECT_A,
        feature: "keyword_research",
        page: 2,
        pageSize: 2,
      },
    );

    expect(
      page1.items.map((item) =>
        item.feature === "keyword_research" ? item.payload.keyword : null,
      ),
    ).toEqual(["epsilon", "delta"]);
    expect(page1.hasMore).toBe(true);
    expect(
      page2.items.map((item) =>
        item.feature === "keyword_research" ? item.payload.keyword : null,
      ),
    ).toEqual(["gamma", "beta"]);
    expect(page2.hasMore).toBe(true);
  });

  it("scopes history to the requested project", async () => {
    await ResearchSearchHistoryRepository.upsertSearch({
      projectId: PROJECT_A,
      feature: "backlinks",
      payload: { target: "example.com", scope: "domain" },
      searchedByUserId: USER_A,
      searchedAt: "2026-01-01T00:00:00.000Z",
    });
    await ResearchSearchHistoryRepository.upsertSearch({
      projectId: PROJECT_B,
      feature: "backlinks",
      payload: { target: "other.com", scope: "domain" },
      searchedByUserId: USER_B,
      searchedAt: "2026-01-02T00:00:00.000Z",
    });

    const projectA =
      await ResearchSearchHistoryRepository.listByProjectAndFeature({
        projectId: PROJECT_A,
        feature: "backlinks",
        page: 1,
        pageSize: 20,
      });

    expect(projectA.items).toHaveLength(1);
    expect(
      projectA.items[0]?.feature === "backlinks"
        ? projectA.items[0].payload.target
        : null,
    ).toBe("example.com");
    expect(projectA.items[0]?.searchedBy.email).toBe("alice@example.com");
  });
});
