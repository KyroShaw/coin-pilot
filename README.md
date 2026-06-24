# coin-pilot

个人加密货币交易 AI 助手——覆盖「行情调研 → 交易决策 → 复盘分析」闭环，帮助交易者减少信息噪音、提高决策理性、建立系统化复盘习惯。

基于 [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack)（React + TanStack Router + Hono + tRPC + Drizzle + Better-Auth + Turborepo）。

## 功能模块

| 模块 | 说明 | 前端页 |
| --- | --- | --- |
| **账号与 API 绑定** | Better-Auth 邮箱密码登录；绑定 Binance **只读** API Key，AES-256-GCM 加密存储，前端不可见 | API 绑定 |
| **板块轮动** | Binance 公开行情 + Claude 结构化归类生成热门板块与龙头币种，定时刷新（≤30min） | 板块轮动 |
| **宏观简报** | CryptoPanic 拉取热点 + Claude 一句话影响摘要，标签筛选 + 游标分页 | 宏观简报 |
| **Binance Alpha 跟踪** | 抓取 Alpha 项目，规则判定「底部盘整」（30 日跌幅 >30% 且近 7 日波动 <10%），定投关注 | Alpha 候选 |
| **订单复盘** | 拉取近 90 天合约已平仓订单 + 录入交易逻辑 → Claude 生成三维度复盘报告（可导出 Markdown） | 订单复盘 |
| **资金曲线与风险预警** | 累计盈亏曲线（天/周）+ 连续盈亏检测 → 触发预警与 Claude 冷静提示，阈值可配置 | 资金曲线 |

## 技术栈

- **Monorepo**：Turborepo + pnpm
- **前端** `apps/web`：React 19、TanStack Router（文件式路由）、TailwindCSS、shadcn/ui（`@coin-pilot/ui`）、recharts、TanStack Query + tRPC client
- **后端** `apps/server`：Hono + tRPC 适配器；承载定时调度与内部刷新端点
- **API** `packages/api`：tRPC 路由 + 服务层 + AI 集成（`@anthropic-ai/sdk`，opus 推理 / haiku 摘要）
- **鉴权** `packages/auth`：Better-Auth
- **数据库** `packages/db`：Drizzle ORM + PostgreSQL
- **环境校验** `packages/env`：`@t3-oss/env-core` + zod
- **质量**：Biome via Ultracite（lint/format）、Vitest（单测）

## 目录结构

```
coin-pilot/
├── apps/
│   ├── web/      # 前端（React + TanStack Router）
│   └── server/   # 后端（Hono + tRPC + 定时调度）
├── packages/
│   ├── api/      # tRPC 路由 / 服务 / AI 集成
│   ├── auth/     # Better-Auth
│   ├── db/       # Drizzle schema / 迁移 / 种子
│   ├── env/      # 环境变量校验
│   └── ui/       # 共享 shadcn/ui 组件
└── specs/        # 各 feature 开发规格 + LESSONS + CHANGELOG
```

## 快速开始

```bash
pnpm install
```

### 1. 数据库

需要本地或远程 PostgreSQL。在 `apps/server/.env` 配置 `DATABASE_URL`，然后应用迁移：

```bash
pnpm db:migrate     # 应用迁移（迁移为单一事实来源，勿用 db:push）
```

### 2. 环境变量（`apps/server/.env`）

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 连接串 |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | Better-Auth 配置 |
| `CORS_ORIGIN` | 前端来源（默认 `http://localhost:3001`） |
| `ENCRYPTION_MASTER_KEY` | AES-256-GCM 主密钥，64 位十六进制（32 字节） |
| `ANTHROPIC_API_KEY` | Claude API Key（板块/简报/复盘/预警的 AI 功能） |
| `CRYPTOPANIC_API_KEY` | CryptoPanic 新闻 API Key（宏观简报） |
| `INTERNAL_REFRESH_TOKEN` | 内部刷新端点保护 token |
| `SECTOR_REFRESH_INTERVAL_MS` | 行情/新闻刷新间隔（默认 25 分钟，≤30 分钟） |

> `ANTHROPIC_API_KEY` / `CRYPTOPANIC_API_KEY` 需填真实值，AI 与新闻功能才能联调。

### 3. 种子数据（可选，演示用）

```bash
pnpm -F @coin-pilot/db db:seed
```

灌入真实行情板块、宏观新闻、Alpha 项目与演示订单。**订单/复盘/资金曲线为用户作用域**，需先在前端注册账号后再运行 seed。

### 4. 运行

```bash
pnpm dev            # 前端 http://localhost:3001 · 后端 http://localhost:3000
```

注册/登录后，顶部导航在 **板块轮动 / Alpha 候选 / 订单复盘 / 资金曲线 / 宏观简报 / API 绑定** 间切换。

## 常用命令

```bash
pnpm dev                       # 启动全部应用
pnpm build                     # 构建
pnpm check                     # Biome/Ultracite lint
pnpm check-types               # 全仓类型检查
pnpm -F @coin-pilot/api test   # 单元测试（Vitest）
pnpm db:generate               # 生成迁移
pnpm db:migrate                # 应用迁移
pnpm db:seed                   # 灌入种子数据
pnpm db:studio                 # Drizzle Studio
```

## 不在范围内（MVP）

自动下单、社交/跟单、多交易所、量化回测、移动端 App、KYC/合规。
