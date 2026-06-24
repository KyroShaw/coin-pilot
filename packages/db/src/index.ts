import { env } from "@coin-pilot/env/server";
import { drizzle } from "drizzle-orm/node-postgres";

// biome-ignore lint/performance/noNamespaceImport: drizzle 需要完整 schema 命名空间用于关系映射
import * as schema from "./schema";

export function createDb() {
	return drizzle(env.DATABASE_URL, { schema });
}

export const db = createDb();
