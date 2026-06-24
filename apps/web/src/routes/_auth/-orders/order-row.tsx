import { Button } from "@coin-pilot/ui/components/button";
import { Checkbox } from "@coin-pilot/ui/components/checkbox";

import type { RouterOutputs } from "@/utils/trpc";
import { formatSignedNumber, trendColor } from "../-shared/format";

type Order = RouterOutputs["order"]["list"]["items"][number];

interface RationaleDraft {
	entry: string;
	exit: string;
}

interface OrderRowProps {
	draft: RationaleDraft;
	isExpanded: boolean;
	isSaving: boolean;
	isSelected: boolean;
	onDraftChange: (draft: RationaleDraft) => void;
	onOpenRationale: (id: string) => void;
	onSaveRationale: (id: string) => void;
	onToggleSelect: (id: string) => void;
	order: Order;
}

export function OrderRow({
	draft,
	isExpanded,
	isSaving,
	isSelected,
	onDraftChange,
	onOpenRationale,
	onSaveRationale,
	onToggleSelect,
	order,
}: OrderRowProps) {
	return (
		<div className="border-[#131b2e] border-b bg-[#0b1326]">
			<div className="grid grid-cols-[auto_1.2fr_0.8fr_1fr_1.2fr_auto] items-center gap-2 px-4 py-3 text-sm">
				<Checkbox
					checked={isSelected}
					onCheckedChange={() => onToggleSelect(order.id)}
				/>
				<span className="flex items-center gap-2 font-medium text-[#eeefff]">
					{order.symbol}
					{order.hasRationale ? (
						<span className="rounded-full bg-[#131b2e] px-2 py-0.5 text-[#b4c5ff] text-[10px]">
							已填逻辑
						</span>
					) : null}
				</span>
				<span className="text-[#8d90a0] text-xs">{order.side}</span>
				<span className={`tabular-nums ${trendColor(order.pnl)}`}>
					{formatSignedNumber(order.pnl)} USDT
				</span>
				<span className="text-[#8d90a0] text-xs">
					{new Date(order.closedAt).toLocaleString()}
				</span>
				<Button
					onClick={() => onOpenRationale(order.id)}
					size="sm"
					variant="ghost"
				>
					逻辑
				</Button>
			</div>

			{isExpanded ? (
				<div className="space-y-2 bg-[#060e20] px-4 py-3">
					<div>
						<p className="mb-1 text-[#8d90a0] text-xs">开仓逻辑</p>
						<textarea
							className="w-full rounded-md border border-[#283044] bg-[#0b1326] p-2 text-[#eeefff] text-sm"
							maxLength={2000}
							onChange={(e) =>
								onDraftChange({ ...draft, entry: e.target.value })
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
								onDraftChange({ ...draft, exit: e.target.value })
							}
							rows={2}
							value={draft.exit}
						/>
					</div>
					<Button
						disabled={isSaving}
						onClick={() => onSaveRationale(order.id)}
						size="sm"
					>
						保存
					</Button>
				</div>
			) : null}
		</div>
	);
}
