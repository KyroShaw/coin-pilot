import { Button } from "@coin-pilot/ui/components/button";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";

interface ReviewReportProps {
	markdown: string;
	reportId: string;
}

export function ReviewReport({ markdown, reportId }: ReviewReportProps) {
	const exportReport = () => {
		const blob = new Blob([markdown], { type: "text/markdown" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `review-${reportId}.md`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="mt-6 rounded-xl border border-[#1e293b] bg-[#0b1326] p-5">
			<div className="mb-3 flex items-center justify-between">
				<h2 className="font-semibold text-[#eeefff]">复盘报告</h2>
				<div className="flex gap-2">
					<Button
						className="gap-1"
						onClick={() => {
							navigator.clipboard.writeText(markdown);
							toast.success("已复制");
						}}
						size="sm"
						variant="outline"
					>
						<Copy className="h-3.5 w-3.5" />
						复制
					</Button>
					<Button
						className="gap-1"
						onClick={exportReport}
						size="sm"
						variant="outline"
					>
						<Download className="h-3.5 w-3.5" />
						导出 .md
					</Button>
				</div>
			</div>
			<pre className="whitespace-pre-wrap font-sans text-[#c3c6d7] text-sm leading-relaxed">
				{markdown}
			</pre>
		</div>
	);
}
