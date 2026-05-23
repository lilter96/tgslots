import { describe, expect, it } from 'bun:test'

import { renderPage } from '../visualizer/template.js'

describe('renderPage', () => {
  it('renders complete HTML document', () => {
    const html = renderPage({
      title: 'Test Report',
      styles: 'body { color: red; }',
      apexBundle: 'var apex = {};',
      clientScript: 'console.log("hi");',
      reportJson: '{"key":"value"}',
      toc: '<nav>TOC</nav>',
      body: '<main>Body</main>',
    })

    expect(html).toContain('<!doctype html>')
    expect(html).toContain('<html lang="en" data-theme="dark">')
    expect(html).toContain('<title>Test Report</title>')
    expect(html).toContain('<style>body { color: red; }</style>')
    expect(html).toContain('var apex = {};')
    expect(html).toContain('console.log("hi");')
    expect(html).toContain('{"key":"value"}')
    expect(html).toContain('<nav>TOC</nav>')
    expect(html).toContain('<main>Body</main>')
  })

  it('escapes HTML in title', () => {
    const html = renderPage({
      title: '<script>alert("xss")</script>',
      styles: '',
      apexBundle: '',
      clientScript: '',
      reportJson: '{}',
      toc: '',
      body: '',
    })

    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>alert')
  })

  it('includes report data as JSON script', () => {
    const html = renderPage({
      title: 'Test',
      styles: '',
      apexBundle: '',
      clientScript: '',
      reportJson: '{"a":1}',
      toc: '',
      body: '',
    })

    expect(html).toContain('application/json')
    expect(html).toContain('report-data')
    expect(html).toContain('{"a":1}')
  })
})
