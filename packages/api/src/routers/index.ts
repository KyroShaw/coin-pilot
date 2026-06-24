import { publicProcedure, router } from "../index";
import { binanceRouter } from "./binance";
import { newsRouter } from "./news";
import { sectorRouter } from "./sector";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => "OK"),
	binance: binanceRouter,
	news: newsRouter,
	sector: sectorRouter,
});
export type AppRouter = typeof appRouter;
