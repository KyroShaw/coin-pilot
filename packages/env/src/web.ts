import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_SERVER_URL: z.url(),
	},
	// biome-ignore lint/suspicious/noExplicitAny: import.meta.env 在此包无 Vite 客户端类型，运行时由 Vite 注入
	runtimeEnv: (import.meta as any).env,
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
