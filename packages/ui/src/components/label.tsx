import { cn } from "@coin-pilot/ui/lib/utils";
import type * as React from "react";

function Label({ className, ...props }: React.ComponentProps<"label">) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: shadcn Label 原语，由使用方通过 htmlFor 关联控件
		<label
			className={cn(
				"flex select-none items-center gap-2 text-xs leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
				className
			)}
			data-slot="label"
			{...props}
		/>
	);
}

export { Label };
