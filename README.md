# 拾光

跨平台视频搜索和播放应用。从互联网各处拾取免费光影资源，聚合多个公开视频源，在统一的移动端和 TV 端界面中浏览和播放。

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Node.js 20+, Express 5, TypeScript |
| 爬虫 | Axios, Cheerio |
| 元数据 | TMDB API（可选） |
| 前端 | React Native, Expo 52 |
| 导航 | React Navigation 7 (Native Stack) |
| 播放 | expo-av (ExoPlayer) |
| 平台 | iOS, Android, Android TV, Web |

## 项目结构

```
video-app/
├── backend/                     # Express API 服务器
│   ├── src/
│   │   ├── server.ts           # 入口 + 中间件 + 路由注册
│   │   ├── routes/
│   │   │   ├── search.ts       # GET /api/search
│   │   │   └── detail.ts       # GET /api/detail
│   │   ├── spiders/
│   │   │   ├── base.ts         # Spider 接口 + 类型定义
│   │   │   ├── registry.ts     # 爬虫注册中心
│   │   │   ├── youtube.ts      # YouTube 搜索爬虫
│   │   │   ├── vimeo-free.ts   # Vimeo 免费影片
│   │   │   ├── free-kukan.ts   # Internet Archive
│   │   │   └── example.ts      # 示例爬虫
│   │   └── services/
│   │       └── tmdb.ts         # TMDB 元数据增强
│   ├── package.json
│   └── tsconfig.json
├── app/                         # React Native 前端
│   ├── App.tsx                 # 入口 + 导航配置
│   ├── screens/
│   │   ├── HomeScreen.tsx      # 首页（搜索 + 快捷入口 + 热门）
│   │   ├── SearchScreen.tsx    # 搜索结果（网格 + 状态处理）
│   │   └── DetailScreen.tsx    # 详情（信息 + 视频源 + 播放）
│   ├── components/
│   │   ├── VideoCard.tsx       # 视频卡片（含骨架屏）
│   │   └── VideoPlayer.tsx     # 播放器（进度/倍速/全屏）
│   ├── services/
│   │   └── api.ts              # API 客户端
│   ├── theme/
│   │   └── colors.ts           # 深色主题色板
│   ├── app.json
│   └── package.json
├── docs/                        # 文档
│   ├── architecture.md         # 架构文档
│   ├── api.md                  # API 文档
│   ├── spider-guide.md         # 爬虫开发指南
│   ├── development.md          # 开发指南
│   └── qa-report.md            # QA 测试报告
└── tests/
    └── qa-test-report.md       # 原始测试报告
```

## 快速开始

### 环境要求

- Node.js 20+
- npm
- (可选) TMDB API Key

### 后端

```bash
cd backend
npm install

# 可选：启用 TMDB 元数据增强
export TMDB_API_KEY=your_key_here

npm run dev          # 开发模式，热重载
```

后端默认监听 `http://localhost:3000`。

### 前端

```bash
cd app
npm install
npx expo start       # 启动 Expo 开发服务
```

在 Expo 终端中选择平台：
- `a` — Android 模拟器
- `i` — iOS 模拟器
- `w` — Web 浏览器

### 验证

```bash
curl http://localhost:3000/api/health
curl "http://localhost:3000/api/search?q=test"
```

## 已有爬虫

| 爬虫名称 | 数据源 | 搜索方式 |
|----------|--------|----------|
| `example` | 本地模拟数据 | 固定示例数据 |
| `internet-archive` | archive.org | Advanced Search JSON API |
| `vimeo-free` | vimeo.com | 页面抓取 + oEmbed + 预置列表 |
| `youtube` | youtube.com | `ytInitialData` JSON 提取，无需 API Key |

## 文档

| 文档 | 说明 |
|------|------|
| [架构文档](docs/architecture.md) | 整体架构、组件关系、数据流 |
| [API 文档](docs/api.md) | 接口说明、参数、返回示例 |
| [爬虫开发指南](docs/spider-guide.md) | Spider 接口、实现步骤、注意事项 |
| [开发指南](docs/development.md) | 环境搭建、构建、常见问题 |
| [QA 报告](docs/qa-report.md) | 测试结果和发现问题 |

## 脚本

### 后端

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发（tsx watch） |
| `npm run build` | 编译 |
| `npm start` | 运行编译产物 |

### 前端

| 命令 | 说明 |
|------|------|
| `npm start` | Expo 开发服务 |
| `npm run android` | 连接 Android 模拟器 |
| `npm run web` | 启动 Web 版 |
| `npm run ts:check` | 类型检查 |
