import { Button } from "@coin-pilot/ui/components/button";
import { Loader2, Sparkles } from "lucide-react";

import { MAX_REVIEW } from "./use-orders";

interface ReviewSelectionBarProps {
	isPending: boolean;
	onGenerate: () => void;
	selectedCount: number;
}

export function ReviewSelectionBar({
	isPending,
	onGenerate,
	selectedCount,
}: ReviewSelectionBarProps) {
	return (
		<div className="mb-4 flex items-center justify-between rounded-lg border border-[#1e293b] bg-[#0b1326] px-4 py-3">
			<span className="text-[#c3c6d7] text-sm">
				已选 {selectedCount} / {MAX_REVIEW} 笔
			</span>
			<Button className="gap-2" disabled={isPending} onClick={onGenerate}>
				{isPending ? (
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
	);
}
