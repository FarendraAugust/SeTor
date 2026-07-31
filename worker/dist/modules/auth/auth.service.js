import { sign } from 'hono/jwt';
import { env } from '../../config/env.js';
import { HttpError } from '../../common/errors/http-error.js';
import { AuthRepository } from './auth.repository.js';
const ACCESS_TTL = 60 * 15;
const REFRESH_TTL = 60 * 60 * 24 * 7;
function toPublic(user) {
    return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}
async function signAccess(payload) {
    return sign({ sub: payload.id, email: payload.email, exp: Math.floor(Date.now() / 1000) + ACCESS_TTL }, env.jwtSecret);
}
async function createSession(userId) {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TTL * 1000);
    await AuthRepository.createSession({ userId, refreshToken: token, expiresAt });
    return token;
}
export const AuthService = {
    async register(input) {
        const existing = await AuthRepository.findUserByEmail(input.email);
        if (existing)
            throw HttpError.conflict('email already registered');
        const passwordHash = await Bun.password.hash(input.password);
        const user = await AuthRepository.createUser({
            name: input.name,
            email: input.email,
            passwordHash,
        });
        const [accessToken, refreshToken] = await Promise.all([
            signAccess(user),
            createSession(user.id),
        ]);
        return { tokens: { accessToken, refreshToken }, user: toPublic(user) };
    },
    async login(input) {
        const user = await AuthRepository.findUserByEmail(input.email);
        if (!user || !(await Bun.password.verify(input.password, user.passwordHash))) {
            throw HttpError.unauthorized('invalid email or password');
        }
        const [accessToken, refreshToken] = await Promise.all([
            signAccess(user),
            createSession(user.id),
        ]);
        return { tokens: { accessToken, refreshToken }, user: toPublic(user) };
    },
    async rotate(token) {
        const session = await AuthRepository.findSession(token);
        if (!session || session.expiresAt < new Date()) {
            throw HttpError.unauthorized('invalid or expired refresh token');
        }
        await AuthRepository.deleteSession(session.id);
        const user = await AuthRepository.findUserById(session.userId);
        if (!user)
            throw HttpError.unauthorized('user not found');
        const [accessToken, refreshToken] = await Promise.all([
            signAccess(user),
            createSession(user.id),
        ]);
        return { accessToken, refreshToken };
    },
    async logout(token) {
        const session = await AuthRepository.findSession(token);
        if (session)
            await AuthRepository.deleteSession(session.id);
    },
    async logoutAll(userId) {
        await AuthRepository.deleteSessionsByUser(userId);
    },
    async getProfile(userId) {
        const user = await AuthRepository.findUserById(userId);
        if (!user)
            throw HttpError.notFound('user not found');
        return toPublic(user);
    },
    async updateProfile(userId, data) {
        const user = await AuthRepository.updateUser(userId, { ...data, updatedAt: new Date() });
        return toPublic(user);
    },
    async changePassword(userId, current, next) {
        const user = await AuthRepository.findUserById(userId);
        if (!user || !(await Bun.password.verify(current, user.passwordHash))) {
            throw HttpError.badRequest('current password is incorrect');
        }
        const passwordHash = await Bun.password.hash(next);
        await AuthRepository.updateUser(userId, { passwordHash, updatedAt: new Date() });
        await AuthRepository.deleteSessionsByUser(userId);
    },
};
