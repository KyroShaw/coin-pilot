---
description: coin-pilot 的测试约定与要求
paths: ["**"]
---

# 测试

> 仓库目前尚未配置测试运行器。引入测试时请遵循以下约定，并将运行器接入 Turborepo 与相应的 `package.json`。

## 推荐方案

- 使用 **Vitest**（原生支持 ESM + TypeScript，与 `apps/web` 已用的 Vite 集成良好）。
- 测试与源码就近放置，命名为 `*.test.ts` / `*.test.tsx`，或放在各包的 `__tests__/` 目录下。
- 在 `turbo.json` 中加入 `test` 任务，并在各包 `package.json` 中加 `"test": "vitest run"`，使 `turbo test` 可跑通整个 monorepo。

## 约定

- 断言写在 `it()` / `test()` 块内；每个测试只验证一个行为。
- 异步测试用 `async/await`，不要用 `done` 回调。
- 不要提交 `.only` 或 `.skip`。
- `describe` 嵌套保持扁平。

## 各层测试重点

- **packages/api**（tRPC 路由）：用 mock/预置的 `db` 与伪造 `Context` 对 procedure 做单元测试（覆盖有 session 与无 session 两种情况以验证 `protectedProcedure`）。
- **packages/db**：针对一次性 Postgres（testcontainers 或 `_test` 库）测试查询逻辑；绝不连开发库。
- **apps/web**：用 Vitest + Testing Library 做组件测试；mock tRPC 客户端。
- **packages/auth**：覆盖 session / 鉴权的边界情况。

## 覆盖率

- 暂不强制硬性阈值。优先保证业务逻辑正确性、鉴权边界与错误路径，而非行覆盖数字。
