import type { RouterOutputs } from "@/utils/trpc";

export interface Leader {
	changePercent24h: number;
	name: string;
	price: number;
	symbol: string;
}

export type RankedSector =
	RouterOutputs["sector"]["getAll"]["sectors"][number] & {
		avg: number;
	};

export const HIGH_HEAT = 70;
export const WARM_HEAT = 40;

export function avgChange(leaders: Leader[]): number {
	if (leaders.length === 0) {
		return 0;
	}
	const sum = leaders.reduce((acc, l) => acc + l.changePercent24h, 0);
	return sum / leaders.length;
}

export function tileClass(value: number): string {
	if (value > 0) {
		return "border-[#005236] bg-[#00311f]";
	}
	if (value < 0) {
		return "border-[#690005] bg-[#410004]";
	}
	return "border-[#283044] bg-[#131b2e]";
}

export function heatLabel(score: number): string {
	if (score >= HIGH_HEAT) {
		return "High Heat";
	}
	if (score >= WARM_HEAT) {
		return "Warm";
	}
	return "Cool";
}
