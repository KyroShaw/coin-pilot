import { db } from "@coin-pilot/db";
import { binanceCredential } from "@coin-pilot/db/schema/binance";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../index";
import { BinanceApiError, fetchBinanceAccount } from "../lib/binance";
import { encrypt } from "../lib/crypto";

const bindInput = z.object({
	apiKey: z.string().trim().min(1, "API Key 不能为空"),
	secretKey: z.string().trim().min(1, "Secret Key 不能为空"),
});

export const binanceRouter = router({
	/** 绑定只读 API Key：连通性 + 只读权限校验 → 加密 upsert → 脱敏返回。 */
	bind: protectedProcedure.input(bindInput).mutation(async ({ ctx, input }) => {
		const userId = ctx.session.user.id;

		let account: Awaited<ReturnType<typeof fetchBinanceAccount>>;
		try {
			account = await fetchBinanceAccount(input.apiKey, input.secretKey);
		} catch (error) {
			const message =
				error instanceof BinanceApiError
					? error.message
					: "绑定校验失败，请稍后重试";
			throw new TRPCError({ code: "BAD_REQUEST", message });
		}

		// 最小只读原则：拒绝具备交易/提现权限的 Key
		if (account.canTrade || account.canWithdraw) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "请使用只读 API Key（请在 Binance 关闭交易与提现权限后重试）",
			});
		}

		const apiKeyEnc = encrypt(input.apiKey);
		const secretKeyEnc = encrypt(input.secretKey);
		const apiKeyLast4 = input.apiKey.slice(-4);

		const [row] = await db
			.insert(binanceCredential)
			.values({
				userId,
				apiKeyCipher: apiKeyEnc.ciphertext,
				apiKeyIv: apiKeyEnc.iv,
				apiKeyAuthTag: apiKeyEnc.authTag,
				secretKeyCipher: secretKeyEnc.ciphertext,
				secretKeyIv: secretKeyEnc.iv,
				secretKeyAuthTag: secretKeyEnc.authTag,
				apiKeyLast4,
			})
			.onConflictDoUpdate({
				target: binanceCredential.userId,
				set: {
					apiKeyCipher: apiKeyEnc.ciphertext,
					apiKeyIv: apiKeyEnc.iv,
					apiKeyAuthTag: apiKeyEnc.authTag,
					secretKeyCipher: secretKeyEnc.ciphertext,
					secretKeyIv: secretKeyEnc.iv,
					secretKeyAuthTag: secretKeyEnc.authTag,
					apiKeyLast4,
					updatedAt: new Date(),
				},
			})
			.returning({
				boundAt: binanceCredential.updatedAt,
				apiKeyLast4: binanceCredential.apiKeyLast4,
			});

		if (!row) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "绑定写入失败，请稍后重试",
			});
		}

		return {
			bound: true as const,
			apiKeyLast4: row.apiKeyLast4,
			boundAt: row.boundAt,
		};
	}),

	/** 查询当前用户绑定状态（仅脱敏字段）。 */
	status: protectedProcedure.query(async ({ ctx }) => {
		const [row] = await db
			.select({
				apiKeyLast4: binanceCredential.apiKeyLast4,
				boundAt: binanceCredential.updatedAt,
			})
			.from(binanceCredential)
			.where(eq(binanceCredential.userId, ctx.session.user.id))
			.limit(1);

		if (!row) {
			return { bound: false as const };
		}
		return {
			bound: true as const,
			apiKeyLast4: row.apiKeyLast4,
			boundAt: row.boundAt,
		};
	}),

	/** 解绑：删除当前用户凭据。 */
	unbind: protectedProcedure.mutation(async ({ ctx }) => {
		await db
			.delete(binanceCredential)
			.where(eq(binanceCredential.userId, ctx.session.user.id));
		return { unbound: true as const };
	}),
});
