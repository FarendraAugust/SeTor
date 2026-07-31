'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { APP_NAME } from '@/lib/constants'
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  RadioTower,
  ShieldCheck,
  User,
  Zap,
} from 'lucide-react'

const FEATURES = [
  { icon: RadioTower, title: 'Real-time monitoring', text: 'HTTP, ping, TCP, DNS and more from distributed workers' },
  { icon: ShieldCheck, title: 'Instant alerts', text: 'Get notified the moment a service goes down' },
  { icon: Zap, title: 'Status pages', text: 'Share uptime history with your team and customers' },
]

function BrandPanel() {
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:w-[46%] xl:w-[42%]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
          backgroundSize: '42px 42px',
        }}
      />
      <div className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 size-[28rem] rounded-full bg-black/20 blur-3xl" />

      <div className="relative flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
          <Activity className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="font-display text-base font-semibold tracking-tight">{APP_NAME}</p>
          <p className="text-xs text-primary-foreground/70">Infrastructure uptime monitoring</p>
        </div>
      </div>

      <div className="relative space-y-6">
        <h2 className="font-display text-3xl leading-tight font-semibold tracking-tight text-balance xl:text-4xl">
          Keep every service under watch.
        </h2>
        <p className="max-w-sm text-sm leading-relaxed text-primary-foreground/80">
          A self-hosted monitoring platform that watches your infrastructure around the clock and alerts you before
          users notice.
        </p>
        <ul className="space-y-4 pt-2">
          {FEATURES.map((f) => (
            <li key={f.title} className="flex items-start gap-3">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                <f.icon className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-medium">{f.title}</span>
                <span className="block text-xs text-primary-foreground/70">{f.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative flex items-center gap-2 text-xs text-primary-foreground/70">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-300" />
        </span>
        All systems operational
      </div>
    </aside>
  )
}

function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status, login, register } = useAuth()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const next = searchParams.get('next') || '/'

  useEffect(() => {
    if (status === 'authenticated') router.replace(next)
  }, [status, next, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(name, email, password)
      }
      router.replace(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  function switchMode() {
    setMode((m) => (m === 'login' ? 'register' : 'login'))
    setError(null)
    setPassword('')
    setShowPassword(false)
  }

  const isLogin = mode === 'login'

  return (
    <div className="flex min-h-screen bg-background">
      <BrandPanel />

      <main className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Activity className="size-5" />
              </div>
              <div className="leading-tight">
                <p className="font-display text-base font-semibold tracking-tight">{APP_NAME}</p>
                <p className="text-xs text-muted-foreground">Infrastructure uptime monitoring</p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {isLogin ? 'Welcome back' : 'Get started free'}
            </span>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-balance">
              {isLogin ? 'Sign in to your workspace' : 'Create your account'}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {isLogin
                ? 'Enter your credentials to access the monitoring dashboard.'
                : 'Start monitoring your services in minutes.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <Field icon={User} label="Full name">
                <Input
                  className="h-10 pl-9"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </Field>
            )}

            <Field icon={Mail} label="Email address">
              <Input
                className="h-10 pl-9"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </Field>

            <Field icon={Lock} label="Password">
              <Input
                className="h-10 pr-9 pl-9"
                type={showPassword ? 'text' : 'password'}
                placeholder={isLogin ? '••••••••' : 'Min. 8 characters'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === 'register' ? 8 : undefined}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </Field>

            {error && (
              <div
                className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
                role="alert"
              >
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-[10px] font-bold">
                  !
                </span>
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="h-10 w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {isLogin ? 'Signing in…' : 'Creating account…'}
                </>
              ) : isLogin ? (
                <>
                  Sign in
                  <ArrowRight className="size-4" />
                </>
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={switchMode}
              className="font-medium text-primary transition-opacity hover:opacity-80"
            >
              {isLogin ? 'Register' : 'Sign in'}
            </button>
          </p>

          <p className="mt-10 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground/70">
            <CheckCircle2 className="size-3.5" />
            Authenticated via worker · {new URL(process.env.NEXT_PUBLIC_WORKER_URL ?? 'http://localhost:3001').host}
          </p>
        </div>
      </main>
    </div>
  )
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-foreground/80">{label}</span>
      <div className="relative">
        <Icon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        {children}
      </div>
    </label>
  )
}

export default function LoginPageWrapper() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  )
}
