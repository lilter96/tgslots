export const STYLES = `
:root {
  color-scheme: dark light;
  --bg: #0b1020;
  --bg-grad-1: rgba(99, 102, 241, 0.16);
  --bg-grad-2: rgba(217, 70, 239, 0.12);
  --panel: rgba(22, 28, 51, 0.78);
  --panel-strong: rgba(30, 38, 68, 0.92);
  --line: rgba(148, 163, 184, 0.12);
  --line-strong: rgba(148, 163, 184, 0.22);
  --ink: #e2e8f0;
  --ink-strong: #f8fafc;
  --muted: #94a3b8;
  --muted-soft: #64748b;
  --accent-1: #818cf8;
  --accent-2: #c084fc;
  --accent-3: #f0abfc;
  --pass: #34d399;
  --pass-soft: rgba(52, 211, 153, 0.18);
  --fail: #fb7185;
  --fail-soft: rgba(251, 113, 133, 0.18);
  --info: #fbbf24;
  --info-soft: rgba(251, 191, 36, 0.16);
  --shadow: 0 30px 60px -30px rgba(2, 6, 23, 0.85);
  --radius-lg: 18px;
  --radius-md: 12px;
  --radius-sm: 8px;
  --radius-pill: 999px;
}

[data-theme='light'] {
  color-scheme: light;
  --bg: #f6f7fb;
  --bg-grad-1: rgba(99, 102, 241, 0.10);
  --bg-grad-2: rgba(217, 70, 239, 0.08);
  --panel: rgba(255, 255, 255, 0.85);
  --panel-strong: rgba(255, 255, 255, 0.96);
  --line: rgba(15, 23, 42, 0.08);
  --line-strong: rgba(15, 23, 42, 0.14);
  --ink: #1e293b;
  --ink-strong: #0f172a;
  --muted: #64748b;
  --muted-soft: #94a3b8;
  --accent-1: #6366f1;
  --accent-2: #a855f7;
  --accent-3: #d946ef;
  --pass: #059669;
  --pass-soft: rgba(5, 150, 105, 0.14);
  --fail: #e11d48;
  --fail-soft: rgba(225, 29, 72, 0.12);
  --info: #b45309;
  --info-soft: rgba(180, 83, 9, 0.12);
  --shadow: 0 25px 50px -28px rgba(15, 23, 42, 0.35);
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  font-feature-settings: 'cv11', 'ss01';
  font-variant-numeric: tabular-nums;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

body {
  min-height: 100vh;
  background-image:
    radial-gradient(circle at 12% -10%, var(--bg-grad-1), transparent 45%),
    radial-gradient(circle at 88% 0%, var(--bg-grad-2), transparent 45%),
    radial-gradient(circle at 50% 110%, rgba(56, 189, 248, 0.10), transparent 50%);
}

a { color: var(--accent-1); text-decoration: none; }
a:hover { text-decoration: underline; }

.layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 32px;
  max-width: 1440px;
  margin: 0 auto;
  padding: 32px 28px 72px;
}

.toc {
  position: sticky;
  top: 24px;
  align-self: start;
  display: grid;
  gap: 4px;
  padding: 18px 16px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  backdrop-filter: blur(14px);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
}
.toc h4 {
  margin: 0 0 8px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}
.toc a {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  color: var(--muted);
  font-size: 0.85rem;
  font-weight: 500;
  transition: background 200ms ease, color 200ms ease;
  text-decoration: none;
}
.toc a:hover { background: var(--line); color: var(--ink-strong); }
.toc a.active {
  background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
  color: white;
  box-shadow: 0 8px 18px -10px var(--accent-2);
}
.toc a.depth-1 { padding-left: 22px; font-size: 0.8rem; }
.toc a.depth-2 { padding-left: 34px; font-size: 0.78rem; }

.content {
  display: grid;
  gap: 24px;
}

.hero {
  display: grid;
  gap: 16px;
  padding: 28px 32px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(192, 132, 252, 0.10));
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  position: relative;
  overflow: hidden;
}
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 0% 0%, rgba(129, 140, 248, 0.30), transparent 50%);
  pointer-events: none;
}
.hero-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  position: relative;
}
.hero-eyebrow {
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
.hero h1 {
  margin: 6px 0 4px;
  font-size: clamp(2rem, 4.4vw, 3.2rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  background: linear-gradient(120deg, var(--ink-strong), var(--accent-3));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.hero-meta {
  color: var(--muted);
  font-size: 0.92rem;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.hero-meta span strong { color: var(--ink-strong); font-weight: 600; }

.theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--panel-strong);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-pill);
  color: var(--ink);
  font-size: 0.85rem;
  cursor: pointer;
  transition: transform 180ms ease, box-shadow 180ms ease, background 200ms ease;
}
.theme-toggle:hover { transform: translateY(-1px); box-shadow: 0 12px 22px -16px var(--accent-2); }

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 14px;
}
.kpi {
  position: relative;
  padding: 18px 18px 56px;
  border-radius: var(--radius-lg);
  background: var(--panel);
  border: 1px solid var(--line);
  box-shadow: var(--shadow);
  overflow: hidden;
  isolation: isolate;
}
.kpi::after {
  content: '';
  position: absolute;
  inset: auto -10% -30% -10%;
  height: 80%;
  background: radial-gradient(circle at 50% 100%, var(--kpi-glow, rgba(129, 140, 248, 0.30)), transparent 70%);
  z-index: -1;
}
.kpi .kpi-label {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}
.kpi .kpi-value {
  margin-top: 6px;
  font-size: clamp(1.5rem, 2.2vw, 2rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ink-strong);
}
.kpi .kpi-suffix { font-size: 0.85em; color: var(--muted); margin-left: 4px; }
.kpi .kpi-spark { position: absolute; left: 0; right: 0; bottom: 0; height: 56px; }

.section {
  padding: 22px 24px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  display: grid;
  gap: 16px;
}
.section header { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.section h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ink-strong);
}
.section h2 small { color: var(--muted); font-weight: 500; font-size: 0.85rem; margin-left: 8px; }
.section .lead { color: var(--muted); font-size: 0.9rem; margin: 0; }

.split { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
@media (max-width: 900px) { .split { grid-template-columns: 1fr; } }

.comparison-group { display: grid; gap: 10px; }
.comparison-group h3 {
  margin: 4px 0 0;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}

.comparison {
  display: grid;
  grid-template-columns: minmax(180px, 1.4fr) minmax(220px, 2fr) minmax(120px, auto);
  gap: 18px;
  align-items: center;
  padding: 14px 16px;
  background: var(--panel-strong);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  transition: transform 220ms ease, border-color 220ms ease;
}
.comparison:hover { transform: translateX(2px); border-color: var(--line-strong); }

.comparison .meta { display: grid; gap: 4px; }
.comparison .meta .label { font-weight: 600; color: var(--ink-strong); }
.comparison .meta .desc { color: var(--muted); font-size: 0.8rem; }

.comparison .band {
  position: relative;
  height: 10px;
  border-radius: var(--radius-pill);
  background: linear-gradient(90deg,
    rgba(251, 113, 133, 0.22) 0%,
    rgba(251, 113, 133, 0.22) var(--lo, 25%),
    var(--pass-soft) var(--lo, 25%),
    var(--pass-soft) var(--hi, 75%),
    rgba(251, 113, 133, 0.22) var(--hi, 75%),
    rgba(251, 113, 133, 0.22) 100%);
  overflow: visible;
}
.comparison .band .target {
  position: absolute;
  top: -4px;
  bottom: -4px;
  left: 50%;
  width: 2px;
  background: var(--ink);
  transform: translateX(-1px);
  opacity: 0.6;
}
.comparison .band .actual {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-1);
  border: 2px solid var(--bg);
  box-shadow: 0 0 0 2px var(--accent-1), 0 0 12px var(--accent-1);
  transform: translate(-50%, -50%) scale(0);
  left: 50%;
  transition: left 800ms cubic-bezier(0.22, 1, 0.36, 1) 80ms, transform 600ms cubic-bezier(0.22, 1.4, 0.36, 1) 200ms, background 200ms ease;
}
.comparison.in-view .band .actual { transform: translate(-50%, -50%) scale(1); left: var(--actual-left, 50%); }
.comparison.fail .band .actual { background: var(--fail); box-shadow: 0 0 0 2px var(--fail), 0 0 14px var(--fail); }
.comparison.info .band .actual { background: var(--info); box-shadow: 0 0 0 2px var(--info), 0 0 14px var(--info); }

.comparison .stats { display: grid; gap: 4px; text-align: right; font-size: 0.85rem; }
.comparison .stats .delta { font-weight: 600; }
.comparison .stats .source { color: var(--muted-soft); font-size: 0.72rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }

.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.pill.pass { background: var(--pass-soft); color: var(--pass); }
.pill.fail { background: var(--fail-soft); color: var(--fail); }
.pill.info { background: var(--info-soft); color: var(--info); }
.pill::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 6px currentColor;
}

.scope {
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--panel);
  box-shadow: var(--shadow);
  overflow: hidden;
}
.scope summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 22px;
  font-weight: 600;
  color: var(--ink-strong);
  transition: background 200ms ease;
  gap: 12px;
}
.scope summary::-webkit-details-marker { display: none; }
.scope summary:hover { background: var(--line); }
.scope summary .badge {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.scope summary .chevron {
  display: inline-flex;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--line);
  align-items: center;
  justify-content: center;
  transition: transform 250ms cubic-bezier(0.22, 1, 0.36, 1);
}
.scope[open] summary .chevron { transform: rotate(90deg); }
.scope summary .chevron::after { content: '›'; font-size: 1.1rem; color: var(--ink-strong); }

.scope .scope-body { padding: 4px 22px 22px; display: grid; gap: 14px; }
.scope-path { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.72rem; color: var(--muted-soft); }

.metric {
  display: grid;
  grid-template-columns: minmax(160px, 220px) minmax(0, 1fr);
  gap: 18px;
  align-items: center;
  padding: 14px 16px;
  background: var(--panel-strong);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  transition: border-color 200ms ease, transform 200ms ease;
}
.metric:hover { border-color: var(--line-strong); transform: translateX(2px); }
.metric .metric-meta { display: grid; gap: 4px; }
.metric .metric-name { font-weight: 600; color: var(--ink-strong); display: flex; align-items: center; gap: 8px; }
.metric .metric-desc { font-size: 0.8rem; color: var(--muted); }
.metric .kind-chip {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  background: var(--line);
  color: var(--muted);
}
.metric .kind-chip.kind-rtp { background: rgba(129, 140, 248, 0.18); color: var(--accent-1); }
.metric .kind-chip.kind-payout { background: rgba(244, 114, 182, 0.18); color: #f472b6; }
.metric .kind-chip.kind-count { background: rgba(56, 189, 248, 0.18); color: #38bdf8; }
.metric .kind-chip.kind-value { background: rgba(251, 191, 36, 0.18); color: var(--info); }
.metric .kind-chip.kind-distribution { background: rgba(192, 132, 252, 0.18); color: var(--accent-2); }

.metric .metric-viz { display: grid; gap: 10px; }
.metric .stat-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 22px;
  font-size: 0.82rem;
  color: var(--muted);
}
.metric .stat-row strong {
  display: block;
  color: var(--ink-strong);
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.bar-track {
  position: relative;
  height: 10px;
  border-radius: var(--radius-pill);
  background: var(--line);
  overflow: hidden;
}
.bar-fill {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, var(--accent-1), var(--accent-2), var(--accent-3));
  border-radius: var(--radius-pill);
  transform-origin: left;
  transform: scaleX(0);
  transition: transform 900ms cubic-bezier(0.22, 1, 0.36, 1) 100ms;
}
.metric.in-view .bar-fill,
.in-view .bar-fill { transform: scaleX(var(--bar-scale, 1)); }

.dist-list { display: grid; gap: 6px; }
.dist-row {
  display: grid;
  grid-template-columns: minmax(80px, 110px) minmax(0, 1fr) minmax(120px, auto);
  gap: 10px;
  align-items: center;
  font-size: 0.85rem;
}
.dist-row .label { color: var(--ink); font-weight: 500; }
.dist-row .count { text-align: right; color: var(--muted); font-variant-numeric: tabular-nums; }

.chart { width: 100%; height: 240px; }
.chart-tall { width: 100%; height: 320px; }
.chart-mini { width: 100%; height: 80px; }
.chart-gauge { width: 100%; height: 220px; }

.fade-in {
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 600ms ease, transform 600ms cubic-bezier(0.22, 1, 0.36, 1);
}
.in-view.fade-in,
.fade-in.in-view { opacity: 1; transform: none; }

@media (max-width: 1080px) {
  .layout { grid-template-columns: 1fr; }
  .toc { position: relative; top: 0; max-height: none; }
}
@media (max-width: 720px) {
  .layout { padding: 16px; gap: 16px; }
  .comparison { grid-template-columns: 1fr; }
  .comparison .stats { text-align: left; }
  .metric { grid-template-columns: 1fr; }
  .dist-row { grid-template-columns: minmax(60px, 80px) minmax(0, 1fr) minmax(80px, auto); }
}
`
