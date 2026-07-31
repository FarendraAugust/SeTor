import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { rateLimit } from '../../common/middleware/rate-limit.js'
import { authGuard } from './auth.guard.js'
import { AuthService } from './auth.service.js'
import { validateRegister, validateLogin } from './auth.validation.js'

const REFRESH_TTL = 60 * 60 * 24 * 7

function cookieOpts() {
  const isProd = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true as const,
    secure: isProd,
    sameSite: (isProd ? 'strict' : 'lax') as 'strict' | 'lax',
    path: '/auth' as const,
    maxAge: REFRESH_TTL,
  }
}

const router = new Hono()

router.post('/register', rateLimit(10, 60_000), async (c) => {
  const input = validateRegister(await c.req.json())
  const { tokens, user } = await AuthService.register(input)
  setCookie(c, 'refresh_token', tokens.refreshToken, cookieOpts())
  return c.json({ accessToken: tokens.accessToken, user }, 201)
})

router.post('/login', rateLimit(10, 60_000), async (c) => {
  const input = validateLogin(await c.req.json())
  const { tokens, user } = await AuthService.login(input)
  setCookie(c, 'refresh_token', tokens.refreshToken, cookieOpts())
  return c.json({ accessToken: tokens.accessToken, user })
})

router.post('/refresh', async (c) => {
  const token = getCookie(c, 'refresh_token')
  if (!token) return c.json({ error: 'refresh token required' }, 401)

  try {
    const tokens = await AuthService.rotate(token)
    setCookie(c, 'refresh_token', tokens.refreshToken, cookieOpts())
    return c.json({ accessToken: tokens.accessToken })
  } catch {
    deleteCookie(c, 'refresh_token', { path: '/auth' })
    return c.json({ error: 'invalid or expired refresh token' }, 401)
  }
})

router.post('/logout', async (c) => {
  const token = getCookie(c, 'refresh_token')
  if (token) {
    await AuthService.logout(token)
    deleteCookie(c, 'refresh_token', { path: '/auth' })
  }
  return c.json({ ok: true })
})

router.post('/logout-all', authGuard, async (c) => {
  await AuthService.logoutAll(c.get('userId'))
  deleteCookie(c, 'refresh_token', { path: '/auth' })
  return c.json({ ok: true })
})

router.get('/me', authGuard, async (c) => {
  const profile = await AuthService.getProfile(c.get('userId'))
  return c.json({ user: profile })
})

router.patch('/profile', authGuard, async (c) => {
  const { name } = await c.req.json()
  if (!name?.trim()) return c.json({ error: 'name is required' }, 400)
  const user = await AuthService.updateProfile(c.get('userId'), { name: name.trim() })
  return c.json({ user })
})

router.post('/change-password', authGuard, async (c) => {
  const { currentPassword, newPassword } = await c.req.json()
  if (!currentPassword || !newPassword) return c.json({ error: 'currentPassword and newPassword required' }, 400)
  if (newPassword.length < 8) return c.json({ error: 'new password must be at least 8 characters' }, 400)
  if (currentPassword === newPassword) return c.json({ error: 'new password must differ from current' }, 400)

  await AuthService.changePassword(c.get('userId'), currentPassword, newPassword)
  deleteCookie(c, 'refresh_token', { path: '/auth' })
  return c.json({ ok: true })
})

export default router
