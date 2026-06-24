import { publicProcedure, router } from "../index";
import { alphaRouter } from "./alpha";
import { binanceRouter } from "./binance";
import { alertRouter, equityRouter, settingsRouter } from "./equity";
import { newsRouter } from "./news";
import { orderRouter } from "./order";
import { reviewRouter } from "./review";
import { sectorRouter } from "./sector";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => "OK"),
	alert: alertRouter,
	alpha: alphaRouter,
	binance: binanceRouter,
	equity: equityRouter,
	news: newsRouter,
	order: orderRouter,
	review: reviewRouter,
	sector: sectorRouter,
	settings: settingsRouter,
});
export type AppRouter = typeof appRouter;
