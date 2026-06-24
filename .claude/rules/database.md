---
description: 数据库规范 —— Drizzle ORM + PostgreSQL
paths: ["packages/db/**"]
---

# 数据库（packages/db）

技术栈：**Drizzle ORM** + **PostgreSQL**（`pg` 驱动）。配置见 `packages/db/drizzle.config.ts`（dialect `postgresql`，schema 目录 `./src/schema`，migration 输出 `./src/migrations`）。`DATABASE_URL` 从 `apps/server/.env` 加载。

## Schema

- 每个领域表一个文件，置于 `packages/db/src/schema/`（如 `todo.ts`、`auth.ts`），并从 `schema/index.ts` 重新导出。
- 用 `pgTable` 定义表，显式声明列类型/约束；必填列标 `.notNull()` 并给合理的 `.default(...)`（见 `schema/todo.ts`）。
- 按包路径引入表：`import { todo } from "@coin-pilot/db/schema/todo"`。
- **不要手改 Better-Auth 的表**（`schema/auth.ts`）—— 它们由 Better-Auth 的 schema 生成管理。

## Migration（在仓库根目录经 Turbo 运行）

- `pnpm db:push` —— 直接把 schema 推到 DB（开发期快速迭代）。
- `pnpm db:generate` —— schema 变更后生成 SQL migration 文件到 `src/migrations/`。
- `pnpm db:migrate` —— 应用已生成的 migration。
- `pnpm db:studio` —— 打开 Drizzle Studio。
- **提交生成的 migration 文件**；绝不手改已应用的 migration —— 新建一个即可。

## 查询

- 使用导出的 `db` 实例与 Drizzle 查询构建器；用 `eq` 等辅助函数过滤（参数化 —— 绝不字符串拼接用户输入）。
- 查询逻辑放在 `packages/db` 或 tRPC 路由中；始终 `await` 并返回结果。
