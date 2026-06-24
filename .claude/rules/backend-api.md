---
description: 后端规范 —— Hono 服务端与 tRPC 路由
paths: ["apps/server/**", "packages/api/**"]
---

# 后端 API（apps/server + packages/api）

技术栈：**Hono** HTTP 服务端（`apps/server`）对外暴露在 `packages/api` 中定义的 **tRPC** 路由。鉴权用 Better-Auth；数据用 Drizzle（`@coin-pilot/db`）。

## tRPC 结构

- 核心原语在 `packages/api/src/index.ts` 中一次性创建：`router`、`publicProcedure`、`protectedProcedure`。直接引入它们 —— 不要在别处重新 init tRPC。
- 功能路由位于 `packages/api/src/routers/<feature>.ts`，并在 `routers/index.ts` 中合并。
- `createContext`（`context.ts`）从请求头解析 Better-Auth session，并以 `ctx.session` 暴露。

## Procedure 约定

- 选对基础 procedure：
  - `publicProcedure` —— 无需鉴权。
  - `protectedProcedure` —— 需要 session；当 `ctx.session` 缺失时它已会抛 `TRPCError({ code: "UNAUTHORIZED" })`。用户相关的一律用它。
- **凡有输入**的 procedure 都必须用 `zod` 通过 `.input(z.object({...}))` 校验。
- 读用 `.query()`，写用 `.mutation()`。
- `await` 所有异步 DB 操作并返回结果（见 `routers/todo.ts`）。

## 错误

- 抛出带恰当 `code`（`UNAUTHORIZED`、`NOT_FOUND`、`BAD_REQUEST` 等）与清晰 `message` 的 `TRPCError`。不要把内部 / DB 错误细节泄露给客户端。

## 服务端

- `apps/server` 保持轻薄：只接好 Hono → tRPC 适配器 + 鉴权，业务逻辑下沉到 `packages/api`。不要在服务端入口写数据访问逻辑。
