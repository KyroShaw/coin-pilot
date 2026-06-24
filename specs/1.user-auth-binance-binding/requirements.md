# F-001 用户账号与 Binance API 绑定 — 需求规格

## 概述

本 feature 为 coin-pilot 提供基础的用户账号体系与 Binance API Key 绑定能力。用户通过邮箱密码完成注册与登录，登录后可绑定自己的 Binance 只读 API Key。系统将 API Key 以应用层 AES-256-GCM 加密后持久化存储，前端及任何接口响应、日志均不可见明文。绑定成功后，系统能够使用该凭据成功拉取 Binance 账户基本信息。

F-001 是其它所有 feature 的基础：它提供账号体系（持久化 API Key 与后续复盘数据）、加密存储的 Binance 凭据，以及向 Binance 拉取数据的底层能力。

## 项目信息

- 项目名（PROJECT_NAME）：`coin-pilot`
- 架构类型（ARCH_TYPE）：pnpm + Turborepo TypeScript monorepo
- 涉及包/应用：`apps/web`（前端）、`apps/server`（后端入口）、`packages/api`（tRPC）、`packages/auth`（Better-Auth）、`packages/db`（Drizzle + PostgreSQL）、`packages/env`（环境变量校验）

## 需求版本

| 日期 | 版本 | 说明 |
| --- | --- | --- |
| 2026-06-24 | v1 | 初始需求 |

## 用户故事

- 作为一名加密货币交易者，我想要使用邮箱和密码注册并登录账号，以便系统能持久化我的 API Key 和后续的复盘数据。
- 作为一名已登录用户，我想要绑定我的 Binance 只读 API Key，以便系统能代我拉取账户与行情数据用于复盘分析。
- 作为一名注重安全的用户，我想要确保我的 API Key 永远不以明文出现在前端、接口响应或日志中，以便降低凭据泄露的风险。
- 作为一名已绑定凭据的用户，我想要在绑定时立即得到「是否可成功连接 Binance」的反馈，以便确认 Key 有效且权限正确。

## 功能需求

- **[F-001-1] 用户注册/登录（邮箱密码）**
  - 提供基于 Better-Auth 的邮箱 + 密码注册与登录流程。
  - 注册时校验邮箱格式与密码强度（最小长度等），重复邮箱给出明确错误提示。
  - 登录成功后建立 Better-Auth session，`packages/api` 的 `createContext` 从请求头解析并暴露为 `ctx.session`。
  - 提供登出能力，清除会话。

- **[F-001-2] 绑定 Binance API Key（只读权限）**
  - 已登录用户可提交 Binance API Key + Secret Key 进行绑定。
  - 绑定时调用 Binance REST API（账户信息接口，HMAC SHA256 签名）做一次连通性与权限校验，确认 Key 有效。
  - 校验 Key 为只读权限：若检测到 Key 具备下单/提现权限，拒绝绑定并提示用户使用只读 Key。
  - 同一用户重复绑定时覆盖（更新）已有凭据。
  - 提供查询「是否已绑定」及解绑能力（解绑不返回任何明文）。

- **[F-001-3] API Key 加密存储，前端不可见**
  - API Key 与 Secret Key 经应用层 AES-256-GCM 加密后存入数据库，存储 `iv`、`authTag`、`ciphertext` 三段。
  - 主加密密钥来自环境变量，经 `@coin-pilot/env` 注入，禁止散读 `process.env`。
  - 任何 tRPC 响应、API 响应体、日志、错误信息均不得包含明文 Key/Secret；查询绑定状态时仅返回脱敏信息（如是否绑定、Key 末四位或绑定时间）。

## 非功能需求

- **安全**
  - API Key/Secret 使用 AES-256-GCM 应用层加密；主密钥仅存于环境变量。
  - Binance API 仅接受只读权限 Key（最小权限原则）。
  - 绑定/查询/解绑相关 tRPC procedure 必须为 `protectedProcedure`，无 session 抛 `TRPCError UNAUTHORIZED`。
  - 明文 Key 仅在内存中短暂存在（加密前、签名请求时），绝不落库、绝不进日志。
- **性能**
  - 普通页面（登录、绑定表单、绑定状态查询）响应时间 < 2s。
  - 绑定时的 Binance 连通性校验受外部 API 影响，应设置合理超时并在失败时给出友好提示。
- **可靠性 / 错误处理**
  - Binance API 拉取失败时展示友好提示（如「无法连接 Binance，请检查网络或 Key 权限」），不暴露内部异常细节。
- **兼容性**
  - 前端 React 19 + TanStack Router 文件式路由（`apps/web/src/routes/`），TailwindCSS + `@coin-pilot/ui`（shadcn/ui）。
  - 所有 tRPC 输入用 zod（4.1.13）经 `.input(z.object({...}))` 校验。
  - 代码遵循 Biome / Ultracite（Tab 缩进、双引号）。

## 验收标准

- [ ] **[AC-001-1]** 用户可完成注册并登录（注册新账号 → 登录 → 获得有效 session）。
- [ ] **[AC-001-2]** 绑定 API Key 后系统可成功拉取 Binance 账户基本信息（绑定流程返回连通性校验成功）。
- [ ] **[AC-001-3]** API Key 不以明文形式出现在任何响应或日志中（接口响应、日志、错误信息均经核验无明文）。

## 依赖

- **外部服务**
  - Binance REST API（账户信息接口，HMAC SHA256 签名，只读权限）。
- **内部包**
  - `packages/auth`：Better-Auth（better-auth 1.6.11），邮箱密码认证与 session。
  - `packages/db`：Drizzle ORM + PostgreSQL（pg 驱动），新增 `binance_credential` 表。
  - `packages/api`：tRPC（`router`/`publicProcedure`/`protectedProcedure`/`createContext`）。
  - `packages/env`：基于 zod 的 `@coin-pilot/env` 环境变量校验（加密主密钥等）。
- **库 / 运行时**
  - Node.js `crypto` 模块（AES-256-GCM 加解密、HMAC SHA256 签名）。
  - zod 4.1.13（输入校验）。

## 开放问题

- 无重大开放问题。（注：是否在绑定后周期性后台校验 Key 有效性，留待后续 feature 决定，本 feature 仅在绑定时校验一次。）
