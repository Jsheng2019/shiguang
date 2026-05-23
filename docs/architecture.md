# 架构文档

## 项目概述

Video App 是一个跨平台视频搜索和播放应用，通过聚合多个公开视频源的搜索结果，为用户提供统一的搜索和播放体验。后端使用 Node.js + Express 实现爬虫聚合，前端使用 React Native (Expo) 构建移动端和 TV 端界面。

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 后端运行时 | Node.js 20+ | TypeScript 编译运行 |
| 后端框架 | Express 5 | HTTP 路由、中间件 |
| 爬虫引擎 | Axios + Cheerio | HTTP 请求 + HTML 解析 |
| 元数据增强 | TMDB API | 电影海报、评分、描述 |
| 前端框架 | React Native (Expo 52) | 跨平台移动端 + TV |
| 导航 | React Navigation 7 | Native Stack 导航 |
| 视频播放 | expo-av | 内嵌播放器 + 全屏 |

## 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        用户端                                │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │   Mobile App     │  │   TV App         │                 │
│  │  (iOS/Android)   │  │  (Android TV)    │                 │
│  └────────┬─────────┘  └────────┬─────────┘                 │
│           │                     │                           │
│           └──────────┬──────────┘                           │
│                      │ HTTP REST API                        │
└──────────────────────┼──────────────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────────────┐
│             Express API Server (端口 3000)                  │
│                      │                                      │
│  ┌───────────────────┴───────────────────┐                  │
│  │          路由层 (Routes)               │                  │
│  │  ┌────────────┐  ┌───────────────┐   │                  │
│  │  │ /api/search │  │ /api/detail   │   │                  │
│  │  └──────┬─────┘  └──────┬────────┘   │                  │
│  └─────────┼───────────────┼────────────┘                  │
│            │               │                               │
│  ┌─────────┴───────────────┴────────────┐                  │
│  │      Spider Registry                 │                  │
│  │  ┌──────────┐  ┌───────────────┐     │                  │
│  │  │ searchAll│  │ getSpider     │     │                  │
│  │  └─────┬────┘  └───────┬───────┘     │                  │
│  └───────┼────────────────┼────────────┘                   │
│          │                │                                │
│  ┌───────┴────────────────┴────────────────────────────┐   │
│  │               Spider 实现层                          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │   │
│  │  │ YouTube  │ │ Vimeo    │ │ Internet │ │Example │ │   │
│  │  │ Spider   │ │ Free     │ │ Archive  │ │Spider  │ │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────┘ │   │
│  └───────────────────────┬────────────────────────────┘   │
│                          │                                │
│  ┌───────────────────────┴────────────────────────────┐   │
│  │          TMDB 元数据增强层 (可选)                   │   │
│  │  TmdbService.enrichSearchResults / enrichDetail    │   │
│  └────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘
```

## 后端架构

### 目录结构

```
backend/
├── src/
│   ├── server.ts              # Express 入口，注册中间件和路由
│   ├── routes/
│   │   ├── search.ts          # GET /api/search 路由
│   │   └── detail.ts          # GET /api/detail 路由
│   ├── spiders/
│   │   ├── base.ts            # Spider 接口 + 类型定义
│   │   ├── registry.ts        # 爬虫注册中心
│   │   ├── youtube.ts         # YouTube 爬虫
│   │   ├── vimeo-free.ts      # Vimeo 免费视频爬虫
│   │   ├── free-kukan.ts      # Internet Archive 爬虫
│   │   └── example.ts         # 示例爬虫
│   └── services/
│       └── tmdb.ts            # TMDB 元数据服务
├── package.json
└── tsconfig.json
```

### 路由层

- **server.ts**: 创建 Express 实例，注册 `cors` 和 `json` 中间件，挂载 `search` 和 `detail` 路由，提供全局错误处理。
- **GET /api/health**: 返回服务状态和已注册爬虫列表。
- **GET /api/search**: 接收 `q` 参数，调用所有爬虫并行搜索，结果经相关性排序后返回。
- **GET /api/detail**: 接收 `url` 和 `spider` 参数，调用指定爬虫获取详情和视频源。

### Spider 注册中心 (Registry)

`SpiderRegistry` 维护所有爬虫实例的 Map。提供三个核心方法：
- `register(spider)` — 注册新爬虫
- `getSpider(name)` — 按名称获取爬虫
- `searchAll(query)` — 遍历所有爬虫执行 `Promise.allSettled`，保证单个爬虫失败不影响整体

### 爬虫层

每个爬虫实现 `Spider` 接口中的两个方法：
- `search(query)` — 搜索，返回 `SearchResult[]`
- `getDetail(url)` — 获取详情，返回 `SearchResult | null`

### TMDB 增强

`TmdbService` 为搜索结果补充来自 TMDB 的海报、评分、描述等元数据。启用时需要设置 `TMDB_API_KEY` 环境变量。增强是可选且容错的，任何失败会退回原始数据。

## 前端架构

### 目录结构

```
app/
├── App.tsx                    # 应用入口，导航配置
├── screens/
│   ├── HomeScreen.tsx         # 首页：搜索框 + 快捷入口 + 热门推荐
│   ├── SearchScreen.tsx       # 搜索结果页：搜索 + 结果网格
│   └── DetailScreen.tsx       # 详情页：海报、描述、视频源列表
├── components/
│   ├── VideoCard.tsx          # 视频卡片组件（含骨架屏）
│   └── VideoPlayer.tsx        # 视频播放器组件
├── services/
│   └── api.ts                 # API 客户端 + 前端类型定义
├── theme/
│   └── colors.ts              # 深色主题色彩
├── assets/                    # 图标等静态资源
├── app.json                   # Expo 配置
└── package.json
```

### 导航

使用 React Navigation Native Stack，采用深色主题，路由链如下：

```
Home (header hidden)
  │
  ├── Search → { query: string }
  │     │
  │     └── Detail → { item: SearchResult }
  │
  └── Detail (直接导航)
