import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		CORS_ORIGIN: z.url(),
		// AES-256-GCM 主密钥：32 字节，以 64 位十六进制串存储
		ENCRYPTION_MASTER_KEY: z
			.string()
			.regex(/^[0-9a-fA-F]{64}$/, "必须是 64 位十六进制（32 字节）"),
		// Anthropic Claude API Key（AI 汇总/复盘等功能；服务端持有，绝不下发前端）
		ANTHROPIC_API_KEY: z.string().min(1),
		// 内部刷新端点 token（保护服务端定时刷新触发端点）
		INTERNAL_REFRESH_TOKEN: z.string().min(1),
		// 板块行情刷新间隔（毫秒，默认 25 分钟，须 ≤ 30 分钟）
		SECTOR_REFRESH_INTERVAL_MS: z.coerce
			.number()
			.int()
			.positive()
			.max(1_800_000)
			.default(1_500_000),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
	},
	runtimeEnv: process.env,
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
