import { FC } from 'hono/jsx'
import { raw } from 'hono/html'
import { Layout } from './layout'

type Method = 'GET' | 'POST' | 'PUT'

const endpointGroups: { title: string; href: string; endpoints: [Method, string][] }[] = [
  {
    title: 'Collection Payment',
    href: '/docs/api/collection-payment',
    endpoints: [
      ['POST', '/collection/create'],
      ['GET', '/collection/get/list'],
      ['GET', '/collection/get/data/{collection_code}'],
      ['GET', '/collection/get/data/{collection_code}/billing'],
      ['PUT', '/collection/switch/status/data/{collection_code}'],
      ['POST', '/billing/create/{collection_code}'],
      ['GET', '/billing/get/data/{collection_code}/{bill_code}']
    ]
  },
  {
    title: 'QR Payment',
    href: '/docs/api/qr-payment',
    endpoints: [
      ['POST', '/terminal/create'],
      ['GET', '/terminal/get/list'],
      ['GET', '/terminal/get/data/{terminal_code}'],
      ['GET', '/terminal/get/data/{terminal_code}/billing'],
      ['PUT', '/terminal/switch/status/data/{terminal_code}'],
      ['POST', '/qr/create/{terminal_code}'],
      ['GET', '/qr/get/data/{terminal_code}/{qr_code}'],
      ['POST', '/qr/maybank/create/{terminal_code}'],
      ['GET', '/qr/maybank/status/{transaction_ref_id}']
    ]
  }
]

const steps = [
  { title: 'Create a collection', body: 'Once, through the API or your dashboard. It groups related bills.', code: 'POST /collection/create' },
  { title: 'Create a bill', body: 'Your server creates a bill when the customer checks out.', code: 'POST /billing/create/{code}' },
  { title: 'Redirect to pay', body: 'Send the customer to the payment_url in the response.', code: '302 → payment_url' },
  { title: 'Receive the callback', body: 'NexGen posts the payment result to your server.', code: 'POST callback_url' }
]

// Lucide icons (ISC licence), 24px grid, 2px stroke
const icon = (paths: string, cls = 'lp-icon') =>
  raw(`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`)
const icons = {
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>',
  qr: '<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>',
  webhook: '<path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2"/><path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06"/><path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>'
}

const products = [
  { icon: icons.receipt, title: 'Collection Payment', body: 'Group bills into collections and send customers to a hosted payment page.', href: '/docs/api/collection-payment' },
  { icon: icons.qr, title: 'QR Payment', body: 'Register terminals and generate a unique QR code for every transaction, including Maybank QR.', href: '/docs/api/qr-payment' },
  { icon: icons.webhook, title: 'Callbacks & Redirects', body: 'Receive payment results on your server and bring customers back to your site.', href: '/docs/api/callbacks-and-redirects' }
]

