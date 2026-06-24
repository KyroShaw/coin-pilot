import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export function useBinance() {
	const status = useQuery(trpc.binance.status.queryOptions());

	const bind = useMutation(
		trpc.binance.bind.mutationOptions({
			onSuccess: () => {
				toast.success("Binance API Key 绑定成功");
				status.refetch();
			},
			onError: (error) => toast.error(error.message),
		})
	);

	const unbind = useMutation(
		trpc.binance.unbind.mutationOptions({
			onSuccess: () => {
				toast.success("已解绑");
				status.refetch();
			},
			onError: (error) => toast.error(error.message),
		})
	);

	return { bind, status, unbind };
}
