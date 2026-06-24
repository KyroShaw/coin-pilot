import { createContext } from "@coin-pilot/api/context";
import { appRouter } from "@coin-pilot/api/routers/index";
import { auth } from "@coin-pilot/auth";
import { env } from "@coin-pilot/env/server";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import {
	startAlphaScheduler,
	startNewsScheduler,
	startSectorScheduler,
	triggerAlphaScrape,
	triggerNewsRefresh,
	triggerSectorRefresh,
} from "./scheduler";

const app = new Hono();

app.use(logger());
app.use(
	"/*",
	cors({
		origin: env.CORS_ORIGIN,
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	})
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use(
	"/trpc/*",
	trpcServer({
		router: appRouter,
		createContext: (_opts, context) => createContext({ context }),
	})
);

app.get("/", (c) => c.text("OK"));

// 内部刷新端点：供外部 cron 兜底触发刷新，需校验内部 token
app.post("/internal/sector/refresh", async (c) => {
	if (c.req.header("x-internal-token") !== env.INTERNAL_REFRESH_TOKEN) {
		return c.json({ error: "unauthorized" }, 401);
	}
	try {
		const result = await triggerSectorRefresh();
		return c.json(result);
	} catch (error) {
		return c.json(
			{ error: error instanceof Error ? error.message : "refresh failed" },
			500
		);
	}
});

app.post("/internal/news/refresh", async (c) => {
	if (c.req.header("x-internal-token") !== env.INTERNAL_REFRESH_TOKEN) {
		return c.json({ error: "unauthorized" }, 401);
	}
	try {
		const result = await triggerNewsRefresh();
		return c.json(result);
	} catch (error) {
		return c.json(
			{ error: error instanceof Error ? error.message : "refresh failed" },
			500
		);
	}
});

app.post("/internal/alpha/refresh", async (c) => {
	if (c.req.header("x-internal-token") !== env.INTERNAL_REFRESH_TOKEN) {
		return c.json({ error: "unauthorized" }, 401);
	}
	try {
		const result = await triggerAlphaScrape();
		return c.json(result);
	} catch (error) {
		return c.json(
			{ error: error instanceof Error ? error.message : "scrape failed" },
			500
		);
	}
});

import { serve } from "@hono/node-server";

serve(
	{
		fetch: app.fetch,
		port: 3000,
	},
	(info) => {
		console.log(`Server is running on http://localhost:${info.port}`);
		startSectorScheduler();
		startNewsScheduler();
		startAlphaScheduler();
	}
);
