import { createHash } from "node:crypto";

import { env } from "@coin-pilot/env/server";

const CRYPTOPANIC_BASE = "https://cryptopanic.com/api/v1/posts/";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;

/** 内部新闻标签。 */
export type NewsTag = "macro" | "regulation" | "market";

/** 拉取并映射后的新闻条目（落库前结构）。 */
export interface NewsInput {
	externalId: string;
	publishedAt: Date;
	source: string;
	tags: NewsTag[];
	title: string;
	url: string;
}

const REGULATION_RE =
	/\b(sec|regulat|lawsuit|court|ban|sanction|compliance|legal|congress|senate|cftc)\b/i;
const MACRO_RE =
	/\b(fed|inflation|cpi|interest rate|gdp|economy|central bank|treasury|jobs|unemployment|recession|fomc)\b/i;

/** 根据标题/来源关键词映射内部标签，至少返回 market 兜底。 */
export function mapTags(title: string, source: string): NewsTag[] {
	const haystack = `${title} ${source}`;
	const tags = new Set<NewsTag>();
	if (REGULATION_RE.test(haystack)) {
		tags.add("regulation");
	}
	if (MACRO_RE.test(haystack)) {
		tags.add("macro");
	}
	tags.add("market");
	return [...tags];
}

const TRAILING_SLASH_RE = /\/+$/;

/** 规范化 url 后取 sha256 作为缺失 id 时的去重键兜底。 */
export function urlHash(url: string): string {
	const normalized = url.trim().toLowerCase().replace(TRAILING_SLASH_RE, "");
	return createHash("sha256").update(normalized).digest("hex");
}

interface CryptoPanicPost {
	id?: number | string;
	published_at?: string;
	source?: { title?: string; domain?: string };
	title?: string;
	url?: string;
}

function isRetryable(status: number): boolean {
	return status === 429 || status >= 500;
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

async function fetchPostsOnce(): Promise<CryptoPanicPost[]> {
	const url = `${CRYPTOPANIC_BASE}?auth_token=${env.CRYPTOPANIC_API_KEY}&public=true`;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

	try {
		const response = await fetch(url, { signal: controller.signal });
		if (!response.ok) {
			const error = new Error(`CryptoPanic ${response.status}`);
			(error as Error & { status?: number }).status = response.status;
			throw error;
		}
		const body = (await response.json()) as { results?: CryptoPanicPost[] };
		return body.results ?? [];
	} finally {
		clearTimeout(timer);
	}
}

/**
 * 拉取 CryptoPanic 热点消息并映射为内部结构。
 * 对 429/5xx 做指数退避重试（最多 3 次），超限抛错由调用方跳过本轮。
 */
export async function fetchCryptoPanicNews(): Promise<NewsInput[]> {
	let lastError: unknown;
	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		try {
			const posts = await fetchPostsOnce();
			return posts
				.filter((p) => typeof p.title === "string" && typeof p.url === "string")
				.map((p) => {
					const source = p.source?.title ?? p.source?.domain ?? "Unknown";
					const title = p.title as string;
					const url = p.url as string;
					const externalId = p.id ? String(p.id) : urlHash(url);
					return {
						externalId,
						title,
						url,
						source,
						publishedAt: p.published_at ? new Date(p.published_at) : new Date(),
						tags: mapTags(title, source),
					};
				});
		} catch (error) {
			lastError = error;
			const status = (error as Error & { status?: number }).status;
			if (status !== undefined && !isRetryable(status)) {
				throw error;
			}
			if (attempt < MAX_RETRIES - 1) {
				await delay(BASE_BACKOFF_MS * 2 ** attempt);
			}
		}
	}
	throw lastError instanceof Error
		? lastError
		: new Error("CryptoPanic 拉取失败");
}
