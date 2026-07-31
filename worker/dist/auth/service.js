import { sign } from 'hono/jwt';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, sessions } from '../db/schema.js';
import { config } from '../config.js';
const ACCESS_TTL = 60 * 15;
const REFRESH_TTL = 60 * 60 * 24 * 7;
function pick(u) {
    return { id: u.id, name: u.name, email: u.email, createdAt: u.createdAt };
}
async function signAccess(user) {
    return sign({ sub: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + ACCESS_TTL }, config.jwtSecret);
}
async function createSession(userId) {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TTL * 1000);
    await db.insert(sessions).values({ userId, refreshToken: token, expiresAt });
    return token;
}
export async function register(name, email, password) {
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing)
        throw Object.assign(new Error('email already registered'), { status: 409 });
    const hash = await Bun.password.hash(password);
    const [user] = await db.insert(users).values({ name, email, passwordHash: hash }).returning();
    const u = pick(user);
    const tokens = await createSession(u.id);
    return { tokens: { accessToken: await signAccess(u), refreshToken: tokens }, user: u };
}
export async function login(email, password) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user || !(await Bun.password.verify(password, user.passwordHash))) {
        throw Object.assign(new Error('invalid email or password'), { status: 401 });
    }
    const u = pick(user);
    const tokens = await createSession(u.id);
    return { tokens: { accessToken: await signAccess(u), refreshToken: tokens }, user: u };
}
export async function rotate(token) {
    const [session] = await db.select().from(sessions).where(eq(sessions.refreshToken, token));
    if (!session || session.expiresAt < new Date()) {
        throw Object.assign(new Error('invalid or expired refresh token'), { status: 401 });
    }
    await db.delete(sessions).where(eq(sessions.id, session.id));
    const [user] = await db.select().from(users).where(eq(users.id, session.userId));
    if (!user)
        throw Object.assign(new Error('user not found'), { status: 401 });
    const u = pick(user);
    const newToken = await createSession(u.id);
    return { accessToken: await signAccess(u), refreshToken: newToken };
}
export async function logout(token) {
    await db.delete(sessions).where(eq(sessions.refreshToken, token));
}
export async function logoutAll(userId) {
    await db.delete(sessions).where(eq(sessions.userId, userId));
}
export async function getProfile(userId) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user)
        throw Object.assign(new Error('user not found'), { status: 404 });
    return pick(user);
}
export async function updateProfile(userId, data) {
    const [user] = await db.update(users)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
    return pick(user);
}
export async function changePassword(userId, current, next) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !(await Bun.password.verify(current, user.passwordHash))) {
        throw Object.assign(new Error('current password is incorrect'), { status: 400 });
    }
    const hash = await Bun.password.hash(next);
    await db.update(users).set({ passwordHash: hash, updatedAt: new Date() }).where(eq(users.id, userId));
    await logoutAll(userId);
}
