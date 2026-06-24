import { protectedProcedure, publicProcedure, router } from "../index";
import { binanceRouter } from "./binance";
import { todoRouter } from "./todo";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => "OK"),
	privateData: protectedProcedure.query(({ ctx }) => ({
		message: "This is private",
		user: ctx.session.user,
	})),
	binance: binanceRouter,
	todo: todoRouter,
});
export type AppRouter = typeof appRouter;
