import { protectedProcedure, publicProcedure, router } from "../index";
import { binanceRouter } from "./binance";
import { newsRouter } from "./news";
import { sectorRouter } from "./sector";
import { todoRouter } from "./todo";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => "OK"),
	privateData: protectedProcedure.query(({ ctx }) => ({
		message: "This is private",
		user: ctx.session.user,
	})),
	binance: binanceRouter,
	news: newsRouter,
	sector: sectorRouter,
	todo: todoRouter,
});
export type AppRouter = typeof appRouter;