// Hand-highlighted samples: k = key/keyword, s = string, n = number, c = comment
const samples = [
  {
    id: 'bill',
    label: 'Create a bill',
    request: `<span class="k">curl</span> -X POST <span class="s">"https://nexgen.example.com/api/v1/billing/create/RLVCQOIA0001?ApiSecret=$SECRET"</span> \\
  -H <span class="s">"ApiKey: $API_KEY"</span> \\
  -F fieldName=<span class="s">"Aisyah Rahman"</span> \\
  -F fieldEmail=<span class="s">"aisyah@example.com"</span> \\
  -F fieldPhone=<span class="n">60123456789</span> \\
  -F fieldAmount=<span class="n">10.00</span> \\
  -F fieldPaymentDescription=<span class="s">"Membership 2026"</span> \\
  -F fieldCallbackUrl=<span class="s">"https://example.com/callback"</span>`,
    response: `<span class="c">// 201 Created</span>
{
  <span class="k">"code"</span>: <span class="s">"RLVBEVN241004A9YU1"</span>,
  <span class="k">"status"</span>: <span class="s">"unpaid"</span>,
  <span class="k">"amount"</span>: <span class="s">"10.00"</span>,
  <span class="k">"payment_url"</span>: <span class="s">"https://nexgen.example.com/p/b/RLVBEVN241004A9YU1/1"</span>
}`
  },
  {
    id: 'qr',
    label: 'Create a QR',
    request: `<span class="k">curl</span> -X POST <span class="s">"https://nexgen.example.com/api/v1/qr/create/RLVTBAQA0003?ApiSecret=$SECRET"</span> \\
  -H <span class="s">"ApiKey: $API_KEY"</span> \\
  -F fieldAmount=<span class="n">1.00</span> \\
  -F fieldPaymentDescription=<span class="s">"Order #1042"</span> \\
  -F fieldCallbackUrl=<span class="s">"https://example.com/callback"</span>`,
    response: `<span class="c">// 201 Created</span>
{
  <span class="k">"code"</span>: <span class="s">"RLVQSD4241006AZ2O5"</span>,
  <span class="k">"status"</span>: <span class="s">"unpaid"</span>,
  <span class="k">"amount"</span>: <span class="s">"1.00"</span>,
  <span class="k">"qr_code"</span>: <span class="s">"iVBORw0KGgoAAAANSUhEUgAA…"</span> <span class="c">// base64 PNG</span>
}`
  },
  {
    id: 'callback',
    label: 'Handle the callback',
    request: `<span class="c">// Your server: NexGen POSTs the result here</span>
app.<span class="k">post</span>(<span class="s">'/callback'</span>, <span class="k">async</span> (c) => {
  <span class="k">const</span> payment = <span class="k">await</span> c.req.json()
  <span class="k">if</span> (payment.status === <span class="s">'paid'</span>) {
    <span class="k">await</span> markOrderPaid(payment.code)
  }
  <span class="k">return</span> c.text(<span class="s">'OK'</span>)
})`,
    response: `<span class="c">// Payload</span>
{
  <span class="k">"code"</span>: <span class="s">"RLVBEVN241004A9YU1"</span>,
  <span class="k">"status"</span>: <span class="s">"paid"</span>,
  <span class="k">"amount"</span>: <span class="s">"10.00"</span>,
  <span class="k">"payment_description"</span>: <span class="s">"Membership 2026"</span>
}`
  }
]

