import { importResearchSearchHistory } from "@/serverFunctions/researchSearchHistory";
import {
  hasMigratedResearchSearchHistory,
  markResearchSearchHistoryMigrated,
  readResearchSearchHistoryMigrationItems,
} from "./localStorageMigration";

const migrationPromises = new Map<string, Promise<void>>();

export function migrateResearchSearchHistoryIfNeeded(projectId: string) {
  if (hasMigratedResearchSearchHistory(projectId)) {
    return Promise.resolve();
  }

  const existing = migrationPromises.get(projectId);
  if (existing) return existing;

  const items = readResearchSearchHistoryMigrationItems(projectId);
  if (items.length === 0) {
    markResearchSearchHistoryMigrated(projectId);
    return Promise.resolve();
  }

  const promise = importResearchSearchHistory({
    data: {
      projectId,
      items,
    },
  })
    .then(() => {
      markResearchSearchHistoryMigrated(projectId);
    })
    .finally(() => {
      migrationPromises.delete(projectId);
    });

  migrationPromises.set(projectId, promise);
  return promise;
}
