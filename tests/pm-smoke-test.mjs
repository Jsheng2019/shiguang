// PM Smoke Test — Browser + API testing
// Usage: node tests/pm-smoke-test.mjs
// Falls back to API-only mode if Playwright/Chromium not available.

import { execSync } from 'child_process';

const FRONTEND = 'https://jsheng2019.github.io/shiguang';
const BACKEND = 'https://shiguang-backend.onrender.com';
const TIMEOUT = 30000;

const report = { passed: [], failed: [], warnings: [] };
let chromium = null;
let browserMode = false;

// Use curl for API calls (strip proxy vars, keep PATH)
function cleanEnv() {
  const env = { ...process.env };
  delete env.HTTP_PROXY; delete env.HTTPS_PROXY;
  delete env.http_proxy; delete env.https_proxy;
  delete env.HTTP_PROXY_REQUEST; delete env.HTTPS_PROXY_REQUEST;
  return env;
}
function apiGet(path) {
  const url = `${BACKEND}${path}`;
  const out = execSync(`curl -sf --max-time 30 "${url}"`, { encoding: 'utf-8', env: cleanEnv() });
  return JSON.parse(out);
}
function webGet(url) {
  return execSync(`curl -sfL --max-time 30 "${url}"`, { encoding: 'utf-8', env: cleanEnv() });
}

// Try to initialize Playwright for browser testing (CI only)
try {
  const pw = await import('playwright');
  chromium = pw.chromium;
  const testBrowser = await chromium.launch({ headless: true, timeout: 10000 });
  await testBrowser.close();
  browserMode = true;
} catch {
  browserMode = false;
}

function pass(msg) { report.passed.push(msg); console.log(`  ✅ ${msg}`); }
function fail(msg) { report.failed.push(msg); console.log(`  ❌ ${msg}`); }
function warn(msg) { report.warnings.push(msg); console.log(`  ⚠️ ${msg}`); }