const styles = `
  :root {
    --lp-cta-bg: var(--accent-text); --lp-cta-fg: #ffffff;
    --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
    --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  }
  [data-theme="dark"] { --lp-cta-bg: var(--accent); --lp-cta-fg: #0b0f19; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) { --lp-cta-bg: var(--accent); --lp-cta-fg: #0b0f19; }
  }

  .lp { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }
  .lp section { padding: 5rem 0; border-top: 1px solid var(--border-color); }
  .lp section.lp-hero { border-top: 0; padding: 5rem 0; }
  .lp h2 { font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 700; letter-spacing: -0.025em; line-height: 1.2; color: var(--text-primary); margin-bottom: 0.625rem; }
  .lp-lead { color: var(--text-secondary); font-size: 1.0625rem; max-width: 60ch; margin-bottom: 2.5rem; }
  .lp-lead code { font-family: var(--font-mono); font-size: 0.875em; background: var(--bg-tertiary); padding: 0.1rem 0.35rem; border-radius: 0.25rem; }
  .lp-icon { width: 20px; height: 20px; flex: none; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .lp a:focus-visible, .lp button:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 0.5rem; }

  /* One-time entrance: seen once per visit, so it can afford a little delight */
  @keyframes lp-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .lp-reveal { animation: lp-rise 500ms var(--ease-out) both; }
  .lp-reveal:nth-child(2) { animation-delay: 60ms; }
  .lp-reveal:nth-child(3) { animation-delay: 120ms; }
  .lp-reveal:nth-child(4) { animation-delay: 180ms; }
  .lp-reveal:nth-child(5) { animation-delay: 240ms; }
  .lp-code.lp-reveal { animation-delay: 200ms; }

  /* Hero */
  .lp-hero { display: grid; grid-template-columns: minmax(0, 1fr); gap: 3rem; align-items: center; }
  @media (min-width: 1024px) { .lp-hero { grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); gap: 4rem; } }
  .lp-eyebrow { display: inline-flex; gap: 0.5rem; align-items: center; font-family: var(--font-mono); font-size: 0.8125rem; color: var(--text-secondary); border: 1px solid var(--border-color); padding: 0.25rem 0.75rem 0.25rem 0.5rem; border-radius: 9999px; margin-bottom: 1.5rem; }
  .lp-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2); }
  .lp-hero h1 { font-size: clamp(2.25rem, 5vw, 3.5rem); font-weight: 800; line-height: 1.08; letter-spacing: -0.04em; color: var(--text-primary); margin-bottom: 1.25rem; text-wrap: balance; }
  .lp-hero h1 span { color: var(--accent-text); }
  .lp-hero p { font-size: 1.125rem; color: var(--text-secondary); max-width: 34rem; margin-bottom: 2rem; text-wrap: pretty; }
  .lp-search { display: flex; align-items: center; gap: 0.75rem; width: 100%; max-width: 30rem; min-height: 48px; padding: 0 0.75rem 0 1rem; margin-bottom: 1rem; font: inherit; font-size: 1rem; color: var(--text-muted); background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 0.625rem; cursor: pointer; text-align: left; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04); transition: border-color 150ms ease, box-shadow 150ms ease, transform 160ms var(--ease-out); }
  .lp-search kbd { margin-left: auto; font-family: var(--font-mono); font-size: 0.75rem; padding: 0.125rem 0.5rem; border: 1px solid var(--border-color); border-radius: 0.375rem; background: var(--bg-tertiary); color: var(--text-secondary); }
  .lp-ctas { display: flex; gap: 0.75rem; flex-wrap: wrap; }
  .lp-btn { display: inline-flex; align-items: center; gap: 0.5rem; min-height: 44px; padding: 0 1.25rem; border-radius: 0.5rem; font-weight: 600; font-size: 0.9375rem; transition: transform 160ms var(--ease-out), background-color 150ms ease, border-color 150ms ease; }
  .lp-btn .lp-icon { width: 16px; height: 16px; transition: transform 200ms var(--ease-out); }
  .lp-btn-primary { background: var(--lp-cta-bg); color: var(--lp-cta-fg); }
  .lp-btn-primary:hover { color: var(--lp-cta-fg); }
  .lp-btn-secondary { color: var(--text-primary); border: 1px solid var(--border-color); background: var(--bg-primary); }
  .lp-btn-secondary:hover { color: var(--text-primary); }
  .lp-btn:active, .lp-search:active, .lp-tab:active, .lp-copy:active { transform: scale(0.97); }

  /* Code window */
  .lp-code { background: var(--code-bg); border: 1px solid rgba(148, 163, 184, 0.18); border-radius: 0.875rem; overflow: hidden; min-width: 0; box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 30px 60px -30px rgba(15, 23, 42, 0.5); }
  .lp-code-bar { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.5rem 0 0.75rem; border-bottom: 1px solid rgba(148, 163, 184, 0.14); }
  .lp-tabs { position: relative; display: flex; gap: 0.25rem; flex: 1; min-width: 0; overflow-x: auto; scrollbar-width: none; }
  .lp-tab { position: relative; min-height: 40px; padding: 0 0.75rem; font: inherit; font-size: 0.8125rem; font-weight: 500; color: #94a3b8; background: none; border: 0; cursor: pointer; white-space: nowrap; transition: color 150ms ease, transform 160ms var(--ease-out); }
  .lp-tab[aria-selected="true"] { color: #f8fafc; }
  /* 1px bar scaled to the active tab's width: transform-only, so it never triggers layout */
  .lp-tab-indicator { position: absolute; left: 0; bottom: 0; width: 1px; height: 2px; background: var(--accent); transform-origin: left; transition: transform 280ms var(--ease-in-out); }
  .lp-copy { display: inline-flex; align-items: center; justify-content: center; position: relative; width: 36px; height: 36px; margin-bottom: 0.25rem; border: 0; border-radius: 0.5rem; color: #94a3b8; background: none; cursor: pointer; transition: color 150ms ease, background-color 150ms ease, transform 160ms var(--ease-out); }
  .lp-copy .lp-icon { position: absolute; width: 16px; height: 16px; transition: opacity 200ms var(--ease-out), transform 200ms var(--ease-out), filter 200ms var(--ease-out); }
  .lp-copy .lp-icon-check { color: #86efac; opacity: 0; transform: scale(0.5); filter: blur(4px); }
  .lp-copy[data-copied] .lp-icon-copy { opacity: 0; transform: scale(0.5); filter: blur(4px); }
  .lp-copy[data-copied] .lp-icon-check { opacity: 1; transform: scale(1); filter: blur(0); }

  /* All panels share one grid cell, so the window keeps the tallest panel's height and never jumps */
  .lp-panels { display: grid; }
  .lp-panel { grid-area: 1 / 1; min-width: 0; transition: opacity 200ms var(--ease-out), transform 200ms var(--ease-out), filter 200ms var(--ease-out), visibility 0s; }
  .lp-panel[hidden] { display: block; visibility: hidden; opacity: 0; transform: translateY(4px); filter: blur(2px); transition: opacity 120ms ease, transform 120ms ease, filter 120ms ease, visibility 0s 120ms; }
  .lp-panel pre { margin: 0; padding: 1.125rem 1.25rem; overflow-x: auto; font-family: var(--font-mono); font-size: 0.8125rem; line-height: 1.75; color: var(--code-text); tab-size: 2; }
  .lp-panel pre + pre { border-top: 1px dashed rgba(148, 163, 184, 0.16); }
  .lp-panel .c { color: #7c8aa0; } .lp-panel .s { color: #86efac; } .lp-panel .k { color: #fdba74; } .lp-panel .n { color: #93c5fd; }

  /* Products */
  .lp-grid { display: grid; gap: 1rem; grid-template-columns: 1fr; }
  @media (min-width: 768px) { .lp-grid { grid-template-columns: repeat(3, 1fr); } }
  .lp-card { position: relative; display: flex; flex-direction: column; gap: 0.75rem; padding: 1.5rem; border: 1px solid var(--border-color); border-radius: 0.875rem; background: var(--bg-secondary); color: var(--text-secondary); transition: border-color 200ms ease, transform 200ms var(--ease-out), box-shadow 200ms ease; }
  .lp-card:active { transform: scale(0.99); }
  .lp-card-icon { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 0.625rem; background: var(--accent-light); color: var(--accent-text); }
  .lp-card h3 { font-size: 1.0625rem; font-weight: 700; color: var(--text-primary); }
  .lp-card p { font-size: 0.9375rem; flex: 1; }
  .lp-more { display: inline-flex; align-items: center; gap: 0.375rem; font-weight: 600; font-size: 0.875rem; color: var(--accent-text); }
  .lp-more .lp-icon { width: 16px; height: 16px; transition: transform 200ms var(--ease-out); }

  /* Hover only where a real pointer exists; taps shouldn't leave cards stuck "lifted" */
  @media (hover: hover) and (pointer: fine) {
    .lp-search:hover { border-color: var(--text-muted); }
    .lp-btn-primary:hover { background: color-mix(in srgb, var(--lp-cta-bg) 88%, var(--lp-cta-fg)); }
    .lp-btn-secondary:hover { border-color: var(--text-muted); }
    .lp-btn:hover .lp-icon, .lp-card:hover .lp-more .lp-icon, .lp-more:hover .lp-icon { transform: translateX(3px); }
    .lp-tab:hover { color: #e2e8f0; }
    .lp-copy:hover { color: #f8fafc; background: rgba(148, 163, 184, 0.12); }
    .lp-card:hover { border-color: color-mix(in srgb, var(--accent) 45%, var(--border-color)); transform: translateY(-2px); box-shadow: 0 12px 24px -16px rgba(15, 23, 42, 0.25); color: var(--text-secondary); }
  }

  /* Steps: numbered timeline */
  .lp-steps { list-style: none; display: grid; gap: 2rem; grid-template-columns: 1fr; counter-reset: step; }
  @media (min-width: 768px) { .lp-steps { grid-template-columns: repeat(4, 1fr); gap: 1.5rem; } }
  .lp-steps li { counter-increment: step; position: relative; padding-left: 3rem; }
  @media (min-width: 768px) { .lp-steps li { padding-left: 0; padding-top: 3.25rem; } }
  .lp-steps li::before { content: counter(step); position: absolute; left: 0; top: 0; display: grid; place-items: center; width: 2rem; height: 2rem; border-radius: 50%; font-family: var(--font-mono); font-size: 0.8125rem; font-weight: 600; color: var(--accent-text); background: var(--bg-primary); border: 1px solid var(--border-color); z-index: 1; }
  .lp-steps li:not(:last-child)::after { content: ""; position: absolute; left: 1rem; top: 2rem; bottom: -2rem; width: 1px; background: var(--border-color); }
  @media (min-width: 768px) { .lp-steps li:not(:last-child)::after { left: 2rem; right: -1.5rem; top: 1rem; bottom: auto; width: auto; height: 1px; } }
  .lp-steps h3 { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.375rem; }
  .lp-steps p { font-size: 0.9375rem; color: var(--text-secondary); margin-bottom: 0.75rem; }
  .lp-steps code { font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-secondary); background: var(--bg-tertiary); padding: 0.125rem 0.375rem; border-radius: 0.25rem; }

  /* Endpoints */
  .lp-endpoints { display: grid; gap: 2rem; grid-template-columns: minmax(0, 1fr); }
  @media (min-width: 1024px) { .lp-endpoints { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } }
  .lp-endpoints h3 { display: flex; justify-content: space-between; align-items: baseline; font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.75rem; }
  .lp-endpoints ul { list-style: none; border: 1px solid var(--border-color); border-radius: 0.875rem; overflow: hidden; }
  .lp-endpoints li { display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 1rem; border-top: 1px solid var(--border-color); font-family: var(--font-mono); font-size: 0.8125rem; color: var(--text-primary); }
  .lp-endpoints li:first-child { border-top: 0; }
  .lp-endpoints li span:last-child { min-width: 0; overflow-wrap: anywhere; }
  .lp-method { flex: none; width: 3.25rem; text-align: center; font-size: 0.6875rem; font-weight: 700; padding: 0.125rem 0; border-radius: 0.25rem; }
  .lp-method-GET { color: #1d4ed8; background: #dbeafe; }
  .lp-method-POST { color: #15803d; background: #dcfce7; }
  .lp-method-PUT { color: #b45309; background: #fef3c7; }
  [data-theme="dark"] .lp-method-GET { color: #93c5fd; background: #1e3a5f; }
  [data-theme="dark"] .lp-method-POST { color: #86efac; background: #14391f; }
  [data-theme="dark"] .lp-method-PUT { color: #fcd34d; background: #422a06; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) .lp-method-GET { color: #93c5fd; background: #1e3a5f; }
    :root:not([data-theme="light"]) .lp-method-POST { color: #86efac; background: #14391f; }
    :root:not([data-theme="light"]) .lp-method-PUT { color: #fcd34d; background: #422a06; }
  }
  .lp-base { font-family: var(--font-mono); font-size: 0.8125rem; color: var(--text-muted); margin-top: 1.5rem; }

  /* Reduced motion: keep fades that aid comprehension, drop movement */
  @media (prefers-reduced-motion: reduce) {
    @keyframes lp-rise { from { opacity: 0; } to { opacity: 1; } }
    .lp *:not(.lp-tab-indicator), .lp *::before, .lp *::after { transform: none !important; filter: none !important; }
    .lp-tab-indicator { transition: none; }
  }
`

