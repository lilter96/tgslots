import { escapeHtml } from './format.js'

export interface PageProps {
  title: string
  styles: string
  apexBundle: string
  clientScript: string
  reportJson: string
  toc: string
  body: string
}

export function renderPage(props: PageProps): string {
  return `<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(props.title)}</title>
    <style>${props.styles}</style>
  </head>
  <body>
    <div class="layout">
      ${props.toc}
      <main class="content">
        ${props.body}
      </main>
    </div>
    <script type="application/json" id="report-data">${props.reportJson}</script>
    <script>${props.apexBundle}</script>
    <script>${props.clientScript}</script>
  </body>
</html>`
}
