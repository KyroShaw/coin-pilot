import { Link } from "@tanstack/react-router";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
	const links = [
		{ to: "/sectors", label: "板块轮动" },
		{ to: "/alpha", label: "Alpha 候选" },
		{ to: "/orders", label: "订单复盘" },
		{ to: "/news", label: "宏观简报" },
		{ to: "/binance", label: "API 绑定" },
	] as const;

	return (
		<div>
			<div className="flex flex-row items-center justify-between px-3 py-2">
				<nav className="flex items-center gap-5 text-sm">
					<Link className="font-semibold tracking-tight" to="/sectors">
						coin-pilot
					</Link>
					{links.map(({ to, label }) => (
						<Link
							activeProps={{ className: "text-foreground" }}
							className="text-muted-foreground hover:text-foreground"
							key={to}
							to={to}
						>
							{label}
						</Link>
					))}
				</nav>
				<div className="flex items-center gap-2">
					<ModeToggle />
					<UserMenu />
				</div>
			</div>
			<hr />
		</div>
	);
}
