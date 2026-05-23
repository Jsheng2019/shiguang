# 开发指南

## 环境要求

- Node.js 20+
- npm
- Android Studio / Xcode（运行移动端模拟器）
- TMDB API Key（可选，用于元数据增强）

## 快速开始

### 1. 克隆项目

```bash
git clone <repo-url>
cd video-app
```

### 2. 后端

```bash
cd backend
npm install

# 可选：配置 TMDB API Key 以启用元数据增强
export TMDB_API_KEY=your_key_here

# 开发模式（tsx watch，热重载）
npm run dev

# 或者编译后运行
npm run build
npm start
```

后端默认监听 `http://localhost:3000`，可通过 `PORT` 环境变量修改：

```bash
PORT=4000 npm run dev
```

### 3. 前端

```bash
cd app
npm install
```

启动 Expo 开发服务：

```bash
npx expo start
```

然后在终端中选择平台：
- `a` — Android 模拟器
- `i` — iOS 模拟器
- `w` — Web 浏览器

### 4. 验证后端

```bash
# 健康检查
curl http://localhost:3000/api/health
# 预期输出: {"status":"ok","spiders":["example","internet-archive","vimeo-free","youtube"]}

# 搜索测试
curl "http://localhost:3000/api/search?q=test"
```

## TMDB 配置（可选）

TMDB 用于增强搜索结果的海报、评分、描述等元数据。

1. 在 [TMDB 官网](https://www.themoviedb.org/) 注册账号
2. 在 API 设置页面申请 API Key
3. 设置为环境变量：`export TMDB_API_KEY=your_key_here`

启用后，服务器启动时会输出：`TMDB metadata enrichment enabled`

TMDB 服务是容错的 — 任何 API 失败（包括限流 429）都会静默回退到原始数据。

## 构建

### 后端

```bash
cd backend
npm run build
# 输出到 backend/dist/
```

### 前端 Web

```bash
cd app
npx expo export --platform web
# 输出到 app/dist/
```

## 项目脚本

### 后端 (`backend/package.json`)

| 命令 | 说明 |
|------|------|
| `npm run dev` | tsx watch 热重载开发 |
| `npm run build` | TypeScript 编译到 dist/ |
| `npm start` | 运行编译后的 dist/server.js |

### 前端 (`app/package.json`)

| 命令 | 说明 |
|------|------|
| `npm start` | 启动 Expo 开发服务 |
| `npm run android` | 启动并连接 Android 模拟器 |
| `npm run web` | 启动并打开 Web 版 |
| `npm run ts:check` | TypeScript 类型检查 |

## 常见问题

### 前端连不上后端

前端 API 客户端默认的 base URL 为 `http://10.0.2.2:3000`（Android 模拟器访问宿主机的地址）。如果使用 iOS 模拟器或 Web 版，需要修改 `app/services/api.ts` 中的 `DEFAULT_BASE_URL`：

```typescript
// iOS 模拟器或 Web
const DEFAULT_BASE_URL = 'http://localhost:3000';
// 真机调试
const DEFAULT_BASE_URL = 'http://<你的局域网IP>:3000';
```

### TV 端运行

项目已在 `app.json` 中配置了 `LEANBACK_LAUNCHER` intent filter，支持 Android TV。前端组件通过 `Platform.isTV` 进行 TV 适配，包括更大的卡片、字体、间距和焦点样式。

### TypeScript 编译错误

确保后端使用 `NodeNext` 模块解析，所有相对 import 需要以 `.js` 结尾：

```typescript
// 正确
import { SpiderRegistry } from './spiders/registry.js';

// 错误
import { SpiderRegistry } from './spiders/registry';
```

### 端口被占用

```bash
PORT=4000 npm run dev  # 更换端口
```