const script = `
(() => {
  const tabs = [...document.querySelectorAll('.lp-tab')];
  const indicator = document.querySelector('.lp-tab-indicator');
  const copyBtn = document.querySelector('.lp-copy');
  if (!tabs.length) return;

  function moveIndicator(tab) {
    indicator.style.transform = 'translateX(' + tab.offsetLeft + 'px) scaleX(' + tab.offsetWidth + ')';
  }

  function select(tab) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    moveIndicator(tab);
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (e) => {
      const next = e.key === 'ArrowRight' ? tabs[(i + 1) % tabs.length]
        : e.key === 'ArrowLeft' ? tabs[(i - 1 + tabs.length) % tabs.length] : null;
      if (next) { e.preventDefault(); next.focus(); select(next); }
    });
  });

  // Place the indicator without animating on first paint
  indicator.style.transition = 'none';
  moveIndicator(tabs[0]);
  requestAnimationFrame(() => requestAnimationFrame(() => indicator.style.transition = ''));
  window.addEventListener('resize', () => moveIndicator(tabs.find((t) => t.getAttribute('aria-selected') === 'true')));

  let resetTimer;
  copyBtn.addEventListener('click', async () => {
    const panel = document.querySelector('.lp-panel:not([hidden]) pre');
    try { await navigator.clipboard.writeText(panel.innerText); } catch { return; }
    copyBtn.setAttribute('data-copied', '');
    copyBtn.setAttribute('aria-label', 'Copied');
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      copyBtn.removeAttribute('data-copied');
      copyBtn.setAttribute('aria-label', 'Copy code');
    }, 1600);
  });
})();
`

