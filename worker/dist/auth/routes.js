import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { auth } from './middleware.js';
import { rateLimit } from './rate-limit.js';
import { register, login, rotate, logout, logoutAll, getProfile, updateProfile, changePassword, } from './service.js';
const route = new Hono();
const REFRESH_TTL = 60 * 60 * 24 * 7;
function cookieOpts() {
    const isProd = process.env.NODE_ENV === 'production';
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: (isProd ? 'strict' : 'lax'),
        path: '/auth',
        maxAge: REFRESH_TTL,
    };
}
route.post('/register', rateLimit(10, 60_000), async (c) => {
    const { name, email, password } = await c.req.json();
    if (!name?.trim())
        return c.json({ error: 'name is required' }, 400);
    if (!email?.trim())
        return c.json({ error: 'email is required' }, 400);
    if (!password || password.length < 8)
        return c.json({ error: 'password must be at least 8 characters' }, 400);
    try {
        const { tokens, user } = await register(name.trim(), email.trim().toLowerCase(), password);
        setCookie(c, 'refresh_token', tokens.refreshToken, cookieOpts());
        return c.json({ accessToken: tokens.accessToken, user }, 201);
    }
    catch (e) {
        const status = e.status ?? 500;
        const msg = status === 409 ? 'email already registered' : 'registration failed';
        return c.json({ error: msg }, status);
    }
});
route.post('/login', rateLimit(10, 60_000), async (c) => {
    const { email, password } = await c.req.json();
    if (!email?.trim() || !password)
        return c.json({ error: 'email and password required' }, 400);
    try {
        const { tokens, user } = await login(email.trim().toLowerCase(), password);
        setCookie(c, 'refresh_token', tokens.refreshToken, cookieOpts());
        return c.json({ accessToken: tokens.accessToken, user });
    }
    catch {
        return c.json({ error: 'invalid email or password' }, 401);
    }
});
route.post('/refresh', async (c) => {
    const token = getCookie(c, 'refresh_token');
    if (!token)
        return c.json({ error: 'refresh token required' }, 401);
    try {
        const tokens = await rotate(token);
        setCookie(c, 'refresh_token', tokens.refreshToken, cookieOpts());
        return c.json({ accessToken: tokens.accessToken });
    }
    catch {
        deleteCookie(c, 'refresh_token', { path: '/auth' });
        return c.json({ error: 'invalid or expired refresh token' }, 401);
    }
});
route.post('/logout', async (c) => {
    const token = getCookie(c, 'refresh_token');
    if (token) {
        await logout(token).catch(() => { });
        deleteCookie(c, 'refresh_token', { path: '/auth' });
    }
    return c.json({ ok: true });
});
route.post('/logout-all', auth, async (c) => {
    const user = c.get('user');
    await logoutAll(user.id);
    deleteCookie(c, 'refresh_token', { path: '/auth' });
    return c.json({ ok: true });
});
route.get('/me', auth, async (c) => {
    const user = c.get('user');
    try {
        const profile = await getProfile(user.id);
        return c.json({ user: profile });
    }
    catch {
        return c.json({ error: 'user not found' }, 404);
    }
});
route.patch('/profile', auth, async (c) => {
    const user = c.get('user');
    const { name } = await c.req.json();
    if (!name?.trim())
        return c.json({ error: 'name is required' }, 400);
    const updated = await updateProfile(user.id, { name: name.trim() });
    return c.json({ user: updated });
});
route.post('/change-password', auth, async (c) => {
    const user = c.get('user');
    const { currentPassword, newPassword } = await c.req.json();
    if (!currentPassword || !newPassword)
        return c.json({ error: 'currentPassword and newPassword required' }, 400);
    if (newPassword.length < 8)
        return c.json({ error: 'new password must be at least 8 characters' }, 400);
    if (currentPassword === newPassword)
        return c.json({ error: 'new password must differ from current' }, 400);
    try {
        await changePassword(user.id, currentPassword, newPassword);
        deleteCookie(c, 'refresh_token', { path: '/auth' });
        return c.json({ ok: true });
    }
    catch (e) {
        const status = e.status ?? 500;
        return c.json({ error: e.message ?? 'password change failed' }, status);
    }
});
export default route;
