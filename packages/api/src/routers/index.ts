import { publicProcedure, router } from "../index";
import { alphaRouter } from "./alpha";
import { binanceRouter } from "./binance";
import { newsRouter } from "./news";
import { orderRouter } from "./order";
import { reviewRouter } from "./review";
import { sectorRouter } from "./sector";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => "OK"),
	alpha: alphaRouter,
	binance: binanceRouter,
	news: newsRouter,
	order: orderRouter,
	review: reviewRouter,
	sector: sectorRouter,
});
export type AppRouter = typeof appRouter;
