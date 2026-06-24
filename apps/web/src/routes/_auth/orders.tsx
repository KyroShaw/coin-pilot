import { Button } from "@coin-pilot/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";

import { OrderRow } from "./-orders/order-row";
import { ReviewReport } from "./-orders/review-report";
import { ReviewSelectionBar } from "./-orders/review-selection-bar";
import { MAX_REVIEW, useOrders } from "./-orders/use-orders";

export const Route = createFileRoute("/_auth/orders")({
	component: OrdersRoute,
});

interface RationaleDraft {
	entry: string;
	exit: string;
}

function OrdersRoute() {
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [draft, setDraft] = useState<RationaleDraft>({ entry: "", exit: "" });

	const { generate, items, orders, report, saveRationale, sync } = useOrders();

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

	const saveRationaleForOrder = (id: string) => {
		saveRationale.mutate(
			{
				orderId: id,
				entryRationale: draft.entry,
				exitRationale: draft.exit,
			},
			{ onSuccess: () => setExpandedId(null) }
		);
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
					<ReviewSelectionBar
						isPending={generate.isPending}
						onGenerate={() => generate.mutate({ orderIds: [...selected] })}
						selectedCount={selected.size}
					/>
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
							<OrderRow
								draft={draft}
								isExpanded={expandedId === o.id}
								isSaving={saveRationale.isPending}
								isSelected={selected.has(o.id)}
								key={o.id}
								onDraftChange={setDraft}
								onOpenRationale={openRationale}
								onSaveRationale={saveRationaleForOrder}
								onToggleSelect={toggleSelect}
								order={o}
							/>
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
					<ReviewReport markdown={report.markdown} reportId={report.reportId} />
				) : null}
			</div>
		</div>
	);
}