```

### 组件关系

```
App (NavigationContainer)
├── HomeScreen
│   ├── TextInput (搜索框)
│   ├── 快捷入口 (Movies / Series / Documentary)
│   ├── 历史搜索标签
│   └── FlatList → VideoCard (热门推荐)
├── SearchScreen
│   ├── TextInput (搜索框)
│   ├── Loading / Error / Empty 状态处理
│   └── FlatList → VideoCard (搜索结果)
└── DetailScreen
    ├── 海报 + 元信息
    ├── 评分组件 (RatingDisplay)
    ├── 描述文本
    ├── Loading / Error 状态处理
    └── 视频源列表 → VideoPlayer
        └── VideoPlayer
            ├── 播放/暂停
            ├── 快进/快退 (10s)
            ├── 倍速 (0.5x / 1x / 1.5x / 2x)
            ├── 进度条
            └── 全屏切换
```

### 数据流

```
用户输入查询
    │
    ▼
HomeScreen / SearchScreen
    │  调用 api.search(query)
    ▼
ApiClient (axios) ── HTTP GET /api/search?q=... ──→ Express Server
                                                       │
                                                       ▼
                                               SpiderRegistry.searchAll()
                                                       │
                                                   ┌───┴───┐
                                                   │       │
                                               youtube  vimeo-free
                                               internet-archive  example
                                                   │       │
                                                   └───┬───┘
                                                       ▼
                                               Promise.allSettled
                                                       │
                                                       ▼
                                               TmdbService.enrichSearchResults (可选)
                                                       │
                                                       ▼
                                               sortByRelevance 排序
                                                       │
                    ←── JSON { results, total } ───────┘
                    │
                    ▼
               VideoCard 网格渲染
                    │
                    ▼           (用户点击卡片)
               DetailScreen ──────────────────→ api.getDetail(url, spider)
                    │                               │
                    │                               ▼
                    │                          SpiderRegistry.getSpider(name)
                    │                               │
                    │                               ▼
                    │                          Spider.getDetail(url)
                    │                               │
                    │                               ▼
                    │                          TmdbService.enrichDetail (可选)
                    │                               │
                    │   ←── JSON { result } ────────┘
                    │
                    ▼
               选择视频源 → VideoPlayer 播放
```

## 数据模型

### SearchResult

| 字段 | 类型 | 说明 |
|------|------|------|
| title | string | 视频标题 |
| year | number? | 发布年份 |
| type | 'movie' \| 'series' \| 'documentary' | 视频类型 |
| country | string? | 国家 |
| poster | string? | 海报 URL |
| rating | number? | 评分 (0-10) |
| description | string? | 描述 |
| sources | VideoSource[] | 视频源列表 |
| sourceName | string | 来源爬虫名称 |
| sourceUrl | string | 源站页面 URL |

### VideoSource

| 字段 | 类型 | 说明 |
|------|------|------|
| url | string | 视频播放地址 |
| quality | '1080p' \| '720p' \| '480p' \| '360p' | 画质 |
| format | 'hls' \| 'dash' \| 'mp4' | 封装格式 |
| headers | Record<string, string>? | 自定义请求头 |
