import { Button } from "@coin-pilot/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@coin-pilot/ui/components/card";
import { Input } from "@coin-pilot/ui/components/input";
import { Label } from "@coin-pilot/ui/components/label";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/binance")({
	component: BinanceBindingRoute,
});

function BinanceBindingRoute() {
	const [apiKey, setApiKey] = useState("");
	const [secretKey, setSecretKey] = useState("");

	const status = useQuery(trpc.binance.status.queryOptions());

	const bindMutation = useMutation(
		trpc.binance.bind.mutationOptions({
			onSuccess: () => {
				toast.success("Binance API Key 绑定成功");
				setApiKey("");
				setSecretKey("");
				status.refetch();
			},
			onError: (error) => toast.error(error.message),
		})
	);

	const unbindMutation = useMutation(
		trpc.binance.unbind.mutationOptions({
			onSuccess: () => {
				toast.success("已解绑");
				status.refetch();
			},
			onError: (error) => toast.error(error.message),
		})
	);

	const handleBind = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (apiKey.trim() && secretKey.trim()) {
			bindMutation.mutate({
				apiKey: apiKey.trim(),
				secretKey: secretKey.trim(),
			});
		}
	};

	let content: ReactNode;
	if (status.isLoading) {
		content = (
			<div className="flex justify-center py-4">
				<Loader2 className="h-6 w-6 animate-spin" />
			</div>
		);
	} else if (status.data?.bound) {
		content = (
			<div className="space-y-4">
				<div className="rounded-md border p-3 text-sm">
					<p>
						已绑定 · API Key 末四位 <code>••••{status.data.apiKeyLast4}</code>
					</p>
					<p className="text-muted-foreground">
						绑定时间：{new Date(status.data.boundAt).toLocaleString()}
					</p>
				</div>
				<Button
					disabled={unbindMutation.isPending}
					onClick={() => unbindMutation.mutate()}
					variant="destructive"
				>
					{unbindMutation.isPending ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						"解绑"
					)}
				</Button>
			</div>
		);
	} else {
		content = (
			<form className="space-y-4" onSubmit={handleBind}>
				<div className="space-y-2">
					<Label htmlFor="apiKey">API Key</Label>
					<Input
						autoComplete="off"
						disabled={bindMutation.isPending}
						id="apiKey"
						onChange={(e) => setApiKey(e.target.value)}
						value={apiKey}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="secretKey">Secret Key</Label>
					<Input
						autoComplete="off"
						disabled={bindMutation.isPending}
						id="secretKey"
						onChange={(e) => setSecretKey(e.target.value)}
						type="password"
						value={secretKey}
					/>
				</div>
				<Button
					className="w-full"
					disabled={
						bindMutation.isPending || !(apiKey.trim() && secretKey.trim())
					}
					type="submit"
				>
					{bindMutation.isPending ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						"校验并绑定"
					)}
				</Button>
			</form>
		);
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
