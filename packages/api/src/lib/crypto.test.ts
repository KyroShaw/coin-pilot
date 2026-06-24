import { beforeAll, describe, expect, it } from "vitest";

const HEX_RE = /^[0-9a-f]+$/;
const LAST_CHAR_RE = /.$/;

// 单测隔离 env 校验：跳过 @coin-pilot/env 的整体校验，只注入本测试所需主密钥（64 hex = 32 字节）
beforeAll(() => {
	process.env.SKIP_ENV_VALIDATION = "true";
	process.env.ENCRYPTION_MASTER_KEY = "a".repeat(64);
});

describe("crypto AES-256-GCM", () => {
	it("加密后再解密应还原明文", async () => {
		const { encrypt, decrypt } = await import("./crypto");
		const plaintext = "binance-secret-key-1234567890";
		const payload = encrypt(plaintext);

		expect(payload.iv).toMatch(HEX_RE);
		expect(payload.authTag).toMatch(HEX_RE);
		expect(payload.ciphertext).not.toContain(plaintext);
		expect(decrypt(payload)).toBe(plaintext);
	});

	it("相同明文两次加密的密文与 iv 不同", async () => {
		const { encrypt } = await import("./crypto");
		const a = encrypt("same-plaintext");
		const b = encrypt("same-plaintext");

		expect(a.iv).not.toBe(b.iv);
		expect(a.ciphertext).not.toBe(b.ciphertext);
	});

	it("authTag 被篡改时解密抛错", async () => {
		const { encrypt, decrypt } = await import("./crypto");
		const payload = encrypt("tamper-me");
		const tampered = {
			...payload,
			authTag: payload.authTag.replace(LAST_CHAR_RE, "0"),
		};

		expect(() => decrypt(tampered)).toThrow();
	});
});
