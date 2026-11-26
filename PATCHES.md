# 本地改版说明（相对上游 0.3.12）

本仓是 `dsh-plugin-harness-whale` 的**本地精简改版**，不是上游的完整 fork。
基座：上游 v0.3.12（npm 只有 0.2.0，0.3.12 取自 GitHub Releases tarball）。

## 为什么要改

2026-11-26 桌面版（DSH 0.2.2-rc.5）上，壁纸有三个问题，用户逐条拍板：

1. **阴影又回来了** —— 阅读遮罩（scrim）会在正文后面画灰色半透明带 + 整列兜底纱幕。
2. **卡** —— 流式输出时每 400ms 对全文档 `querySelectorAll` 几千个块、滚动时逐块 `getBoundingClientRect()`（同步强制布局）；且常驻 60fps 全屏 WebGL + 两趟全屏 glow 模糊。
3. **鼠标联动多余** —— 鼠标移动会牵动鲸鱼/点云。

用户原话：「我不是说了那个阴影不要了吗」「削到只有动图吧」「只留那个鱼的渲染」「鼠标对鱼运动的影响可以不要了」。

## 改了什么（全部在 `lib/client.js`）

| # | 位置 | 改法 | 目的 |
|---|---|---|---|
| 1 | `BLOCK_SELECTORS` | `[data-hww-zone-probe]`（永不命中） | 文本块测量整块停摆 → 遮罩带一条不画，滚动/流式零强制布局 |
| 2 | 列兜底规则 `:not([data-hww-zones="on"])` | `background: transparent` | 测量失败时不再给整列盖纱幕 |
| 3 | `GLOW_BUDGET_FRAMES` 之后 | 新增 `FRAME_MIN_MS = 1000/30` | 绘制节流到 30fps |
| 4 | 类字段 `lastFrame` 后 | 新增 `lastPaint = 0` | 配合节流 |
| 5 | `tick()` | 绘制前按 `FRAME_MIN_MS * 0.9` 跳过 | 缓动照算，只降绘制频率，GPU 减半 |
| 6 | `DEFAULT_WALLPAPER_CONFIG.interactionStrength` | `1` → `0` | 鼠标不再影响鲸鱼 |
| 7 | `window.addEventListener("pointermove", …)` | 删掉 | 顺带省掉每次移动的 `getBoundingClientRect` |
| 8 | `this.glowEnabled = true;` | `false` | 关掉两趟全屏 glow 模糊（最大的持续 GPU 开销） |
| 9 | `const dust = sampleDust(…)` | `const dust = []` | 浮尘粒子不再生成 |
| 10 | CSS `.dsh-harness-whale-wallpaper::before/::after` | 加 `display: none` | 雾层动画关掉 |

改完只剩：底色渐变 + 鲸鱼点云本体（30fps）。即用户要的「纯动图」。

## 生效方式

客户端文件，DSH 按内容 sha1 发 rev，**刷新 GUI（Ctrl+R）即生效，不用重启宿主**。

两份实体必须同步（不是软链接，是两份独立副本）：

```bash
SRC="C:/Users/Evelyn/Documents/deepseek-harness/default-workspace/restored-plugins-ready/dsh-plugin-harness-whale"
DST="C:/Users/Evelyn/AppData/Local/DeepSeekHarness/.dsh/profiles/desktop/node_modules/dsh-plugin-harness-whale"
cp "$SRC/lib/client.js" "$DST/lib/client.js"
node --check "$DST/lib/client.js"
sha1sum "$SRC/lib/client.js" "$DST/lib/client.js"   # 必须一致
```

## 升级上游后怎么重打

```bash
node tools/slim.mjs <client.js 路径...>   # 幂等，已打过的会跳过
node --check <client.js 路径>
```

`tools/slim.mjs` 里 5 条替换规则覆盖上表 6~10；表中 1~5（阴影与节流）需要人工核对，
因为上游若重构了 `BLOCK_SELECTORS` / `tick()` 结构，字面匹配会失配（脚本会报「命中 0 次」而不是静默失败）。

## 已知取舍

- 正文直接压在点云上，**没有任何遮罩**。若深色壁纸下正文发灰、影响阅读，
  单个旋钮是把 `--hww-reading-scrim` 的 alpha 加回很淡的一层（不必恢复灰带测量）。
- `window.__harnessWhale.check()` 会报 frame 相关 problem（上游 0.3.12 的 `FRAME_SELECTOR`
  `#root > [data-slot="root"] > *` 在 0.2.2-rc.5 上匹配 0 个元素，属上游兼容残留），与本次改动无关。

## 回滚

上游原版：`lib/client.js.bak-perf-20261126-173448`（0.3.12 未打性能补丁）