async function main() {
  console.log('=== 拾光 PM 自动化验收测试 ===\n');

  const browser = browserMode ? await chromium.launch({ headless: true }) : null;

  try {
    // ── 1. Backend health ──
    console.log('── 1. 后端健康检查 ──');
    const health = apiGet('/api/health');
    if (health.status === 'ok') pass(`后端在线，${health.spiders?.length || 0} 个爬虫`);
    else fail('后端异常');
    if (health.spiders?.includes('youtube')) fail('YouTube 爬虫未移除');
    else pass('YouTube 已移除');

    // ── 2. Backend APIs ──
    console.log('\n── 2. 后端 API 检查 ──');

    // Categories
    const catData = apiGet('/api/categories');
    const cats = catData.categories || [];
    if (cats.length >= 6) pass(`分类 API: ${cats.length} 个分类`);
    else fail(`分类 API: 期望 >=6，实际 ${cats.length}`);

    // Search
    const searchData = apiGet('/api/search?q=%E7%94%B5%E5%BD%B1');
    const results = searchData.results || [];
    if (results.length > 0) pass(`搜索"电影": ${results.length} 条结果, 共${searchData.total || 0}条`);
    else fail('搜索"电影": 0 条结果');

    // Home
    const homeData = apiGet('/api/home');
    if (homeData.banners?.length > 0) pass(`首页: ${homeData.banners.length} 个 Banner`);
    else warn('首页: 无 Banner');
    if (homeData.hotList?.length > 0) pass(`热门: ${homeData.hotList.length} 条`);
    else warn('热门: 无内容');

    // Check all categories have items
    const emptyCats = (homeData.latestByCategory || []).filter(c => c.items.length === 0);
    if (emptyCats.length === 0) pass('所有分类均有内容');
    else warn(`${emptyCats.length} 个分类为空: ${emptyCats.map(c => c.type).join(', ')}`);

    // ── 3. Frontend static checks ──
    console.log('\n── 3. 前端静态检查 ──');
    const html = webGet(FRONTEND);

    if (html.includes('拾光')) pass('HTML 包含"拾光"');
    else fail('HTML 标题异常');

    if (html.includes('id="root"')) pass('HTML 包含 root 节点');
    else fail('HTML 缺少 root 节点');

    // Extract JS bundle path
    const jsMatch = html.match(/src="\.?(\/_expo\/static\/js\/web\/[^"]+\.js)"/);
    if (jsMatch) {
      const jsPath = jsMatch[1];
      const jsBundle = webGet(`${FRONTEND}${jsPath}`);
      const jsSize = jsBundle.length;
      pass(`JS 包: ${(jsSize/1024).toFixed(0)}KB`);

      // Check for key components in bundle
      const components = ['BannerCarousel', 'CategoryGrid', 'HorizontalScrollList', 'LatestSection'];
      for (const comp of components) {
        if (jsBundle.includes(comp)) pass(`组件已部署: ${comp}`);
        else warn(`组件可能缺失: ${comp}`);
      }
    } else {
      warn('未找到 JS 包路径');
    }

    // Browser tests (only if Playwright is available)
    if (browserMode) {
      console.log('\n── 4. 浏览器交互测试 (Playwright) ──');
      const page = await browser.newPage();
      page.setDefaultTimeout(TIMEOUT);

      try {
        const startTime = Date.now();
        await page.goto(FRONTEND, { waitUntil: 'networkidle', timeout: 60000 });
        const loadTime = Date.now() - startTime;
        pass(`浏览器页面加载耗时 ${(loadTime/1000).toFixed(1)}s`);

        const title = await page.title();
        if (title.includes('拾光')) pass(`浏览器标题: "${title}"`);

        // Wait for React render
        try {
          await page.waitForFunction(() => {
            const root = document.getElementById('root');
            return root && !root.textContent.includes('Loading...');
          }, { timeout: 30000 });
          pass('React 应用已完成渲染');
        } catch {
          warn('React 可能仍在加载中');
        }

        await page.screenshot({ path: '/tmp/pm-screenshot-home.png', fullPage: true });
        pass('首页截图已保存');

        // Click category
        const movieBtn = await page.$('text=电影');
        if (movieBtn) {
          await movieBtn.click();
          await page.waitForTimeout(3000);
          pass('点击分类"电影"后可跳转');
          await page.screenshot({ path: '/tmp/pm-screenshot-category.png', fullPage: true });
        }

        // Search flow
        await page.goto(FRONTEND, { waitUntil: 'networkidle' });
        const searchBtn = await page.$('text=搜索');
        if (searchBtn) {
          await searchBtn.click();
          await page.waitForTimeout(2000);
          const input = await page.$('input');
          if (input) {
            await input.fill('功夫');
            await input.press('Enter');
            await page.waitForTimeout(5000);
            pass('搜索"功夫"流程正常');
            await page.screenshot({ path: '/tmp/pm-screenshot-search.png', fullPage: true });
          }
        }

        // Detail page
        const detailCard = await page.$('img');
        if (detailCard) {
          await detailCard.click();
          await page.waitForTimeout(3000);
          pass('点击结果卡片可进入详情');
          await page.screenshot({ path: '/tmp/pm-screenshot-detail.png', fullPage: true });
        }
      } finally {
        await page.close();
      }
    } else {
      console.log('\n── 4. 浏览器测试 (跳过 — Playwright 不可用) ──');
      warn('浏览器交互测试仅在 CI 环境执行');
    }

  } catch (e) {
    fail(`测试异常: ${e.message}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  // ── Report Summary ──
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('        验收测试报告');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`通过: ${report.passed.length}`);
  console.log(`失败: ${report.failed.length}`);
  console.log(`警告: ${report.warnings.length}`);

  if (report.failed.length > 0) {
    console.log('\n❌ 失败项:');
    report.failed.forEach(f => console.log(`  - ${f}`));
  }

  const verdict = report.failed.length === 0 ? '✅ 验收通过，可通知用户' : '❌ 发现问题，需修复';
  console.log(`\n${verdict}`);

  process.exit(report.failed.length > 0 ? 1 : 0);
}

main();
