/**
 * whale 精简：只留鱼的渲染 + 鼠标影响去掉（2026-11-26）
 * 用法：node _whale-slim.mjs <client.js 路径...>
 * 幂等：已改过的文件不会重复改（每处替换前先检查标记）。
 */
import fs from 'node:fs'

const PATCHES = [
  {
    name: 'interactionStrength 默认 0（鼠标不再影响鲸鱼）',
    from: '  interactionStrength: 1,',
    to: '  interactionStrength: 0, /* 2026-11-26 用户：鼠标对鱼的影响不要了 */',
  },
  {
    name: '不再监听 pointermove（顺带省掉每次移动的 getBoundingClientRect）',
    from: '    window.addEventListener("pointermove", this.onPointerMove, { passive: true });',
    to: '    /* 2026-11-26 用户：鼠标对鱼的影响不要了 —— 不监听 pointermove */',
  },
  {
    name: 'glow 全屏模糊默认关闭',
    from: '        this.glowEnabled = true;',
    to: '        this.glowEnabled = false; /* 2026-11-26 只留鱼的渲染：关掉两趟全屏 glow 模糊 */',
  },
  {
    name: '浮尘粒子不再生成',
    from: '    const dust = sampleDust(this.quality === "low" ? 34 : this.quality === "medium" ? 52 : 68);',
    to: '    const dust = []; /* 2026-11-26 只留鱼的渲染：浮尘关掉 */',
  },
  {
    name: '雾层动画关闭（CSS）',
    from: '    filter: blur(48px);\n    will-change: transform;\n  }',
    to: '    filter: blur(48px);\n    will-change: transform;\n    /* 2026-11-26 只留鱼的渲染：雾层关掉 */\n    display: none;\n  }',
  },
]

let failed = false
for (const file of process.argv.slice(2)) {
  const original = fs.readFileSync(file, 'utf8')
  let text = original
  const report = []
  for (const p of PATCHES) {
    if (p.to.includes('2026-11-26') && text.includes(p.to)) {
      report.push(`  = 已打过：${p.name}`)
      continue
    }
    const hits = text.split(p.from).length - 1
    if (hits !== 1) {
      report.push(`  ✗ ${p.name} —— 命中 ${hits} 次（应为 1）`)
      failed = true
      continue
    }
    text = text.replace(p.from, p.to)
    report.push(`  ✓ ${p.name}`)
  }
  if (text !== original) fs.writeFileSync(file, text, 'utf8')
  console.log(`${file}\n${report.join('\n')}\n  ${original.length} → ${text.length} bytes`)
}
process.exit(failed ? 1 : 0)
