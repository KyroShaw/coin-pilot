import Anthropic from "@anthropic-ai/sdk";
import { env } from "@coin-pilot/env/server";

/** 共享 Anthropic 客户端，密钥经 @coin-pilot/env 注入（仅服务端使用）。 */
export const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

/** 复杂推理默认模型（板块归类、复盘报告、冷静提示等）。 */
export const REASONING_MODEL = "claude-opus-4-8";

/** 轻量摘要模型（一句话影响摘要等高频低复杂度场景）。 */
export const SUMMARY_MODEL = "claude-haiku-4-5";
