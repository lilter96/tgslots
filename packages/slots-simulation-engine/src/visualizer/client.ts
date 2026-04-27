export const CLIENT_SCRIPT = String.raw`
(() => {
  'use strict';
  const root = document.documentElement;
  const STORAGE_KEY = 'tgslots-theme';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') root.dataset.theme = stored;

  const themeBtn = document.querySelector('[data-theme-toggle]');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = root.dataset.theme === 'light' ? 'dark' : 'light';
      const apply = () => {
        root.dataset.theme = next;
        localStorage.setItem(STORAGE_KEY, next);
        document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
      };
      if (document.startViewTransition) document.startViewTransition(apply);
      else apply();
    });
  }

  const dataNode = document.getElementById('report-data');
  if (!dataNode) return;
  const report = JSON.parse(dataNode.textContent || '{}');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 },
  );
  document
    .querySelectorAll('.kpi, .comparison, .metric, .fade-in, .section, .scope')
    .forEach((el) => observer.observe(el));

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  document.querySelectorAll('[data-count-to]').forEach((el) => {
    const target = parseFloat(el.dataset.countTo);
    if (!isFinite(target)) return;
    const decimals = parseInt(el.dataset.countDecimals || '0', 10);
    const suffix = el.dataset.countSuffix || '';
    const prefix = el.dataset.countPrefix || '';
    const duration = 1100;
    const start = performance.now();
    const fmt = (v) => {
      const fixed = decimals > 0 ? v.toFixed(decimals) : Math.round(v).toString();
      const [intPart, frac] = fixed.split('.');
      const grouped = Number(intPart).toLocaleString();
      return prefix + (frac ? grouped + '.' + frac : grouped) + suffix;
    };
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const v = target * easeOutCubic(t);
      el.textContent = fmt(v);
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = fmt(target);
    };
    requestAnimationFrame(tick);
  });

  const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();
  const palette = () => ({
    accent1: css('--accent-1') || '#818cf8',
    accent2: css('--accent-2') || '#c084fc',
    accent3: css('--accent-3') || '#f0abfc',
    pass: css('--pass') || '#34d399',
    fail: css('--fail') || '#fb7185',
    info: css('--info') || '#fbbf24',
    line: css('--line-strong') || 'rgba(148,163,184,0.22)',
    ink: css('--ink') || '#e2e8f0',
    muted: css('--muted') || '#94a3b8',
  });

  const charts = [];
  const register = (chart) => { charts.push(chart); };
  document.addEventListener('themechange', () => {
    const p = palette();
    charts.forEach((c) => {
      if (!c || typeof c.updateOptions !== 'function') return;
      c.updateOptions(
        {
          theme: { mode: root.dataset.theme === 'light' ? 'light' : 'dark' },
          chart: { foreColor: p.ink, background: 'transparent' },
          grid: { borderColor: p.line },
          tooltip: { theme: root.dataset.theme === 'light' ? 'light' : 'dark' },
        },
        false,
        true,
      );
    });
  });

  if (typeof ApexCharts === 'undefined') return;

  const baseOpts = () => {
    const p = palette();
    return {
      chart: {
        background: 'transparent',
        foreColor: p.ink,
        animations: { enabled: true, easing: 'easeinout', speed: 850, animateGradually: { enabled: true, delay: 60 } },
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif',
      },
      grid: { borderColor: p.line, strokeDashArray: 4 },
      theme: { mode: root.dataset.theme === 'light' ? 'light' : 'dark' },
      tooltip: { theme: root.dataset.theme === 'light' ? 'light' : 'dark' },
      colors: [p.accent1, p.accent2, p.accent3, p.pass, p.info, p.fail],
      legend: { labels: { colors: p.ink } },
    };
  };

  function fmtNumber(v) { return Number(v).toLocaleString(undefined, { maximumFractionDigits: 4 }); }
  function fmtPercent(v) { return (v * 100).toFixed(2) + '%'; }

  function mountChart(selector, options) {
    const el = document.querySelector(selector);
    if (!el) return null;
    const chart = new ApexCharts(el, options);
    chart.render();
    register(chart);
    return chart;
  }

  // KPI sparklines
  document.querySelectorAll('[data-spark]').forEach((el) => {
    const series = JSON.parse(el.dataset.spark || '[]');
    const color = el.dataset.sparkColor || palette().accent2;
    const chart = new ApexCharts(el, {
      ...baseOpts(),
      chart: { ...baseOpts().chart, type: 'area', sparkline: { enabled: true }, height: 56 },
      series: [{ data: series }],
      stroke: { curve: 'smooth', width: 2 },
      fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.55, opacityTo: 0.05, stops: [0, 100] } },
      colors: [color],
      tooltip: { enabled: false },
    });
    chart.render();
    register(chart);
  });

  // Round-win histogram
  if (report.summary?.roundWinDistribution?.buckets) {
    const buckets = Object.entries(report.summary.roundWinDistribution.buckets);
    mountChart('[data-chart="round-win-histogram"]', {
      ...baseOpts(),
      chart: { ...baseOpts().chart, type: 'bar', height: 320 },
      series: [{ name: 'Rounds', data: buckets.map(([, v]) => v.count) }],
      xaxis: { categories: buckets.map(([k]) => k), labels: { style: { colors: palette().muted } } },
      yaxis: { labels: { formatter: fmtNumber, style: { colors: palette().muted } } },
      plotOptions: { bar: { borderRadius: 6, columnWidth: '55%', distributed: true } },
      dataLabels: { enabled: false },
      legend: { show: false },
      tooltip: { y: { formatter: (v, opts) => fmtNumber(v) + ' rounds (' + (buckets[opts.dataPointIndex][1].ratio * 100).toFixed(2) + '%)' } },
    });
  }

  // RTP composition donut
  const rtpDonutEl = document.querySelector('[data-chart="rtp-donut"]');
  if (rtpDonutEl) {
    const slices = JSON.parse(rtpDonutEl.dataset.slices || '[]');
    mountChart('[data-chart="rtp-donut"]', {
      ...baseOpts(),
      chart: { ...baseOpts().chart, type: 'donut', height: 320 },
      series: slices.map((s) => s.value),
      labels: slices.map((s) => s.label),
      plotOptions: {
        pie: {
          donut: {
            size: '72%',
            labels: {
              show: true,
              name: { color: palette().muted, fontSize: '0.78rem' },
              value: { color: palette().ink, fontSize: '1.4rem', fontWeight: 700, formatter: fmtPercent },
              total: {
                show: true,
                label: 'Total RTP',
                color: palette().muted,
                fontSize: '0.78rem',
                formatter: () => fmtPercent(slices.reduce((s, x) => s + x.value, 0)),
              },
            },
          },
        },
      },
      stroke: { width: 0 },
      legend: { position: 'bottom', labels: { colors: palette().ink } },
      dataLabels: { enabled: false },
      tooltip: { y: { formatter: fmtPercent } },
    });
  }

  // Spin-type donut
  const spinTypeEl = document.querySelector('[data-chart="spin-type-donut"]');
  if (spinTypeEl) {
    const slices = JSON.parse(spinTypeEl.dataset.slices || '[]');
    mountChart('[data-chart="spin-type-donut"]', {
      ...baseOpts(),
      chart: { ...baseOpts().chart, type: 'donut', height: 320 },
      series: slices.map((s) => s.value),
      labels: slices.map((s) => s.label),
      plotOptions: { pie: { donut: { size: '68%' } } },
      stroke: { width: 0 },
      legend: { position: 'bottom', labels: { colors: palette().ink } },
      dataLabels: { enabled: false, style: { fontWeight: 600 } },
      tooltip: { y: { formatter: (v) => fmtNumber(v) + ' results' } },
    });
  }

  // Per-metric charts in scope tree
  document.querySelectorAll('[data-metric-chart]').forEach((el) => {
    const kind = el.dataset.metricChart;
    const payload = JSON.parse(el.dataset.payload || '{}');

    if (kind === 'distribution') {
      const entries = Object.entries(payload.buckets || {}).sort((a, b) => b[1].count - a[1].count);
      const chart = new ApexCharts(el, {
        ...baseOpts(),
        chart: { ...baseOpts().chart, type: 'bar', height: 220 },
        series: [{ name: 'Count', data: entries.map(([, v]) => v.count) }],
        xaxis: { categories: entries.map(([k]) => k), labels: { style: { colors: palette().muted } } },
        yaxis: { labels: { formatter: fmtNumber, style: { colors: palette().muted } } },
        plotOptions: { bar: { borderRadius: 5, columnWidth: '55%', distributed: true } },
        dataLabels: { enabled: false },
        legend: { show: false },
        tooltip: { y: { formatter: (v, opts) => fmtNumber(v) + ' (' + (entries[opts.dataPointIndex][1].ratio * 100).toFixed(2) + '%)' } },
      });
      chart.render();
      register(chart);
    } else if (kind === 'minmax') {
      const chart = new ApexCharts(el, {
        ...baseOpts(),
        chart: { ...baseOpts().chart, type: 'bar', height: 140, sparkline: { enabled: false } },
        series: [{ name: 'Value', data: [payload.min ?? 0, payload.average ?? 0, payload.max ?? 0] }],
        xaxis: { categories: ['Min', 'Avg', 'Max'], labels: { style: { colors: palette().muted } } },
        yaxis: { labels: { formatter: fmtNumber, style: { colors: palette().muted } } },
        plotOptions: { bar: { borderRadius: 5, columnWidth: '40%', distributed: true } },
        dataLabels: { enabled: true, style: { fontSize: '0.72rem', colors: [palette().ink] }, formatter: fmtNumber, offsetY: -16 },
        legend: { show: false },
      });
      chart.render();
      register(chart);
    } else if (kind === 'bar') {
      const chart = new ApexCharts(el, {
        ...baseOpts(),
        chart: { ...baseOpts().chart, type: 'bar', height: 140 },
        series: [
          { name: 'Average', data: [payload.average ?? 0] },
          { name: 'Total', data: [payload.total ?? 0] },
        ],
        xaxis: { categories: [''], labels: { show: false } },
        yaxis: { labels: { formatter: fmtNumber, style: { colors: palette().muted } } },
        plotOptions: { bar: { borderRadius: 5, columnWidth: '36%', horizontal: false } },
        dataLabels: { enabled: false },
        legend: { position: 'bottom', labels: { colors: palette().ink } },
      });
      chart.render();
      register(chart);
    } else if (kind === 'gauge') {
      const ratio = Math.max(0, Math.min(1, payload.ratio ?? 0))
      const chart = new ApexCharts(el, {
        ...baseOpts(),
        chart: { ...baseOpts().chart, type: 'radialBar', height: 220 },
        series: [Math.min(100, ratio * 100)],
        labels: [payload.label || 'Ratio'],
        plotOptions: {
          radialBar: {
            startAngle: -120,
            endAngle: 120,
            hollow: { size: '62%' },
            track: { background: palette().line, strokeWidth: '92%' },
            dataLabels: {
              name: { color: palette().muted, fontSize: '0.78rem', offsetY: -6 },
              value: {
                color: palette().ink,
                fontSize: '1.4rem',
                fontWeight: 700,
                formatter: () => (ratio * 100).toFixed(2) + '%',
              },
            },
          },
        },
        fill: {
          type: 'gradient',
          gradient: { shade: 'dark', type: 'horizontal', gradientToColors: [palette().accent3], stops: [0, 100] },
        },
        stroke: { lineCap: 'round' },
      });
      chart.render();
      register(chart);
    } else if (kind === 'sparkline') {
      const data = payload.series || [0, 0]
      const chart = new ApexCharts(el, {
        ...baseOpts(),
        chart: { ...baseOpts().chart, type: 'area', height: 80, sparkline: { enabled: true } },
        series: [{ data }],
        stroke: { curve: 'smooth', width: 2 },
        fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.05 } },
      });
      chart.render();
      register(chart);
    }
  });

  // TOC scroll-spy
  const tocLinks = Array.from(document.querySelectorAll('.toc a[data-target]'));
  if (tocLinks.length) {
    const sectionMap = new Map();
    tocLinks.forEach((a) => {
      const target = document.getElementById(a.dataset.target);
      if (target) sectionMap.set(target, a);
    });
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            tocLinks.forEach((l) => l.classList.remove('active'));
            sectionMap.get(e.target)?.classList.add('active');
          }
        });
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
    );
    sectionMap.forEach((_, target) => spy.observe(target));
    tocLinks.forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById(a.dataset.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }
})();
`
