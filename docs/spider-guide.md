# 爬虫开发指南

## Spider 接口

所有爬虫必须实现 `Spider` 接口，定义在 `backend/src/spiders/base.ts`：

```typescript
interface Spider {
  name: string;
  search(query: string): Promise<SearchResult[]>;
  getDetail(url: string): Promise<SearchResult | null>;
}
```

### 接口方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `name` | — | string | 爬虫的唯一标识名，用于路由和注册 |
| `search` | query: string | `SearchResult[]` | 搜索视频，返回结果数组 |
| `getDetail` | url: string | `SearchResult \| null` | 获取视频详情，未找到返回 null |

### SearchResult 类型

```typescript
interface SearchResult {
  title: string;
  year?: number;
  type: 'movie' | 'series' | 'documentary';
  country?: string;
  poster?: string;
  rating?: number;
  description?: string;
  sources: VideoSource[];
  sourceName: string;   // 自动设置，与爬虫 name 一致
  sourceUrl: string;    // 源站原始页面链接
}
```

### VideoSource 类型

```typescript
interface VideoSource {
  url: string;
  quality: '1080p' | '720p' | '480p' | '360p';
  format: 'hls' | 'dash' | 'mp4';
  headers?: Record<string, string>;
}
```

## 如何实现一个新爬虫

### 第一步：创建爬虫文件

在 `backend/src/spiders/` 下新建文件，例如 `my-spider.ts`。

### 第二步：实现 Spider 接口

```typescript
import axios from 'axios';
import type { SearchResult, Spider, VideoSource } from './base.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export class MySpider implements Spider {
  name = 'my-spider';

  async search(query: string): Promise<SearchResult[]> {
    try {
      const resp = await axios.get('https://example.com/search', {
        params: { q: query },
        headers: { 'User-Agent': UA },
        timeout: 10000,
      });

      // 解析响应，构建 SearchResult 数组
      return resp.data.results.map((item: any) => ({
        title: item.title,
        year: item.year,
        type: 'movie',
        poster: item.thumbnail,
        sourceName: this.name,
        sourceUrl: item.url,
        sources: [{
          url: item.videoUrl,
          quality: '720p' as const,
          format: 'mp4' as const,
        }],
      }));
    } catch (err) {
      console.warn(`[${this.name}] search failed:`, err instanceof Error ? err.message : err);
      return []; // 失败返回空数组，不影响其他爬虫
    }
  }

  async getDetail(url: string): Promise<SearchResult | null> {
    try {
      const resp = await axios.get(url, {
        headers: { 'User-Agent': UA },
        timeout: 10000,
      });

      // 解析详情页，返回更完整的 SearchResult
      return {
        title: resp.data.title,
        year: 2024,
        type: 'movie',
        poster: resp.data.thumbnail,
        description: resp.data.description,
        sourceName: this.name,
        sourceUrl: url,
        sources: [{
          url: resp.data.videoUrl,
          quality: '720p',
          format: 'mp4',
        }],
      };
    } catch (err) {
      console.warn(`[${this.name}] getDetail failed:`, err instanceof Error ? err.message : err);
      return null;
    }
  }
}
```

### 第三步：在 Registry 中注册

编辑 `backend/src/spiders/registry.ts`，导入并注册新爬虫：

```typescript
import { MySpider } from './my-spider.js';

export class SpiderRegistry {
  private spiders: Map<string, Spider> = new Map();

  constructor() {
    this.register(new ExampleSpider());
    this.register(new InternetArchiveSpider());
    this.register(new VimeoFreeSpider());
    this.register(new YouTubeSpider());
    this.register(new MySpider());  // 添加这一行
  }
  // ...
}
```

注册后，新爬虫会自动出现在 `GET /api/health` 的 `spiders` 列表中，并参与 `GET /api/search` 的聚合搜索。

## 已有爬虫列表

| 爬虫名称 | 类名 | 数据源 | 说明 |
|----------|------|--------|------|
| `example` | ExampleSpider | 本地模拟数据 | 返回固定示例数据，用于开发和测试 |
| `internet-archive` | InternetArchiveSpider | archive.org | 搜索 Internet Archive 公共领域电影，使用官方 JSON API |
| `vimeo-free` | VimeoFreeSpider | vimeo.com | 先尝试搜索 Vimeo 页面，失败后回退到预置的优质免费影片列表 |
| `youtube` | YouTubeSpider | youtube.com | 抓取 YouTube 搜索结果页的 `ytInitialData` JSON，无需 API Key |

## 开发注意事项

### 错误处理

- `search()` 失败时**必须返回空数组 `[]`**，不要抛异常。这样通过 `Promise.allSettled` 并发调用时，一个爬虫的失败不会影响其他爬虫。
- `getDetail()` 失败时返回 `null`，调用方会返回 404。
- 使用 `console.warn` 记录失败原因，方便调试。

### 超时设置

所有 HTTP 请求必须设置 `timeout`，推荐值：
- 搜索请求：10 秒
- 详情请求：10 秒
- oEmbed/元数据请求：5 秒

### User-Agent

设置合理的 User-Agent 有助于绕过简单的反爬机制：

```typescript
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
```

### Promise.allSettled 容错

`SpiderRegistry.searchAll()` 使用 `Promise.allSettled` 而不是 `Promise.all`，确保单个爬虫超时或报错时，其他爬虫的结果不受影响：

```typescript
async searchAll(query: string): Promise<SearchResult[]> {
  const results = await Promise.allSettled(
    this.getAll().map((spider) => spider.search(query)),
  );

  const items: SearchResult[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      items.push(...result.value);
    }
    // 失败自动忽略
  }

  return items;
}
```

### 响应解析技巧

- **YouTube**: 搜索页 HTML 嵌入 `ytInitialData` JSON 对象，用正则提取后解析。
- **Vimeo**: 搜索页使用 Nuxt.js 渲染，`__NUXT__` 状态结构不稳定；当前实现优先尝试页面抓取，失败后回退到预置高质量影片列表 + oEmbed 元数据。
- **Internet Archive**: 使用官方 `advancedsearch.php` JSON API，返回结构化数据。
- **oEmbed**: YouTube 和 Vimeo 都支持 oEmbed 协议，可用于获取标题、缩略图等元数据，无需复杂解析。
