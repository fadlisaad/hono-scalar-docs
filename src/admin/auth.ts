import { Context, MiddlewareHandler } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'

const COOKIE_NAME = 'hono_admin_session'
const DEFAULT_PASSWORD = 'admin123'
const DEFAULT_SECRET = 'hono-edge-admin-secret-2026'

async function generateSessionToken(secret: string): Promise<string> {
  const payload = `admin_${Date.now()}`
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const hashHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return `${payload}.${hashHex}`
}

async function verifySessionToken(token: string, secret: string): Promise<boolean> {
  if (!token || !token.includes('.')) return false
  const [payload, hashHex] = token.split('.')
  if (!payload || !hashHex) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const expectedSignature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const expectedHashHex = Array.from(new Uint8Array(expectedSignature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return hashHex === expectedHashHex
}

export function getAdminPassword(c: Context): string {
  return (c.env as any)?.ADMIN_PASSWORD || DEFAULT_PASSWORD
}

export function getSessionSecret(c: Context): string {
  return (c.env as any)?.SESSION_SECRET || DEFAULT_SECRET
}

export async function isAuthenticated(c: Context): Promise<boolean> {
  const secret = getSessionSecret(c)
  
  // 1. Check Bearer token or API key header
  const authHeader = c.req.header('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    if (token === getAdminPassword(c)) return true
    if (await verifySessionToken(token, secret)) return true
  }

  const apiKeyHeader = c.req.header('x-admin-key')
  if (apiKeyHeader && apiKeyHeader === getAdminPassword(c)) {
    return true
  }

  // 2. Check HTTP-only cookie
  const cookieToken = getCookie(c, COOKIE_NAME)
  if (cookieToken && (await verifySessionToken(cookieToken, secret))) {
    return true
  }

  return false
}

export async function loginAdmin(c: Context): Promise<string> {
  const secret = getSessionSecret(c)
  const token = await generateSessionToken(secret)
  setCookie(c, COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    secure: false, // will be upgraded in production
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  })
  return token
}

export function logoutAdmin(c: Context): void {
  deleteCookie(c, COOKIE_NAME, { path: '/' })
}

export const adminAuthMiddleware: MiddlewareHandler = async (c, next) => {
  const path = c.req.path

  // Skip auth for login routes
  if (path === '/admin/login' || path === '/api/admin/login') {
    return next()
  }

  const authed = await isAuthenticated(c)

  if (!authed) {
    if (path.startsWith('/api/admin')) {
      return c.json({ error: 'Unauthorized: Admin authentication required' }, 401)
    }
    return c.redirect(`/admin/login?redirect=${encodeURIComponent(path)}`)
  }

  return next()
}
