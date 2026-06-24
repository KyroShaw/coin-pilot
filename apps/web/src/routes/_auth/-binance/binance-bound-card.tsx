import { Button } from "@coin-pilot/ui/components/button";
import { Loader2 } from "lucide-react";

import type { RouterOutputs } from "@/utils/trpc";
import type { useBinance } from "./use-binance";

type BoundStatus = Extract<RouterOutputs["binance"]["status"], { bound: true }>;

interface BinanceBoundCardProps {
	status: BoundStatus;
	unbind: ReturnType<typeof useBinance>["unbind"];
}

export function BinanceBoundCard({ status, unbind }: BinanceBoundCardProps) {
	return (
		<div className="space-y-4">
			<div className="rounded-md border p-3 text-sm">
				<p>
					已绑定 · API Key 末四位 <code>••••{status.apiKeyLast4}</code>
				</p>
				<p className="text-muted-foreground">
					绑定时间：{new Date(status.boundAt).toLocaleString()}
				</p>
			</div>
			<Button
				disabled={unbind.isPending}
				onClick={() => unbind.mutate()}
				variant="destructive"
			>
				{unbind.isPending ? (
					<Loader2 className="h-4 w-4 animate-spin" />
				) : (
					"解绑"
				)}
			</Button>
		</div>
	);
}
