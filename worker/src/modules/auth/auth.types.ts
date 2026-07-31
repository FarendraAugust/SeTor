import type { users, sessions } from './auth.schema.js'

export type User = typeof users.$inferSelect
export type Session = typeof sessions.$inferSelect

export type UserPublic = {
  id: number
  name: string
  email: string
  createdAt: Date
}

export type JwtPayload = {
  sub: number
  email: string
  exp: number
}

export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

export type RegisterInput = {
  name: string
  email: string
  password: string
}

export type LoginInput = {
  email: string
  password: string
}
