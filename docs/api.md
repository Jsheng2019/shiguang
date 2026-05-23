# API 文档

Base URL: `http://localhost:3000`

## 通用说明

- 所有接口返回 JSON
- 错误时返回 `{ error: string }`
- 请求失败时前端会展示错误提示和重试按钮

---

## GET /api/health

健康检查接口，返回服务状态和已注册爬虫列表。

### 请求示例

```bash
curl http://localhost:3000/api/health
```

### 响应示例

```json
{
  "status": "ok",
  "spiders": ["example", "internet-archive", "vimeo-free", "youtube"]
}
```

### 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| status | string | 服务状态，固定为 `"ok"` |
| spiders | string[] | 已注册的所有爬虫名称 |

---

## GET /api/search

聚合搜索接口，在所有爬虫中并发搜索，结果经相关性排序后返回。

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| q | string | 是 | 搜索关键词，不能为空。支持中文 |

### 请求示例

```bash
curl "http://localhost:3000/api/search?q=test"
```

### 响应示例

```json
{
  "results": [
    {
      "title": "Test Movie Title",
      "year": 1950,
      "type": "movie",
      "poster": "https://archive.org/services/img/test123",
      "description": "A test movie description.",
      "sourceName": "internet-archive",
      "sourceUrl": "https://archive.org/details/test123",
      "sources": [
        {
          "url": "https://archive.org/download/test123/test123.mp4",
          "quality": "720p",
          "format": "mp4"
        }
      ]
    }
  ],
  "total": 22
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| results | SearchResult[] | 搜索结果数组 |
| total | number | 结果总数 |

### SearchResult 类型

| 字段 | 类型 | 说明 |
|------|------|------|
| title | string | 视频标题 |
| year | number? | 发布年份 |
| type | 'movie' \| 'series' \| 'documentary' | 视频类型 |
| country | string? | 国家 |
| poster | string? | 海报图像 URL |
| rating | number? | 评分（TMDB 增强后有此字段） |
| description | string? | 简介 |
| sources | VideoSource[] | 视频源列表 |
| sourceName | string | 来源爬虫名称 |
| sourceUrl | string | 原始页面地址 |

### VideoSource 类型

| 字段 | 类型 | 说明 |
|------|------|------|
| url | string | 视频文件或播放页地址 |
| quality | string | 画质：`'1080p'` \| `'720p'` \| `'480p'` \| `'360p'` |
| format | string | 封装格式：`'hls'` \| `'dash'` \| `'mp4'` |
| headers | object? | 自定义 HTTP 请求头 |

### 错误响应

```json
// 400 — 缺少参数
{ "error": "query parameter \"q\" is required" }

// 500 — 服务器内部错误
{ "error": "internal server error" }
```

### 中文搜索示例

```bash
curl "http://localhost:3000/api/search?q=%E7%94%B5%E5%BD%B1"
```

中文搜索正常返回结果，不会报错。

### 前端调用

```typescript
import { api } from '../services/api';

const results = await api.search('test');
console.log(results); // SearchResult[]
```

---

## GET /api/detail

获取指定视频的详细信息和可用视频源。

### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| url | string | 是 | 视频在源站的页面 URL（需 URL 编码） |
| spider | string | 是 | 爬虫名称（从 health 接口获取） |

### 请求示例

```bash
curl "http://localhost:3000/api/detail?url=https://archive.org/details/example&spider=internet-archive"
```

### 响应示例

```json
{
  "result": {
    "title": "Duck and Cover",
    "year": 1951,
    "type": "movie",
    "poster": "https://archive.org/services/img/example",
    "description": "A classic educational film.",
    "sourceName": "internet-archive",
    "sourceUrl": "https://archive.org/details/example",
    "sources": [
      {
        "url": "https://archive.org/download/example/example.mp4",
        "quality": "720p",
        "format": "mp4"
      }
    ]
  }
}
```

### 错误响应

```json
// 400 — 缺少参数
{ "error": "\"url\" and \"spider\" query parameters are required" }

// 404 — 爬虫不存在
{ "error": "spider \"nonexistent\" not found" }

// 404 — 视频未找到
{ "error": "not found" }

// 500 — 服务器内部错误
{ "error": "internal server error" }
```

### 前端调用

```typescript
const detail = await api.getDetail(
  'https://archive.org/details/example',
  'internet-archive'
);
console.log(detail); // SearchResult | null
```
