import { db } from "@coin-pilot/db";
import {
	closedOrder,
	orderRationale,
	reviewReport,
} from "@coin-pilot/db/schema/order";
import { and, eq, inArray } from "drizzle-orm";

import { anthropic, REASONING_MODEL } from "../lib/claude";

const REVIEW_MAX_TOKENS = 8000;

const SYSTEM_PROMPT = [
	"你是专业的加密货币交易复盘顾问。基于用户的已平仓订单客观数据与其填写的开/平仓逻辑，",
	"生成一份中文 Markdown 复盘诊断报告。报告必须至少覆盖三个维度，分别用二级标题：",
	"## 执行质量、## 风险控制、## 改进建议。",
	"每个维度结合具体订单数据与用户逻辑给出有依据的分析，指出优点与问题。",
	"只输出 Markdown 报告正文，不要寒暄或前后缀。",
].join("");

interface OrderForPrompt {
	closedAt: Date;
	entryRationale: string;
	exitRationale: string;
	pnl: number;
	side: string;
	symbol: string;
}

function buildUserPrompt(orders: OrderForPrompt[]): string {
	const lines = orders.map((o, i) => {
		const pnlText = o.pnl >= 0 ? `+${o.pnl}` : `${o.pnl}`;
		return [
			`### 订单 ${i + 1}`,
			`- 交易对：${o.symbol}`,
			`- 方向：${o.side}`,
			`- 已实现盈亏：${pnlText} USDT`,
			`- 平仓时间：${o.closedAt.toISOString()}`,
			`- 开仓逻辑：${o.entryRationale || "（未填写）"}`,
			`- 平仓逻辑：${o.exitRationale || "（未填写）"}`,
		].join("\n");
	});
	return `以下是需要复盘的订单：\n\n${lines.join("\n\n")}`;
}

function extractText(content: Array<{ type: string; text?: string }>): string {
	return content
		.filter((block) => block.type === "text")
		.map((block) => block.text ?? "")
		.join("")
		.trim();
}

/**
 * 聚合订单客观数据 + 用户逻辑 → opus-4-8（adaptive thinking + effort high，
 * 流式内部生成以规避长推理超时）→ 落库 review_report，返回报告。
 * 仅复盘归属当前用户的订单（用户隔离）。
 */
export async function generateReview(
	userId: string,
	orderIds: string[]
): Promise<{ reportId: string; markdown: string }> {
	const orders = await db
		.select()
		.from(closedOrder)
		.where(
			and(eq(closedOrder.userId, userId), inArray(closedOrder.id, orderIds))
		);
	if (orders.length === 0) {
		throw new Error("未找到可复盘的订单");
	}

	const rationales = await db
		.select()
		.from(orderRationale)
		.where(
			and(
				eq(orderRationale.userId, userId),
				inArray(
					orderRationale.orderId,
					orders.map((o) => o.id)
				)
			)
		);
	const rationaleByOrder = new Map(rationales.map((r) => [r.orderId, r]));

	const prompt = buildUserPrompt(
		orders.map((o) => ({
			symbol: o.symbol,
			side: o.side,
			pnl: o.pnl,
			closedAt: o.closedAt,
			entryRationale: rationaleByOrder.get(o.id)?.entryRationale ?? "",
			exitRationale: rationaleByOrder.get(o.id)?.exitRationale ?? "",
		}))
	);

	const stream = anthropic.messages.stream({
		model: REASONING_MODEL,
		max_tokens: REVIEW_MAX_TOKENS,
		thinking: { type: "adaptive" },
		output_config: { effort: "high" },
		system: SYSTEM_PROMPT,
		messages: [{ role: "user", content: prompt }],
	});
	const message = await stream.finalMessage();
	const markdown = extractText(message.content);

	const [report] = await db
		.insert(reviewReport)
		.values({
			userId,
			orderIds: orders.map((o) => o.id),
			markdown,
			model: REASONING_MODEL,
		})
		.returning({ id: reviewReport.id });

	if (!report) {
		throw new Error("复盘报告落库失败");
	}

	return { reportId: report.id, markdown };
}
