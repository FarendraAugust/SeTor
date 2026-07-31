import { eq } from 'drizzle-orm'
import { dbShared } from '../../database/shared.js'
import { users, sessions } from './auth.schema.js'
import type { User, Session } from './auth.types.js'

export const AuthRepository = {
  findUserByEmail(email: string): Promise<User | undefined> {
    return dbShared.select().from(users).where(eq(users.email, email)).then((r) => r[0])
  },

  findUserById(id: number): Promise<User | undefined> {
    return dbShared.select().from(users).where(eq(users.id, id)).then((r) => r[0])
  },

  createUser(data: { name: string; email: string; passwordHash: string }): Promise<User> {
    return dbShared.insert(users).values(data).returning().then((r) => r[0])
  },

  updateUser(id: number, data: Partial<Pick<User, 'name' | 'passwordHash' | 'updatedAt'>>): Promise<User> {
    return dbShared.update(users).set(data).where(eq(users.id, id)).returning().then((r) => r[0])
  },

  findSession(token: string): Promise<Session | undefined> {
    return dbShared.select().from(sessions).where(eq(sessions.refreshToken, token)).then((r) => r[0])
  },

  createSession(data: { userId: number; refreshToken: string; expiresAt: Date }): Promise<void> {
    return dbShared.insert(sessions).values(data).then(() => {})
  },

  deleteSession(id: number): Promise<void> {
    return dbShared.delete(sessions).where(eq(sessions.id, id)).then(() => {})
  },

  deleteSessionsByUser(userId: number): Promise<void> {
    return dbShared.delete(sessions).where(eq(sessions.userId, userId)).then(() => {})
  },
} as const
