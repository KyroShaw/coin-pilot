---
description: 前端规范 —— React 19、TanStack Router、shadcn/ui、Tailwind
paths: ["apps/web/**"]
---

# 前端（apps/web）

技术栈：**React 19**、**TanStack Router**（文件式路由）、**Vite**、**TailwindCSS**，共享 **shadcn/ui** 原语来自 `@coin-pilot/ui`。API 访问为端到端类型安全的 **tRPC**。

## 路由

- 路由基于文件，位于 `apps/web/src/routes/`。`__root.tsx` 是根布局；`_auth/` 是用于鉴权页面的无路径布局分组。
- **`routeTree.gen.ts` 是自动生成的** —— 绝不手改，它已被 gitignore，由 TanStack Router 插件重新生成。
- 新增页面只需创建路由文件，让插件重新生成路由树。

## 组件

- 仅用函数组件；职责单一。不要在组件内部定义组件。
- 文件名 kebab-case，组件导出 PascalCase。
- 可复用原语（Button、Dialog 等）来自共享包：`import { Button } from "@coin-pilot/ui/components/button"`。通过 `npx shadcn@latest add <name> -c packages/ui` 添加共享原语；应用专属区块则在 `apps/web` 下用 shadcn CLI。
- hook 只在顶层调用；依赖数组写完整（Biome 将 `useExhaustiveDependencies` 报为 info）。

## 样式

- 使用 TailwindCSS 工具类；设计 token / 全局样式位于 `packages/ui/src/styles/globals.css`。
- 条件类名用 `cn` 辅助函数 —— Biome 会自动排序 `clsx`/`cva`/`cn` 中的类名。
- 使用 React 19 的 `React.use` / ref 作为 prop 的写法 —— 不用 `forwardRef`。

## 数据与状态

- 通过类型安全的 tRPC 客户端（`apps/web/src/lib/`、`apps/web/src/utils/`）与后端通信；不要为 API 调用手写 `fetch`。
- 客户端鉴权走 `auth-client.ts`（Better-Auth 客户端）。

## 可访问性

- 语义化 HTML（`<button>`、`<nav>`）；为输入加 label；图片加有意义的 `alt`；鼠标事件同时配键盘事件。
