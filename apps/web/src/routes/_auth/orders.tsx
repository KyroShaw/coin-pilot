import { Button } from "@coin-pilot/ui/components/button";
import { Checkbox } from "@coin-pilot/ui/components/checkbox";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/orders")({
	component: OrdersRoute,
});

const MAX_REVIEW = 50;

interface RationaleDraft {
	entry: string;
	exit: string;
}

function pnlColor(value: number): string {
	if (value > 0) {
		return "text-[#6ffbbe]";
	}
	if (value < 0) {
		return "text-[#ffb4ab]";
	}
	return "text-[#8d90a0]";
}

function formatPnl(value: number): string {
	const sign = value > 0 ? "+" : "";
	return `${sign}${value.toFixed(2)}`;
}

function OrdersRoute() {
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [draft, setDraft] = useState<RationaleDraft>({ entry: "", exit: "" });
	const [report, setReport] = useState<{
		markdown: string;
		reportId: string;
	} | null>(null);

	const orders = useInfiniteQuery(
		trpc.order.list.infiniteQueryOptions(
			{},
			{ getNextPageParam: (lastPage) => lastPage.nextCursor }
		)
	);

	const sync = useMutation(
		trpc.order.sync.mutationOptions({
			onSuccess: (res) => {
				toast.success(`已同步 ${res.syncedCount} 笔（共 ${res.total} 条记录）`);
				orders.refetch();
			},
			onError: (error) => toast.error(error.message),
		})
	);

	const saveRationale = useMutation(
		trpc.order.saveRationale.mutationOptions({
			onSuccess: () => {
				toast.success("已保存交易逻辑");
				setExpandedId(null);
				orders.refetch();
			},
			onError: (error) => toast.error(error.message),
		})
	);

	const generate = useMutation(
		trpc.review.generate.mutationOptions({
			onSuccess: (res) => setReport(res),
			onError: (error) => toast.error(error.message),
		})
	);

	const items = orders.data?.pages.flatMap((page) => page.items) ?? [];
	const hasItems = items.length > 0;

	const toggleSelect = (id: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else if (next.size < MAX_REVIEW) {
				next.add(id);
			}
			return next;
		});
	};

	const openRationale = (id: string) => {
		setExpandedId(expandedId === id ? null : id);
		setDraft({ entry: "", exit: "" });
	};

	const exportReport = () => {
		if (!report) {
			return;
		}
		const blob = new Blob([report.markdown], { type: "text/markdown" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `review-${report.reportId}.md`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="min-h-full bg-[#060e20] text-[#eeefff]">
			<div className="mx-auto w-full max-w-4xl px-6 py-8">
				<header className="mb-4 flex items-center justify-between">
					<div>
						<h1 className="font-semibold text-2xl tracking-tight">订单复盘</h1>
						<p className="mt-1 text-[#8d90a0] text-sm">
							近 90 天合约已平仓订单 · AI 复盘诊断
						</p>
					</div>
					<Button
						className="gap-2"
						disabled={sync.isPending}
						onClick={() => sync.mutate()}
						variant="outline"
					>
						{sync.isPending ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<RefreshCw className="h-4 w-4" />
						)}
						同步订单
					</Button>
				</header>

				{selected.size > 0 ? (
					<div className="mb-4 flex items-center justify-between rounded-lg border border-[#1e293b] bg-[#0b1326] px-4 py-3">
						<span className="text-[#c3c6d7] text-sm">
							已选 {selected.size} / {MAX_REVIEW} 笔
						</span>
						<Button
							className="gap-2"
							disabled={generate.isPending}
							onClick={() => generate.mutate({ orderIds: [...selected] })}
						>
							{generate.isPending ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									生成中…（最长约 30 秒）
								</>
							) : (
								<>
									<Sparkles className="h-4 w-4" />
									生成复盘报告
								</>
							)}
						</Button>
					</div>
				) : null}

				{orders.isPending ? (
					<div className="flex justify-center py-16">
						<Loader2 className="h-6 w-6 animate-spin text-[#b4c5ff]" />
					</div>
				) : null}

				{orders.isPending || hasItems ? null : (
					<p className="py-16 text-center text-[#8d90a0] text-sm">
						点击「同步订单」从 Binance 拉取近 90 天已平仓订单。
					</p>
				)}

				{hasItems ? (
					<div className="overflow-hidden rounded-xl border border-[#1e293b]">
						{items.map((o) => (
							<div
								className="border-[#131b2e] border-b bg-[#0b1326]"
								key={o.id}
							>
								<div className="grid grid-cols-[auto_1.2fr_0.8fr_1fr_1.2fr_auto] items-center gap-2 px-4 py-3 text-sm">
									<Checkbox
										checked={selected.has(o.id)}
										onCheckedChange={() => toggleSelect(o.id)}
									/>
									<span className="flex items-center gap-2 font-medium text-[#eeefff]">
										{o.symbol}
										{o.hasRationale ? (
											<span className="rounded-full bg-[#131b2e] px-2 py-0.5 text-[#b4c5ff] text-[10px]">
												已填逻辑
											</span>
										) : null}
									</span>
									<span className="text-[#8d90a0] text-xs">{o.side}</span>
									<span className={`tabular-nums ${pnlColor(o.pnl)}`}>
										{formatPnl(o.pnl)} USDT
									</span>
									<span className="text-[#8d90a0] text-xs">
										{new Date(o.closedAt).toLocaleString()}
									</span>
									<Button
										onClick={() => openRationale(o.id)}
										size="sm"
										variant="ghost"
									>
										逻辑
									</Button>
								</div>

								{expandedId === o.id ? (
									<div className="space-y-2 bg-[#060e20] px-4 py-3">
										<div>
											<p className="mb-1 text-[#8d90a0] text-xs">开仓逻辑</p>
											<textarea
												className="w-full rounded-md border border-[#283044] bg-[#0b1326] p-2 text-[#eeefff] text-sm"
												maxLength={2000}
												onChange={(e) =>
													setDraft((d) => ({ ...d, entry: e.target.value }))
												}
												rows={2}
												value={draft.entry}
											/>
										</div>
										<div>
											<p className="mb-1 text-[#8d90a0] text-xs">平仓逻辑</p>
											<textarea
												className="w-full rounded-md border border-[#283044] bg-[#0b1326] p-2 text-[#eeefff] text-sm"
												maxLength={2000}
												onChange={(e) =>
													setDraft((d) => ({ ...d, exit: e.target.value }))
												}
												rows={2}
												value={draft.exit}
											/>
										</div>
										<Button
											disabled={saveRationale.isPending}
											onClick={() =>
												saveRationale.mutate({
													orderId: o.id,
													entryRationale: draft.entry,
													exitRationale: draft.exit,
												})
											}
											size="sm"
										>
											保存
										</Button>
									</div>
								) : null}
							</div>
						))}
					</div>
				) : null}

				{orders.hasNextPage ? (
					<div className="mt-4 flex justify-center">
						<Button
							disabled={orders.isFetchingNextPage}
							onClick={() => orders.fetchNextPage()}
							variant="outline"
						>
							{orders.isFetchingNextPage ? "加载中…" : "加载更多"}
						</Button>
					</div>
				) : null}

				{report ? (
					<div className="mt-6 rounded-xl border border-[#1e293b] bg-[#0b1326] p-5">
						<div className="mb-3 flex items-center justify-between">
							<h2 className="font-semibold text-[#eeefff]">复盘报告</h2>
							<div className="flex gap-2">
								<Button
									className="gap-1"
									onClick={() => {
										navigator.clipboard.writeText(report.markdown);
										toast.success("已复制");
									}}
									size="sm"
									variant="outline"
								>
									<Copy className="h-3.5 w-3.5" />
									复制
								</Button>
								<Button
									className="gap-1"
									onClick={exportReport}
									size="sm"
									variant="outline"
								>
									<Download className="h-3.5 w-3.5" />
									导出 .md
								</Button>
							</div>
						</div>
						<pre className="whitespace-pre-wrap font-sans text-[#c3c6d7] text-sm leading-relaxed">
							{report.markdown}
						</pre>
					</div>
				) : null}
			</div>
		</div>
	);
}
