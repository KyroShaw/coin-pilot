import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { env } from "@coin-pilot/env/server";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM 推荐 96-bit IV

/**
 * 加密后的载荷。三段均为十六进制字符串，便于直接落库（text 列）。
 */
export interface EncryptedPayload {
	authTag: string;
	ciphertext: string;
	iv: string;
}

function getKey(): Buffer {
	// env 已校验为 64 位十六进制（32 字节），此处直接解码
	return Buffer.from(env.ENCRYPTION_MASTER_KEY, "hex");
}

/**
 * 使用 AES-256-GCM 加密明文，返回 iv + authTag + ciphertext（均十六进制）。
 * 每次加密生成随机 iv，保证相同明文密文不同。
 */
export function encrypt(plaintext: string): EncryptedPayload {
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, getKey(), iv);
	const ciphertext = Buffer.concat([
		cipher.update(plaintext, "utf8"),
		cipher.final(),
	]);
	const authTag = cipher.getAuthTag();

	return {
		iv: iv.toString("hex"),
		authTag: authTag.toString("hex"),
		ciphertext: ciphertext.toString("hex"),
	};
}

/**
 * 解密 AES-256-GCM 载荷。authTag 不匹配（密文被篡改或密钥错误）时抛出错误。
 */
export function decrypt(payload: EncryptedPayload): string {
	const decipher = createDecipheriv(
		ALGORITHM,
		getKey(),
		Buffer.from(payload.iv, "hex")
	);
	decipher.setAuthTag(Buffer.from(payload.authTag, "hex"));
	const plaintext = Buffer.concat([
		decipher.update(Buffer.from(payload.ciphertext, "hex")),
		decipher.final(),
	]);

	return plaintext.toString("utf8");
}
