'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Shield, Key, Copy, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'

const placeholderManualKey = 'ABCD EFGH IJKL MNOP QRST UVWX YZ12 3456'
const placeholderRecoveryCodes = [
  'A1B2-C3D4-E5F6',
  'G7H8-I9J0-K1L2',
  'M3N4-O5P6-Q7R8',
  'S9T0-U1V2-W3X4',
  'Y5Z6-A7B8-C9D0',
  'E1F2-G3H4-I5J6',
  'K7L8-M9N0-O1P2',
  'Q3R4-S5T6-U7V8',
]

export function TwoFactorSettings() {
  const [enabled, setEnabled] = useState(false)
  const [step, setStep] = useState<'idle' | 'qr' | 'verify'>('idle')
  const [verificationCode, setVerificationCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false)
  const [disableConfirmOpen, setDisableConfirmOpen] = useState(false)

  function handleEnable() {
    setStep('qr')
  }

  function handleVerify() {
    if (verificationCode.length === 6) {
      setEnabled(true)
      setStep('idle')
      setVerificationCode('')
      setShowRecoveryCodes(true)
    }
  }

  function handleDisable() {
    setEnabled(false)
    setDisableConfirmOpen(false)
    setShowRecoveryCodes(false)
  }

  function handleCopyKey() {
    navigator.clipboard.writeText(placeholderManualKey.replace(/\s/g, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Two-Factor Authentication</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Add an extra layer of security to your account.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Authenticator App</CardTitle>
            {enabled ? (
              <Badge variant="default" className="gap-1">
                <Shield className="size-3" />
                Enabled
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="size-3" />
                Disabled
              </Badge>
            )}
          </div>
          <CardDescription>
            Use an authenticator app like Google Authenticator or Authy to generate one-time codes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!enabled && step === 'idle' && (
            <Button onClick={handleEnable} className="gap-2">
              <Shield className="size-4" />
              Enable 2FA
            </Button>
          )}

          {step === 'qr' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="flex items-center justify-center size-44 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30">
                  <svg viewBox="0 0 200 200" className="size-36 text-foreground/80">
                    <rect x="10" y="10" width="80" height="80" fill="currentColor" rx="4" />
                    <rect x="30" y="30" width="15" height="15" fill="var(--background)" rx="1" />
                    <rect x="55" y="30" width="15" height="15" fill="var(--background)" rx="1" />
                    <rect x="30" y="55" width="15" height="15" fill="var(--background)" rx="1" />
                    <rect x="55" y="55" width="15" height="15" fill="var(--background)" rx="1" />
                    <rect x="110" y="10" width="80" height="80" fill="currentColor" rx="4" />
                    <rect x="130" y="30" width="15" height="15" fill="var(--background)" rx="1" />
                    <rect x="155" y="30" width="15" height="15" fill="var(--background)" rx="1" />
                    <rect x="130" y="55" width="15" height="15" fill="var(--background)" rx="1" />
                    <rect x="155" y="55" width="15" height="15" fill="var(--background)" rx="1" />
                    <rect x="10" y="110" width="80" height="80" fill="currentColor" rx="4" />
                    <rect x="30" y="130" width="15" height="15" fill="var(--background)" rx="1" />
                    <rect x="55" y="130" width="15" height="15" fill="var(--background)" rx="1" />
                    <rect x="30" y="155" width="15" height="15" fill="var(--background)" rx="1" />
                    <rect x="55" y="155" width="15" height="15" fill="var(--background)" rx="1" />
                    <rect x="110" y="110" width="30" height="30" fill="currentColor" rx="2" />
                    <rect x="110" y="150" width="30" height="15" fill="currentColor" rx="2" />
                    <rect x="150" y="110" width="15" height="30" fill="currentColor" rx="2" />
                    <rect x="150" y="160" width="15" height="15" fill="currentColor" rx="2" />
                    <rect x="170" y="110" width="15" height="15" fill="currentColor" rx="2" />
                    <rect x="170" y="150" width="15" height="30" fill="currentColor" rx="2" />
                    <rect x="160" y="170" width="25" height="15" fill="currentColor" rx="2" />
                  </svg>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Manual Setup Key</label>
                <div className="flex gap-2">
                  <Input
                    value={placeholderManualKey}
                    readOnly
                    className="font-mono text-xs tracking-wider"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyKey}>
                    {copied ? <CheckCircle2 className="size-4 text-green-600" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Verification Code</label>
                <Input
                  placeholder="000000"
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="font-mono text-center text-lg tracking-[0.5em]"
                  maxLength={6}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleVerify} disabled={verificationCode.length !== 6} className="gap-2">
                  <Key className="size-4" />
                  Verify & Enable
                </Button>
                <Button variant="outline" onClick={() => { setStep('idle'); setVerificationCode('') }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {enabled && !showRecoveryCodes && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-sm">
                <CheckCircle2 className="size-4 text-green-600 dark:text-green-400 shrink-0" />
                <span>Two-factor authentication is active on your account.</span>
              </div>
              <Dialog open={disableConfirmOpen} onOpenChange={setDisableConfirmOpen}>
                <DialogTrigger render={<Button variant="destructive" className="gap-2" />}>
                  <XCircle className="size-4" />
                  Disable 2FA
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
                    <DialogDescription>
                      This will make your account less secure. Are you sure you want to disable 2FA?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
                    <Button variant="destructive" onClick={handleDisable}>Disable</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {showRecoveryCodes && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-sm">
                <AlertTriangle className="size-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">Save these recovery codes.</span>
                  <p className="text-muted-foreground mt-0.5">
                    Each code can only be used once. Store them in a safe place.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {placeholderRecoveryCodes.map((code, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 font-mono text-xs tracking-wider dark:border-input"
                  >
                    <span className="text-muted-foreground">{i + 1}.</span>
                    {code}
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowRecoveryCodes(false)}>
                <CheckCircle2 className="size-4" />
                I&rsquo;ve saved the codes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
