import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * 用户绑定的 Binance 只读 API 凭据。
 * apiKey / secretKey 均以 AES-256-GCM 加密存储（iv + authTag + ciphertext 三段），
 * 任何响应/日志都不得出现明文。一个用户至多一条凭据（userId 唯一）。
 */
export const binanceCredential = pgTable("binance_credential", {
	id: uuid("id").primaryKey().defaultRandom(),
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => user.id, { onDelete: "cascade" }),
	apiKeyCipher: text("api_key_cipher").notNull(),
	apiKeyIv: text("api_key_iv").notNull(),
	apiKeyAuthTag: text("api_key_auth_tag").notNull(),
	secretKeyCipher: text("secret_key_cipher").notNull(),
	secretKeyIv: text("secret_key_iv").notNull(),
	secretKeyAuthTag: text("secret_key_auth_tag").notNull(),
	apiKeyLast4: text("api_key_last4").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});
