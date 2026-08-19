import { FC } from 'hono/jsx'
import { Layout } from './layout'

export const HomePage: FC = () => {
  return (
    <Layout title="Modern Edge Docs | Hono + Scalar + Cloudflare" activePath="/">
      <div style="max-width: 1200px; margin: 0 auto; padding: 4rem 1.5rem; text-align: center;">
        
        {/* Hero Section */}
        <div style="margin-bottom: 3.5rem;">
          <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: var(--bg-tertiary); border: 1px solid var(--border-color); padding: 0.35rem 0.85rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; margin-bottom: 1.5rem; color: var(--accent);">
            <span>⚡ Powered by Hono + Scalar + Cloudflare Workers</span>
          </div>

          <h1 style="font-size: clamp(2.5rem, 5vw, 3.75rem); font-weight: 800; line-height: 1.15; letter-spacing: -0.03em; margin-bottom: 1.25rem; color: var(--text-primary);">
            Next-Gen Documentation &amp; <br />
            <span style="color: var(--accent); background: linear-gradient(135deg, var(--accent), #e11d48); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
              Interactive API Reference
            </span>
          </h1>

          <p style="font-size: 1.25rem; color: var(--text-secondary); max-width: 700px; margin: 0 auto 2.5rem; line-height: 1.6;">
            A complete edge-native documentation platform. Author documentation in Markdown with instant SSR, type-safe OpenAPI endpoints, and interactive Scalar API playground.
          </p>

          <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
            <a
              href="/docs"
              style="background: var(--accent); color: white; padding: 0.875rem 1.75rem; border-radius: 0.5rem; font-weight: 600; font-size: 1rem; display: inline-flex; align-items: center; gap: 0.5rem; box-shadow: 0 10px 15px -3px rgba(249, 115, 22, 0.3);"
            >
              Get Started with Docs →
            </a>
            <a
              href="/reference"
              style="background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color); padding: 0.875rem 1.75rem; border-radius: 0.5rem; font-weight: 600; font-size: 1rem; display: inline-flex; align-items: center; gap: 0.5rem;"
            >
              Interactive API Reference 🚀
            </a>
          </div>
        </div>

        {/* Features 4-Column Grid */}
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; margin-bottom: 4rem; text-align: left;">
          
          <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 1.75rem; border-radius: 0.75rem;">
            <div style="font-size: 1.75rem; margin-bottom: 0.75rem;">🔥</div>
            <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-primary);">Hono Web Framework</h3>
            <p style="color: var(--text-secondary); font-size: 0.9375rem; line-height: 1.5;">
              Ultra-fast router and middleware engine built on Web Standards. Ultra-low latency cold starts.
            </p>
          </div>

          <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 1.75rem; border-radius: 0.75rem;">
            <div style="font-size: 1.75rem; margin-bottom: 0.75rem;">📖</div>
            <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-primary);">Scalar API Reference</h3>
            <p style="color: var(--text-secondary); font-size: 0.9375rem; line-height: 1.5;">
              Stunning modern UI for OpenAPI 3.1 specifications with interactive request testing and live schema viewer.
            </p>
          </div>

          <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 1.75rem; border-radius: 0.75rem;">
            <div style="font-size: 1.75rem; margin-bottom: 0.75rem;">📝</div>
            <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-primary);">Markdown &amp; Frontmatter</h3>
            <p style="color: var(--text-secondary); font-size: 0.9375rem; line-height: 1.5;">
              Author guide articles in standard Markdown with YAML frontmatter, GitHub alerts, code highlighting, and TOC.
            </p>
          </div>

          <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 1.75rem; border-radius: 0.75rem;">
            <div style="font-size: 1.75rem; margin-bottom: 0.75rem;">☁️</div>
            <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--text-primary);">Cloudflare Workers</h3>
            <p style="color: var(--text-secondary); font-size: 0.9375rem; line-height: 1.5;">
              Deploy anywhere worldwide with zero configuration. Scalable serverless architecture with global CDN caching.
            </p>
          </div>

        </div>

        {/* Quick Preview Code */}
        <div style="background: var(--code-bg); border: 1px solid var(--border-color); border-radius: 0.75rem; text-align: left; overflow: hidden; max-width: 800px; margin: 0 auto;">
          <div style="background: rgba(0,0,0,0.3); padding: 0.75rem 1rem; font-size: 0.8125rem; color: #94a3b8; font-family: var(--font-mono); border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; gap: 0.5rem;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #ef4444; display: inline-block;"></span>
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #f59e0b; display: inline-block;"></span>
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #10b981; display: inline-block;"></span>
            <span style="margin-left: 0.5rem;">src/index.ts</span>
          </div>
          <pre style="padding: 1.25rem; margin: 0; color: #f1f5f9; font-family: var(--font-mono); font-size: 0.875rem; overflow-x: auto;">
{`import { OpenAPIHono } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'

const app = new OpenAPIHono()

// Mount interactive Scalar API playground
app.get('/reference', Scalar({ url: '/openapi.json' }))

// Export Cloudflare Workers entrypoint
export default app`}
          </pre>
        </div>

      </div>
    </Layout>
  )
}
