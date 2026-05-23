# QA 测试报告

**测试日期**: 2026-05-23
**测试范围**: 后端 API + 前端 React Native App + Expo Web 导出
**测试环境**: WSL2 Linux, Node.js 20+

---

## 1. 后端功能测试

### 1.1 GET /api/health

| 测试项 | 结果 | 说明 |
|--------|------|------|
| 返回 status + spiders 列表 | **PASS** | `{"status":"ok","spiders":["example","internet-archive","vimeo-free","youtube"]}` |

### 1.2 GET /api/search?q=test

| 测试项 | 结果 | 说明 |
|--------|------|------|
| 搜索正常返回 | **PASS** | 返回多源聚合结果 |
| 包含所有 spider 来源 | **PASS** | 来源分布包含 `internet-archive` + `example` + `vimeo-free` + `youtube` |
| 结果按相关性排序 | **PASS** | title 匹配 query token 多的排在前面 |

### 1.3 GET /api/search?q= （空查询）

| 测试项 | 结果 | 说明 |
|--------|------|------|
| 返回 400 错误 | **PASS** | `{"error":"query parameter \"q\" is required"}` |

### 1.4 GET /api/detail (有效请求)

| 测试项 | 结果 | 说明 |
|--------|------|------|
| 返回详情 + video sources | **PASS** | 返回 title + sources 列表 |

### 1.5 GET /api/detail（不存在的 spider）

| 测试项 | 结果 | 说明 |
|--------|------|------|
| 返回 404 错误 | **PASS** | `{"error":"spider \"nonexistent\" not found"}` |

### 1.6 GET /api/search?q=中文（中文搜索）

| 测试项 | 结果 | 说明 |
|--------|------|------|
| 不崩溃 | **PASS** | 正常返回结果 |

### 1.7 GET /api/detail 缺少参数

| 测试项 | 结果 | 说明 |
|--------|------|------|
| 返回 400 错误 | **PASS** | `{"error":"\"url\" and \"spider\" query parameters are required"}` |

---

## 2. 后端代码质量检查

| 检查项 | 结果 | 说明 |
|--------|------|------|
| TypeScript 编译 (`npm run build`) | **PASS** | 零错误 |
| `searchAll` 使用 `Promise.allSettled` | **PASS** | 单个 spider 失败不影响其他结果 |
| 路由错误处理 | **PASS** | try/catch 捕获 + 全局 error handler |
| import 使用 `.js` 后缀 (NodeNext) | **PASS** | 所有 import 均以 `.js` 结尾 |

---

## 3. 前端代码质量检查

| 检查项 | 结果 | 说明 |
|--------|------|------|
| TypeScript 类型检查 (`tsc --noEmit`) | **PASS** | 零错误 |
| API 客户端类型与后端匹配 | **PASS** | 前端 SearchResult 类型与后端保持一致 |
| loading/error/empty 状态 | **PASS** | SearchScreen: 三类状态完整；DetailScreen: loading + error + "no sources" |
| TV 适配 (`Platform.isTV`) | **PASS** | HomeScreen / SearchScreen / DetailScreen / VideoPlayer / VideoCard 均已适配 |

---

## 4. Expo Web 导出构建

| 检查项 | 结果 | 说明 |
|--------|------|------|
| `npx expo export --platform web` | **PASS** | Web 导出完成，生成 `dist/` 目录 |
| 导出产物完整性 | **PASS** | 包含 HTML + JS bundle + 静态资源 |

---

## 5. 发现的 Bug 与问题

### P2 体验问题

| # | 问题 | 文件 | 严重程度 |
|---|------|------|---------|
| 1 | `cheerio` 声明在 backend `package.json` 的 dependencies 中但前端源码中从未引用 —— 无用的依赖包袱 | `backend/package.json` | P2 |
| 2 | `assets/` 目录为空，`app.json` 引用的 `./assets/icon.png` 不存在。打包时因缺少 icon 报错 | `app/assets/`, `app/app.json:8` | P2 |

### P3 代码规范

| # | 问题 | 文件 | 严重程度 |
|---|------|------|---------|
| 3 | `SkeletonCard` 组件已实现并 export，但没有任何地方使用。SearchScreen 和 DetailScreen 中也没有 skeleton loading | `app/components/VideoCard.tsx` | P3 |
| 4 | SearchScreen 使用 `keyExtractor={(_, idx) => String(idx)}` —— 以数组索引做 key 在列表动态变化时可能导致渲染问题。虽当前场景无增删操作，但属不良实践 | `app/screens/SearchScreen.tsx` | P3 |
| 5 | DetailScreen 的 `useEffect` 中调用 `loadDetail()`，没有 abort 或 cleanup —— 组件卸载后 setState 会触发 React warning | `app/screens/DetailScreen.tsx` | P3 |
| 6 | HomeScreen 的 "Movies"/"Series"/"Documentary" 快捷入口只做文本搜索字面量，没有真正的分类筛选功能 —— 后端也缺少按 type 筛选的 API | `app/screens/HomeScreen.tsx` | P3 |

---

## 6. 总体结论

### 评级：条件通过

**后端**: 功能完整。所有 API 端点正常工作，错误处理完善，编译通过。建议移除未使用的 `cheerio` 依赖。

**前端**:
- 核心功能完整，loading / error / empty 状态在各页面都已覆盖
- TV 适配（`Platform.isTV`）在所有组件中已应用
- Expo Web 导出构建成功
- 主要缺失：App icon 素材文件（`assets/icon.png`），生产导出会因缺少 icon 报错
- 建议补充 skeleton loading 提升用户体验

**综合**: 修复 P2 问题（清理 `cheerio` 依赖、补齐 icon 素材）后可发布。
