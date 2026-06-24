import type { Filter } from "./use-alpha";

interface TabDef {
	key: Filter;
	label: string;
}

interface AlphaTabsProps {
	filter: Filter;
	onChange: (filter: Filter) => void;
}

const TABS: TabDef[] = [
	{ key: "all", label: "全部" },
	{ key: "consolidating", label: "底部盘整" },
	{ key: "watched", label: "定投关注" },
];

export function AlphaTabs({ filter, onChange }: AlphaTabsProps) {
	return (
		<div className="mb-4 flex gap-1 border-[#1e293b] border-b">
			{TABS.map((t) => (
				<button
					className={
						t.key === filter
							? "-mb-px border-[#2563eb] border-b-2 px-3 py-2 font-medium text-[#dae2fd] text-sm"
							: "-mb-px border-transparent border-b-2 px-3 py-2 font-medium text-[#8d90a0] text-sm hover:text-[#c3c6d7]"
					}
					key={t.key}
					onClick={() => onChange(t.key)}
					type="button"
				>
					{t.label}
				</button>
			))}
		</div>
	);
}
