import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@coin-pilot/ui/components/card";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { BinanceBindingForm } from "./-binance/binance-binding-form";
import { BinanceBoundCard } from "./-binance/binance-bound-card";
import { useBinance } from "./-binance/use-binance";

export const Route = createFileRoute("/_auth/binance")({
	component: BinanceBindingRoute,
});

function BinanceBindingRoute() {
	const { bind, status, unbind } = useBinance();

	let content: ReactNode;
	if (status.isLoading) {
		content = (
			<div className="flex justify-center py-4">
				<Loader2 className="h-6 w-6 animate-spin" />
			</div>
		);
	} else if (status.data?.bound) {
		content = <BinanceBoundCard status={status.data} unbind={unbind} />;
	} else {
		content = <BinanceBindingForm bind={bind} />;
	}

	return (
		<div className="mx-auto w-full max-w-md py-10">
			<Card>
				<CardHeader>
					<CardTitle>绑定 Binance API Key</CardTitle>
					<CardDescription>
						仅支持<strong>只读</strong>权限的 API
						Key（请关闭交易与提现权限）。Key 与 Secret
						加密存储，绝不在任何响应或日志中明文出现。
					</CardDescription>
				</CardHeader>
				<CardContent>{content}</CardContent>
			</Card>
		</div>
	);
}
