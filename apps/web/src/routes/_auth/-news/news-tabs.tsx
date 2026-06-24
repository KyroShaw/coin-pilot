import type { TagFilter } from "./use-news";

interface TabDef {
	key: TagFilter;
	label: string;
}

const TABS: TabDef[] = [
	{ key: "all", label: "全部" },
	{ key: "macro", label: "宏观" },
	{ key: "regulation", label: "监管" },
	{ key: "market", label: "市场" },
];

function tabClass(active: boolean): string {
	if (active) {
		return "border-[#2563eb] bg-[#0b1326] text-[#dae2fd]";
	}
	return "border-transparent text-[#8d90a0] hover:text-[#c3c6d7]";
}

interface NewsTabsProps {
	onChange: (tag: TagFilter) => void;
	tag: TagFilter;
}

export function NewsTabs({ onChange, tag }: NewsTabsProps) {
	return (
		<div className="mb-5 flex gap-1 border-[#1e293b] border-b">
			{TABS.map((t) => (
				<button
					className={`-mb-px border-b-2 px-3 py-2 font-medium text-sm transition-colors ${tabClass(t.key === tag)}`}
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
