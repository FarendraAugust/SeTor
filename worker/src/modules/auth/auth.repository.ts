import { eq } from 'drizzle-orm'
import { dbShared } from '../../database/shared.js'
import { users, sessions } from './auth.schema.js'
import { ReplicationService } from '../replication/replication.service.js'
import type { User, Session } from './auth.types.js'

export const AuthRepository = {
  findUserByEmail(email: string): Promise<User | undefined> {
    return dbShared.select().from(users).where(eq(users.email, email)).then((r) => r[0])
  },

  findUserById(id: number): Promise<User | undefined> {
    return dbShared.select().from(users).where(eq(users.id, id)).then((r) => r[0])
  },

  async createUser(data: { name: string; email: string; passwordHash: string }): Promise<User> {
    const [row] = await dbShared.insert(users).values(data).returning()
    await ReplicationService.record('users', 'insert', row as unknown as Record<string, unknown>)
    return row
  },

  async updateUser(id: number, data: Partial<Pick<User, 'name' | 'passwordHash' | 'updatedAt'>>): Promise<User> {
    const [row] = await dbShared.update(users).set(data).where(eq(users.id, id)).returning()
    if (row) await ReplicationService.record('users', 'update', row as unknown as Record<string, unknown>)
    return row
  },

  findSession(token: string): Promise<Session | undefined> {
    return dbShared.select().from(sessions).where(eq(sessions.refreshToken, token)).then((r) => r[0])
  },

  async createSession(data: { userId: number; refreshToken: string; expiresAt: Date }): Promise<void> {
    const [row] = await dbShared.insert(sessions).values(data).returning()
    await ReplicationService.record('sessions', 'insert', row as unknown as Record<string, unknown>)
  },

  async deleteSession(id: number): Promise<void> {
    await dbShared.delete(sessions).where(eq(sessions.id, id))
    await ReplicationService.record('sessions', 'delete', { id })
  },

  async deleteSessionsByUser(userId: number): Promise<void> {
    const rows = await dbShared.select().from(sessions).where(eq(sessions.userId, userId))
    await dbShared.delete(sessions).where(eq(sessions.userId, userId))
    for (const r of rows) {
      await ReplicationService.record('sessions', 'delete', { id: r.id })
    }
  },
} as const
