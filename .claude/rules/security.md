---
description: 安全规范 —— 密钥、环境变量、鉴权与输入处理
paths: ["**"]
---

# 安全

## 密钥与环境变量

- **绝不**硬编码密钥、连接串或 API key。所有配置经由 `@coin-pilot/env` 与 `.env` 文件流转。
- `.env` 与 `.env*.local` 已被 gitignore，保持如此。绝不提交填好的 `.env`。
- 数据库连接从 `apps/server/.env` 读取 `DATABASE_URL`（见 `packages/db/drizzle.config.ts`）。用基于 `zod` 的 `@coin-pilot/env` 包做校验，而非散落地直接读 `process.env`。

## 鉴权与授权

- 鉴权由 **Better-Auth** 处理（`packages/auth`）；session 在 `packages/api/src/context.ts` 中解析。
- 任何需要登录的 tRPC procedure 必须用 `protectedProcedure`（而非 `publicProcedure`）—— 当无 session 时它会抛出 `TRPCError({ code: "UNAUTHORIZED" })`。
- 绝不信任客户端传来的用户/归属 id；从 `ctx.session` 推导操作者身份。

## 输入校验

- 在边界处用 `zod` 校验**所有**外部输入 —— 每个 tRPC procedure 的输入都必须有 `.input(z.object({...}))` schema（见 `packages/api/src/routers/todo.ts`）。
- 使用 Drizzle 的参数化查询 / 查询构建器（`eq` 等）；绝不把用户输入拼接进原始 SQL。

## 前端

- `target="_blank"` 的链接加 `rel="noopener"`。
- 避免 `dangerouslySetInnerHTML`；绝不用 `eval()` 或直接写 `document.cookie`。
- 密钥不要进客户端 bundle —— 只暴露确实可公开的值。
