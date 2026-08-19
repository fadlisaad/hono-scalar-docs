import { FC } from 'hono/jsx'
import { Layout } from './layout'

export const NotFoundPage: FC = () => {
  return (
    <Layout title="404 - Page Not Found" activePath="/404">
      <div style="max-width: 600px; margin: 6rem auto; text-align: center; padding: 0 1.5rem;">
        <div style="font-size: 4rem; font-weight: 800; color: var(--accent); margin-bottom: 1rem;">
          404
        </div>
        <h1 style="font-size: 1.75rem; font-weight: 700; margin-bottom: 1rem; color: var(--text-primary);">
          Documentation Page Not Found
        </h1>
        <p style="color: var(--text-secondary); margin-bottom: 2rem;">
          The documentation page or API endpoint you are looking for might have been moved, renamed, or does not exist.
        </p>
        <div style="display: flex; gap: 1rem; justify-content: center;">
          <a
            href="/docs"
            style="background: var(--accent); color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600;"
          >
            Browse Documentation
          </a>
          <a
            href="/"
            style="background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color); padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600;"
          >
            Go to Home
          </a>
        </div>
      </div>
    </Layout>
  )
}
