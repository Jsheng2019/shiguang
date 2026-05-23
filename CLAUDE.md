# CLAUDE.md

拾光 — 跨平台免费视频聚合应用 (Expo React Native + Express 后端)

## 项目概述

- **前端** (`app/`): Expo SDK 52, React Navigation 7, expo-av, 暗色主题
- **后端** (`backend/`): Express 5 + TypeScript, 爬虫架构聚合网络视频源
- **部署**: GitHub Pages (前端) / 自建服务器 (后端可选)
- **站点**: https://jsheng2019.github.io/shiguang/

## 常用命令

```bash
# 前端
cd app
npm install
npx tsc --noEmit        # 类型检查
npx expo export --platform web  # 构建 Web 版本

# 后端
cd backend
npm install
npm run build           # tsc 编译
npm start               # 启动服务
```

## 产品经理 Agent

项目有专属 PM agent (`.claude/agents/pm-qa.md`)。每次 CI 部署后：

1. CI 自动运行 smoke test（页面加载、JS bundle、demo 数据）
2. **必须手动触发 PM agent** 进行深度体验验证

调用方式：`pm-qa，去体验一下最新版本`

## Demo 模式

没有后端时，前端自动使用内置 demo 数据（12 部经典影视作品）。`app/services/api.ts` 中的 `ApiClient` 先尝试请求后端 API，失败则降级到 `demoBackend`。

## CI/CD

`.github/workflows/ci.yml`:
- `backend`: tsc + build
- `frontend`: tsc + expo export + 修复相对路径
- `deploy-web`: 部署到 gh-pages
- `smoke-test`: 自动化验收（页面加载、JS bundle、demo 数据）
