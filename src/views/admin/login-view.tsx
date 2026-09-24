import logo from '../../assets/logo.png?inline'
import { FC } from 'hono/jsx'

interface LoginViewProps {
  error?: string
  redirect?: string
}

export const LoginView: FC<LoginViewProps> = ({ error, redirect = '/admin' }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Admin Login | NexGen Docs</title>
        <link rel="icon" type="image/png" href={logo} />
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --bg: #090d16;
            --card-bg: #111827;
            --border: #1f2937;
            --text: #f9fafb;
            --muted: #94a3b8;
            --accent: #f97316;
            --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: var(--font);
            background: var(--bg);
            color: var(--text);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 1.5rem;
          }
          .login-card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 0.75rem;
            width: 100%;
            max-width: 400px;
            padding: 2.5rem 2rem;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);
          }
          .brand-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 1.25rem;
            font-weight: 700;
            margin-bottom: 1.5rem;
          }
          .form-group {
            margin-bottom: 1.25rem;
          }
          label {
            display: block;
            font-size: 0.875rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: var(--text);
          }
          input {
            width: 100%;
            padding: 0.75rem 1rem;
            background: #090d16;
            border: 1px solid var(--border);
            border-radius: 0.5rem;
            color: var(--text);
            font-size: 0.9375rem;
            outline: none;
          }
          input:focus {
            border-color: var(--accent);
          }
          button {
            width: 100%;
            padding: 0.75rem;
            background: var(--accent);
            color: white;
            border: none;
            border-radius: 0.5rem;
            font-weight: 600;
            font-size: 1rem;
            cursor: pointer;
            transition: opacity 0.15s;
            margin-top: 0.5rem;
          }
          button:hover { opacity: 0.9; }
          .error-banner {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid #ef4444;
            color: #fca5a5;
            padding: 0.75rem;
            border-radius: 0.375rem;
            font-size: 0.875rem;
            margin-bottom: 1.25rem;
          }
        `}} />
      </head>
      <body>
        <div class="login-card">
          <div class="brand-badge">
            <img src={logo} alt="" width="22" height="22" />
            <span>NexGen Docs Admin</span>
          </div>

          {error && <div class="error-banner">{error}</div>}

          <form action="/admin/login" method="post">
            <input type="hidden" name="redirect" value={redirect} />
            <div class="form-group">
              <label for="password">Admin Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter admin password..."
                required
                autofocus
              />
            </div>
            <button type="submit">Sign In to Admin</button>
          </form>

          <p style="text-align: center; margin-top: 1.5rem; font-size: 0.8125rem; color: var(--muted);">
            Default password for local dev: <code style="color: var(--accent);">admin123</code>
          </p>
        </div>
      </body>
    </html>
  )
}
