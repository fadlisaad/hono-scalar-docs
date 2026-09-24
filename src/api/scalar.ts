import { Context } from 'hono'
import { html } from 'hono/html'
import logo from '../assets/logo.png?inline'

// Pinned so the option names below can't drift with a new Scalar release
const SCALAR_CDN = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.71.0'

const config = {
  spec: { url: '/openapi.json' },
  theme: 'purple',
  layout: 'modern',
  favicon: logo,
  showDeveloperTools: 'never',
  mcp: { disabled: true }, // "Generate MCP" / "Connect MCP"
  agent: { disabled: true }, // "Ask AI"
  // ponytail: no config flag exists for the sidebar footer credit, so hide it with CSS
  customCss: `a[href="https://www.scalar.com"] { display: none !important; }`
}

export const scalarReference = (c: Context) =>
  c.html(html`<!doctype html>
<html lang="en">
  <head>
    <title>NexGen API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/png" href="${logo}" />
  </head>
  <body>
    <script id="api-reference" type="application/json" data-configuration="${JSON.stringify(config)}"></script>
    <script src="${SCALAR_CDN}"></script>
  </body>
</html>`)
