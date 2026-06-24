import { db } from "@coin-pilot/db";
import { closedOrder } from "@coin-pilot/db/schema/order";
import { desc, eq } from "drizzle-orm";

import { anthropic, REASONING_MODEL } from "../lib/claude";
import { detectStreaks } from "../lib/equity";

const RECENT_WINDOW = 30;
const MIN_SAMPLE = 3;
const COACHING_MAX_TOKENS = 2000;

const SYSTEM_PROMPT = [
	"你是冷静、克制的加密交易心理与风控顾问。基于用户近期交易模式的客观统计，",
	"输出简短中文复盘提示，包含两部分（用二级标题）：## 模式分析、## 操作建议。",
	"语气克制、就事论事，避免空泛口号；操作建议聚焦风险控制与情绪管理。只输出正文。",
].join("");

function extractText(content: Array<{ type: string; text?: string }>): string {
	return content
		.filter((block) => block.type === "text")
		.map((block) => block.text ?? "")
		.join("")
		.trim();
}

/**
 * 仅在预警触发后按需调用：汇总近期交易模式特征 → opus-4-8（adaptive thinking，
 * 流式内部生成）→ 返回冷静复盘提示文本。样本不足时返回兜底文案，不调用 AI。
 */
export async function generateCoachingTip(
	userId: string,
	type: "loss" | "profit"
): Promise<{ text: string }> {
	const orders = await db
		.select({ pnl: closedOrder.pnl, closedAt: closedOrder.closedAt })
		.from(closedOrder)
		.where(eq(closedOrder.userId, userId))
		.orderBy(desc(closedOrder.closedAt))
		.limit(RECENT_WINDOW);

	if (orders.length < MIN_SAMPLE) {
		return {
			text: "## 模式分析\n近期样本不足，暂无法给出有依据的分析。\n\n## 操作建议\n建议积累更多交易记录后再复盘，并保持单笔风险可控。",
		};
	}

	const wins = orders.filter((o) => o.pnl > 0).length;
	const losses = orders.filter((o) => o.pnl < 0).length;
	const totalPnl = orders.reduce((acc, o) => acc + o.pnl, 0);
	const { lossStreak, profitStreak } = detectStreaks(orders);

	const stats = [
		`- 预警类型：${type === "loss" ? "连续亏损" : "连续盈利"}`,
		`- 近 ${orders.length} 笔：盈利 ${wins} 笔 / 亏损 ${losses} 笔`,
		`- 净已实现盈亏：${totalPnl.toFixed(2)} USDT`,
		`- 当前末端连续亏损：${lossStreak} 笔；连续盈利：${profitStreak} 笔`,
	].join("\n");

	const stream = anthropic.messages.stream({
		model: REASONING_MODEL,
		max_tokens: COACHING_MAX_TOKENS,
		thinking: { type: "adaptive" },
		system: SYSTEM_PROMPT,
		messages: [{ role: "user", content: `用户近期交易模式统计：\n${stats}` }],
	});
	const message = await stream.finalMessage();
	return { text: extractText(message.content) };
}
