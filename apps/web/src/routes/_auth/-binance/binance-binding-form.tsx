import { Button } from "@coin-pilot/ui/components/button";
import { Input } from "@coin-pilot/ui/components/input";
import { Label } from "@coin-pilot/ui/components/label";
import { Loader2 } from "lucide-react";
import { type FormEvent, useState } from "react";

import type { useBinance } from "./use-binance";

interface BinanceBindingFormProps {
	bind: ReturnType<typeof useBinance>["bind"];
}

export function BinanceBindingForm({ bind }: BinanceBindingFormProps) {
	const [apiKey, setApiKey] = useState("");
	const [secretKey, setSecretKey] = useState("");

	const handleBind = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (apiKey.trim() && secretKey.trim()) {
			bind.mutate(
				{
					apiKey: apiKey.trim(),
					secretKey: secretKey.trim(),
				},
				{
					onSuccess: () => {
						setApiKey("");
						setSecretKey("");
					},
				}
			);
		}
	};

	return (
		<form className="space-y-4" onSubmit={handleBind}>
			<div className="space-y-2">
				<Label htmlFor="apiKey">API Key</Label>
				<Input
					autoComplete="off"
					disabled={bind.isPending}
					id="apiKey"
					onChange={(e) => setApiKey(e.target.value)}
					value={apiKey}
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="secretKey">Secret Key</Label>
				<Input
					autoComplete="off"
					disabled={bind.isPending}
					id="secretKey"
					onChange={(e) => setSecretKey(e.target.value)}
					type="password"
					value={secretKey}
				/>
			</div>
			<Button
				className="w-full"
				disabled={bind.isPending || !(apiKey.trim() && secretKey.trim())}
				type="submit"
			>
				{bind.isPending ? (
					<Loader2 className="h-4 w-4 animate-spin" />
				) : (
					"校验并绑定"
				)}
			</Button>
		</form>
	);
}
