import { eq } from 'drizzle-orm';
import { dbShared } from '../../database/shared.js';
import { users, sessions } from './auth.schema.js';
export const AuthRepository = {
    findUserByEmail(email) {
        return dbShared.select().from(users).where(eq(users.email, email)).then((r) => r[0]);
    },
    findUserById(id) {
        return dbShared.select().from(users).where(eq(users.id, id)).then((r) => r[0]);
    },
    createUser(data) {
        return dbShared.insert(users).values(data).returning().then((r) => r[0]);
    },
    updateUser(id, data) {
        return dbShared.update(users).set(data).where(eq(users.id, id)).returning().then((r) => r[0]);
    },
    findSession(token) {
        return dbShared.select().from(sessions).where(eq(sessions.refreshToken, token)).then((r) => r[0]);
    },
    createSession(data) {
        return dbShared.insert(sessions).values(data).then(() => { });
    },
    deleteSession(id) {
        return dbShared.delete(sessions).where(eq(sessions.id, id)).then(() => { });
    },
    deleteSessionsByUser(userId) {
        return dbShared.delete(sessions).where(eq(sessions.userId, userId)).then(() => { });
    },
};
