const MED_VOLATILITY = 5;
const HIGH_VOLATILITY = 10;

function volatilityLabel(value: number): string {
	if (value >= HIGH_VOLATILITY) {
		return "高";
	}
	if (value >= MED_VOLATILITY) {
		return "中";
	}
	return "低";
}

function volatilityColor(value: number): string {
	if (value >= HIGH_VOLATILITY) {
		return "text-[#ffb4ab]";
	}
	if (value >= MED_VOLATILITY) {
		return "text-[#dae2fd]";
	}
	return "text-[#6ffbbe]";
}

export { HIGH_VOLATILITY, MED_VOLATILITY, volatilityColor, volatilityLabel };
