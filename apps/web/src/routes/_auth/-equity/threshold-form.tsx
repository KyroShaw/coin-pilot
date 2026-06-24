import { Button } from "@coin-pilot/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@coin-pilot/ui/components/card";
import { Input } from "@coin-pilot/ui/components/input";
import { Label } from "@coin-pilot/ui/components/label";
import { useEffect, useState } from "react";

const MIN_THRESHOLD = 2;
const MAX_THRESHOLD = 10;

interface ThresholdValues {
	lossThreshold: number;
	profitThreshold: number;
}

interface ThresholdFormProps {
	isPending: boolean;
	onSave: (values: ThresholdValues) => void;
	thresholds?: ThresholdValues;
}

export function ThresholdForm({
	isPending,
	onSave,
	thresholds,
}: ThresholdFormProps) {
	const [lossInput, setLossInput] = useState(3);
	const [profitInput, setProfitInput] = useState(5);

	useEffect(() => {
		if (thresholds) {
			setLossInput(thresholds.lossThreshold);
			setProfitInput(thresholds.profitThreshold);
		}
	}, [thresholds]);

	return (
		<Card className="border-[#1e293b] bg-[#0b1326]">
			<CardHeader>
				<CardTitle className="text-[#eeefff] text-base">预警阈值</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="flex flex-wrap items-end gap-4">
					<div className="space-y-1">
						<Label className="text-[#8d90a0] text-xs" htmlFor="loss">
							连续亏损阈值
						</Label>
						<Input
							className="w-24"
							id="loss"
							max={MAX_THRESHOLD}
							min={MIN_THRESHOLD}
							onChange={(e) => setLossInput(Number(e.target.value))}
							step={1}
							type="number"
							value={lossInput}
						/>
					</div>
					<div className="space-y-1">
						<Label className="text-[#8d90a0] text-xs" htmlFor="profit">
							连续盈利阈值
						</Label>
						<Input
							className="w-24"
							id="profit"
							max={MAX_THRESHOLD}
							min={MIN_THRESHOLD}
							onChange={(e) => setProfitInput(Number(e.target.value))}
							step={1}
							type="number"
							value={profitInput}
						/>
					</div>
					<Button
						disabled={isPending}
						onClick={() =>
							onSave({
								lossThreshold: lossInput,
								profitThreshold: profitInput,
							})
						}
					>
						保存
					</Button>
				</div>
				<p className="mt-2 text-[#8d90a0] text-xs">阈值范围 2–10 笔。</p>
			</CardContent>
		</Card>
	);
}