export const HomePage: FC = () => {
  return (
    <Layout activePath="/">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <main class="lp">
        <section class="lp-hero">
          <div>
            <div class="lp-eyebrow lp-reveal">
              <span class="lp-dot" aria-hidden="true"></span>
              NexGen API · v1
            </div>
            <h1 class="lp-reveal">
              Collect payments with <span>bills and QR codes</span>
            </h1>
            <p class="lp-reveal">
              Create a bill, send your customer to a hosted payment page and get the result on your server. Or
              generate a QR code for every transaction at the counter.
            </p>
            <button type="button" class="lp-search lp-reveal" onclick="openSearch()" aria-label="Search the documentation">
              {icon(icons.search)}
              <span>Search the docs…</span>
              <kbd>⌘K</kbd>
            </button>
            <div class="lp-ctas lp-reveal">
              <a href="/docs/api/overview" class="lp-btn lp-btn-primary">
                Read the overview {icon(icons.arrow)}
              </a>
              <a href="/reference" class="lp-btn lp-btn-secondary">
                API reference
              </a>
            </div>
          </div>

          <div class="lp-code lp-reveal">
            <div class="lp-code-bar">
              <div class="lp-tabs" role="tablist" aria-label="Code examples">
                {samples.map((s, i) => (
                  <button
                    type="button"
                    role="tab"
                    class="lp-tab"
                    id={`lp-tab-${s.id}`}
                    aria-controls={`lp-panel-${s.id}`}
                    aria-selected={i === 0 ? 'true' : 'false'}
                    tabindex={i === 0 ? 0 : -1}
                  >
                    {s.label}
                  </button>
                ))}
                <span class="lp-tab-indicator" aria-hidden="true"></span>
              </div>
              <button type="button" class="lp-copy" aria-label="Copy code">
                {icon(icons.copy, 'lp-icon lp-icon-copy')}
                {icon(icons.check, 'lp-icon lp-icon-check')}
              </button>
            </div>
            <div class="lp-panels">
              {samples.map((s, i) => (
                <div
                  class="lp-panel"
                  role="tabpanel"
                  id={`lp-panel-${s.id}`}
                  aria-labelledby={`lp-tab-${s.id}`}
                  hidden={i !== 0}
                >
                  <pre>{raw(s.request)}</pre>
                  <pre>{raw(s.response)}</pre>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="products-heading">
          <h2 id="products-heading">Choose how you get paid</h2>
          <p class="lp-lead">Both products use the same credentials, request format and callback flow.</p>
          <div class="lp-grid">
            {products.map((p) => (
              <a href={p.href} class="lp-card">
                <span class="lp-card-icon">{icon(p.icon)}</span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
                <span class="lp-more">
                  Read the guide {icon(icons.arrow)}
                </span>
              </a>
            ))}
          </div>
        </section>

        <section aria-labelledby="flow-heading">
          <h2 id="flow-heading">How a bill payment works</h2>
          <p class="lp-lead">Four steps from checkout to a confirmed payment.</p>
          <ol class="lp-steps">
            {steps.map((s) => (
              <li>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                <code>{s.code}</code>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="endpoints-heading">
          <h2 id="endpoints-heading">Endpoints at a glance</h2>
          <p class="lp-lead">
            Every request needs your <code>ApiKey</code> header and <code>ApiSecret</code> query parameter.
          </p>
          <div class="lp-endpoints">
            {endpointGroups.map((g) => (
              <div>
                <h3>
                  {g.title}
                  <a href={g.href} class="lp-more">
                    Guide {icon(icons.arrow)}
                  </a>
                </h3>
                <ul>
                  {g.endpoints.map(([method, path]) => (
                    <li>
                      <span class={`lp-method lp-method-${method}`}>{method}</span>
                      <span>{path}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p class="lp-base">All paths are relative to https://nexgen.example.com/api/v1</p>
        </section>
      </main>
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </Layout>
  )
}
