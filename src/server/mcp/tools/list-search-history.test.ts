import { beforeEach, describe, expect, it, vi } from "vitest";
import { listSearchHistoryTool } from "./list-search-history";
import { makeToolContext } from "./tool-test-support";

const mocks = vi.hoisted(() => ({
  getProjectForOrganization: vi.fn(),
  listSearchHistory: vi.fn(),
}));

vi.mock("@/server/features/projects/services/ProjectService", () => ({
  ProjectService: {
    getProjectForOrganization: mocks.getProjectForOrganization,
  },
}));

vi.mock("@/server/auth/repositories/AuthRepository", () => ({
  AuthRepository: { getMembership: vi.fn() },
}));

vi.mock(
  "@/server/features/research/services/ResearchSearchHistoryService",
  () => ({
    ResearchSearchHistoryService: {
      listSearchHistory: mocks.listSearchHistory,
    },
  }),
);

const toolContext = makeToolContext();

describe("list_search_history MCP tool", () => {
  beforeEach(() => {
    mocks.getProjectForOrganization.mockResolvedValue({
      id: "project_1",
      locationCode: 2840,
      languageCode: "en",
    });
    mocks.listSearchHistory.mockResolvedValue({
      items: [],
      totalCount: 0,
      hasMore: false,
    });
  });

  it("scopes history to the requested project and feature", async () => {
    await listSearchHistoryTool.handler(
      {
        projectId: "project_1",
        feature: "brand_lookup",
        page: 2,
        pageSize: 10,
      },
      toolContext,
    );

    expect(mocks.getProjectForOrganization).toHaveBeenCalledWith(
      "org_123",
      "project_1",
    );
    expect(mocks.listSearchHistory).toHaveBeenCalledWith({
      projectId: "project_1",
      feature: "brand_lookup",
      page: 2,
      pageSize: 10,
    });
  });

  it("does not call the service when project access fails", async () => {
    mocks.getProjectForOrganization.mockRejectedValue(new Error("not found"));

    await expect(
      listSearchHistoryTool.handler(
        { projectId: "project_other", feature: "prompt_explorer" },
        toolContext,
      ),
    ).rejects.toThrow("not found");

    expect(mocks.listSearchHistory).not.toHaveBeenCalled();
  });
});
