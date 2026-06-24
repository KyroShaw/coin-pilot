import { db } from "@coin-pilot/db";
import { newsItem } from "@coin-pilot/db/schema/news";
import { eq, isNull } from "drizzle-orm";

import { anthropic, SUMMARY_MODEL } from "../lib/claude";
import { fetchCryptoPanicNews, type NewsInput } from "../lib/cryptopanic";

const SUMMARY_BATCH = 20; // 单轮最多补全的摘要条数
const SUMMARY_CONCURRENCY = 5; // 受控并发
const SUMMARY_MAX_TOKENS = 256;

/** 去重入库：按 externalId upsert（已存在则跳过，不覆盖已生成的摘要）。返回新增条数。 */
async function upsertNews(items: NewsInput[]): Promise<number> {
	if (items.length === 0) {
		return 0;
	}
	const inserted = await db
		.insert(newsItem)
		.values(items)
		.onConflictDoNothing({ target: newsItem.externalId })
		.returning({ id: newsItem.id });
	return inserted.length;
}

function extractText(content: Array<{ type: string; text?: string }>): string {
	return content
		.filter((block) => block.type === "text")
		.map((block) => block.text ?? "")
		.join("")
		.trim();
}

/** 调用 haiku 为单条消息生成一句话影响摘要。 */
async function summarizeOne(title: string): Promise<string> {
	const response = await anthropic.messages.create({
		model: SUMMARY_MODEL,
		max_tokens: SUMMARY_MAX_TOKENS,
		messages: [
			{
				role: "user",
				content: `用一句话中文总结这条加密市场消息的潜在影响，只输出这句话，不要前缀：\n${title}`,
			},
		],
	});
	return extractText(response.content);
}

/**
 * 为 aiSummary IS NULL 的消息受控并发补全摘要并写回缓存。
 * 单条失败跳过（下轮重试），不阻塞展示。返回成功补全条数。
 */
async function generateMissingSummaries(): Promise<number> {
	const pending = await db
		.select({ id: newsItem.id, title: newsItem.title })
		.from(newsItem)
		.where(isNull(newsItem.aiSummary))
		.limit(SUMMARY_BATCH);

	let done = 0;
	for (let i = 0; i < pending.length; i += SUMMARY_CONCURRENCY) {
		const batch = pending.slice(i, i + SUMMARY_CONCURRENCY);
		const results = await Promise.allSettled(
			batch.map(async (item) => {
				const summary = await summarizeOne(item.title);
				if (summary) {
					await db
						.update(newsItem)
						.set({ aiSummary: summary })
						.where(eq(newsItem.id, item.id));
					return true;
				}
				return false;
			})
		);
		done += results.filter(
			(r) => r.status === "fulfilled" && r.value === true
		).length;
	}
	return done;
}

/**
 * 新闻刷新流水线（幂等）：拉取 → 去重入库 → 补摘要。
 * 拉取失败抛错由调用方处理并保留上次数据。
 */
export async function runNewsRefresh(): Promise<{
	fetched: number;
	inserted: number;
	summarized: number;
}> {
	const items = await fetchCryptoPanicNews();
	const inserted = await upsertNews(items);
	const summarized = await generateMissingSummaries();
	return { fetched: items.length, inserted, summarized };
}
