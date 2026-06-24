import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export const MAX_REVIEW = 50;

interface Report {
	markdown: string;
	reportId: string;
}

export function useOrders() {
	const [report, setReport] = useState<Report | null>(null);

	const orders = useInfiniteQuery(
		trpc.order.list.infiniteQueryOptions(
			{},
			{ getNextPageParam: (lastPage) => lastPage.nextCursor }
		)
	);

	const sync = useMutation(
		trpc.order.sync.mutationOptions({
			onSuccess: (res) => {
				toast.success(`已同步 ${res.syncedCount} 笔（共 ${res.total} 条记录）`);
				orders.refetch();
			},
			onError: (error) => toast.error(error.message),
		})
	);

	const saveRationale = useMutation(
		trpc.order.saveRationale.mutationOptions({
			onSuccess: () => {
				toast.success("已保存交易逻辑");
				orders.refetch();
			},
			onError: (error) => toast.error(error.message),
		})
	);

	const generate = useMutation(
		trpc.review.generate.mutationOptions({
			onSuccess: (res) => setReport(res),
			onError: (error) => toast.error(error.message),
		})
	);

	const items = orders.data?.pages.flatMap((page) => page.items) ?? [];

	return {
		generate,
		items,
		orders,
		report,
		saveRationale,
		sync,
	};
}
