export interface AuthUser {
  id: number
  name: string
  email: string
  createdAt: string
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'
