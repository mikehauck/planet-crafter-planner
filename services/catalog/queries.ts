import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { loadCatalog } from "./load";
import type { Catalog } from "./schema";

/** All items with their recipes. Game data only changes on a re-import, so cache it; revalidate the "catalog" tag after edits. */
export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");

  const catalog = await loadCatalog(db);
  logger.info({ items: Object.keys(catalog).length }, "catalog loaded");
  return catalog;
}
