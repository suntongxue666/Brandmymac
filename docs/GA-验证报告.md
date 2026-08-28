# BrandMyMac · Google Analytics 接入验证报告

日期：2026-08-28
测量 ID：G-M0KLSDHYDG
结论：**已添加，且线上生效**

---

## 1. 代码位置

`app/layout.tsx`（根布局，第 49–60 行）

```tsx
<Script
  src="https://www.googletagmanager.com/gtag/js?id=G-M0KLSDHYDG"
  strategy="afterInteractive"
/>
<Script id="google-analytics" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){window.dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-M0KLSDHYDG');
  `}
</Script>
```

- 使用 `next/script` 组件，而非裸 `<script>` 标签。
- `window.dataLayer` 写法（官方片段里常写成 `dataLayer.push`，在模块作用域下会报错，这里已规避）。
- 无 `dangerouslySetInnerHTML`，避免转义问题。
- 放在根 `layout.tsx` 的 `<body>` 末尾，因此对**所有页面**生效。

## 2. 覆盖范围实测

用无头 Chrome（`--headless=new --virtual-time-budget=10000 --dump-dom`）渲染后检查真实 DOM：

| 页面 | gtag.js | 内联 config | 说明 |
|---|---|---|---|
| `/` | 有 | 有 | 首页广告位市场 |
| `/terms` | 有 | 有 | 服务条款 |
| `/privacy` | 有 | 有 | 隐私政策 |
| `/schedule` | 有 | 有 | 管理后台 |

线上环境 https://brandmymac.xyz/ 同样检测通过（DOM 中存在 `<script src="...gtag/js?id=G-M0KLSDHYDG">` 与 `<script id="google-analytics">`）。

无重复注入：整页 `googletagmanager` 仅出现 2 次（一次在 RSC flight payload，一次是真实 DOM 节点）。

## 3. 需要注意的一个行为差异

vinext 的 `next/script` shim（`node_modules/vinext/dist/shims/script.js`）与 Next.js 官方实现不同：

| strategy | vinext 行为 |
|---|---|
| `beforeInteractive` | 输出真实 `<script>` 标签到 SSR HTML |
| `afterInteractive`（当前使用） | **不进 SSR HTML**，hydration 之后由 `useEffect` 动态 append 到 `document.body` |

影响：

- 用 `curl` 或浏览器「查看网页源代码」看不到 GA 代码，只有在 DevTools 的 Elements 面板里才看得到。这是正常现象，不是漏加。
- 统计依赖 JS 执行：用户在水合完成前离开、或禁用 JS，不会计入。
- 动态创建的 script 默认 `async`，内联 `gtag('config')` 会先执行并写入 `dataLayer` 队列，gtag.js 加载完成后再消费队列 —— 顺序安全，不会丢事件。

## 4. 建议（可选）

若希望 GA 更早发起请求、且不依赖水合，可把第一个脚本改为 `strategy="beforeInteractive"`，让它直接进入 SSR HTML。当前配置功能上完全正常，是否改动取决于你对首屏统计精度的要求。

---

## 附：项目架构速览

- **技术栈**：Next.js 16 App Router 语法 + vinext 0.0.50（Vite + RSC），产物 `dist/client` + `dist/server`，Cloudflare Workers 部署（wrangler），D1 数据库 `brandmymac`。
- **前端**：`/` 首页（15 个广告位：3 个 Prime + 12 个 Desktop，3/7 天套餐）、`/terms`、`/privacy`、`/schedule`。
- **后端**：全部在 `worker/index.ts`
  - `/api/slots` 广告位与生效中的预订
  - `/api/stats` 访问量、在线人数、访客画像（IP / UA / 国家 / 城市）
  - `/api/bookings` 提交预订，写 D1 并发邮件到 sunwei7482@gmail.com
  - `/api/admin/*` 管理接口（token `brandmymac-admin`），改价、改排期、标记已付款
- **定时任务**：每 15 分钟刷新预订状态（Pending → Active → Ended）。
- **测试**：`tests/rendered-html.test.mjs` 直接加载 `dist/server/index.js` 做 SSR 断言，其中第 51 行断言 `G-M0KLSDHYDG` 出现在渲染结果中。
