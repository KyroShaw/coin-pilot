const POSITIVE_COLOR = "text-[#6ffbbe]";
const NEGATIVE_COLOR = "text-[#ffb4ab]";
const NEUTRAL_COLOR = "text-[#8d90a0]";

// 涨跌语义色：正绿、负红、零中性。供各 _auth 页面统一复用。
export function trendColor(value: number): string {
	if (value > 0) {
		return POSITIVE_COLOR;
	}
	if (value < 0) {
		return NEGATIVE_COLOR;
	}
	return NEUTRAL_COLOR;
}

export function formatSignedNumber(value: number): string {
	const sign = value > 0 ? "+" : "";
	return `${sign}${value.toFixed(2)}`;
}

export function formatSignedPercent(value: number): string {
	return `${formatSignedNumber(value)}%`;
}
