import { useId, useState } from 'react'
import { useNavigate } from 'react-router'
import { formatMobile, isSaudiMobile, useAuth } from '../../lib/auth'
import {
  ATTEMPT_LOCK_SECONDS,
  MAX_ATTEMPTS,
  REQUEST_LOCK_SECONDS,
  RESEND_SECONDS,
  formatCountdown,
  sendCode,
  verifyCode,
} from '../../lib/otp'
import { useCountdown } from '../../lib/useCountdown'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Input } from '../ui/Input'
import { Notice } from '../ui/Notice'
import { OtpInput } from '../ui/OtpInput'
import { SheetHeader } from '../ui/SheetHeader'

type LoginSheetProps = {
  open: boolean
  onClose: () => void
  /** Runs after a successful login (e.g. go to checkout). */
  onSuccess: () => void
  /** Scenario user=new: sign in as a user with nothing saved. */
  newUser?: boolean
}

/** Figma "3 · Auth": quick phone verification as a bottom sheet, two steps. */
export function LoginSheet({ open, onClose, onSuccess, newUser }: LoginSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} bare ariaLabel="Log in">
      {open && <LoginFlow onClose={onClose} onSuccess={onSuccess} newUser={newUser} />}
    </BottomSheet>
  )
}

type PhoneError = null | 'failed' | 'rateLimited'
type CodeError = null | 'incorrect' | 'expired' | 'locked'

function LoginFlow({ onClose, onSuccess, newUser }: Omit<LoginSheetProps, 'open'>) {
  const navigate = useNavigate()
  const signIn = useAuth((s) => s.signIn)
  const titleId = useId()
  const helperId = useId()

  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [digits, setDigits] = useState('')
  const [touched, setTouched] = useState(false)
  const [sending, setSending] = useState(false)
  const [phoneError, setPhoneError] = useState<PhoneError>(null)
  const [requestLockUntil, setRequestLockUntil] = useState<number | null>(null)

  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [codeError, setCodeError] = useState<CodeError>(null)
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS)
  const [resendAt, setResendAt] = useState<number | null>(null)
  const [attemptLockUntil, setAttemptLockUntil] = useState<number | null>(null)

  const requestLock = useCountdown(requestLockUntil)
  const resendIn = useCountdown(resendAt)
  const attemptLock = useCountdown(attemptLockUntil)

  const valid = isSaudiMobile(digits)
  const showInvalid = touched && digits.length > 0 && !valid
  const rateLimited = phoneError === 'rateLimited' && requestLock > 0

  const help = () => navigate('/help')

  const send = async () => {
    if (!valid) {
      setTouched(true)
      return
    }
    setSending(true)
    const result = await sendCode(digits)
    setSending(false)
    if (result === 'failed') return setPhoneError('failed')
    if (result === 'rateLimited') {
      setPhoneError('rateLimited')
      setRequestLockUntil(Date.now() + REQUEST_LOCK_SECONDS * 1000)
      return
    }
    setPhoneError(null)
    setCode('')
    setCodeError(null)
    setAttemptsLeft(MAX_ATTEMPTS)
    setResendAt(Date.now() + RESEND_SECONDS * 1000)
    setStep('code')
  }

  const differentNumber = () => {
    setDigits('')
    setTouched(false)
    setPhoneError(null)
    setRequestLockUntil(null)
    setAttemptLockUntil(null)
    setCodeError(null)
    setCode('')
    setStep('phone')
  }

  const verify = async () => {
    if (code.length < 6) return
    setVerifying(true)
    const result = await verifyCode(code)
    setVerifying(false)
    if (result === 'ok') {
      signIn(digits, newUser ? 'new' : 'existing')
      onSuccess()
      return
    }
    if (result === 'expired') return setCodeError('expired')
    const left = attemptsLeft - 1
    setAttemptsLeft(left)
    if (left <= 0) {
      setCodeError('locked')
      setCode('')
      setAttemptLockUntil(Date.now() + ATTEMPT_LOCK_SECONDS * 1000)
    } else setCodeError('incorrect')
  }

  const resend = async () => {
    setSending(true)
    await sendCode(digits)
    setSending(false)
    setCode('')
    setCodeError(null)
    setAttemptsLeft(MAX_ATTEMPTS)
    setResendAt(Date.now() + RESEND_SECONDS * 1000)
  }

  /* --------------------------------- phone -------------------------------- */
  if (step === 'phone') {
    return (
      <div className="flex flex-col gap-6 pb-8">
        <SheetHeader title="Quick verify to checkout" titleId={titleId} onClose={onClose} onHelp={help} />
        <form
          className="flex flex-col gap-6 px-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (phoneError === 'failed') setPhoneError(null)
            void send()
          }}
        >
          {phoneError === 'failed' && (
            <Notice tone="error" icon="wifi-off" title="We couldn’t send the code">
              Check your internet connection and try again. Your cart is saved.
            </Notice>
          )}
          {rateLimited && (
            <Notice tone="error" icon="alert" title="Too many code requests">
              For your security, you can request a new code in {formatCountdown(requestLock, true)}.
            </Notice>
          )}
          <div className="flex flex-col gap-3.5">
            {!phoneError && <p className="body-m text-text-secondary">We’ll text a 6-digit code to confirm your number.</p>}
            <Input
              value={formatMobile(digits)}
              onChange={(v) => {
                setDigits(v.replace(/\D/g, '').replace(/^0+/, '').slice(0, 9))
                if (phoneError === 'failed') setPhoneError(null)
              }}
              onBlur={() => setTouched(true)}
              leadingIcon="flag-sa"
              prefix="+966"
              clearable
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="5X XXX XXXX"
              aria-label="Mobile number"
              error={showInvalid ? 'Enter a 9-digit Saudi mobile number that starts with 5, e.g. 55 123 4567.' : undefined}
            />
          </div>
          {rateLimited ? (
            <div className="flex flex-col gap-3">
              <Button fullWidth disabled>
                Send code in {formatCountdown(requestLock, true)}
              </Button>
              <Button fullWidth variant="ghost" onClick={differentNumber}>
                Use a different number
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Button type="submit" fullWidth loading={sending} disabled={!valid}>
                {phoneError === 'failed' ? 'Try again' : 'Send code'}
              </Button>
              <p className="text-center caption text-text-tertiary">By continuing you agree to our Terms and Privacy Policy.</p>
            </div>
          )}
        </form>
      </div>
    )
  }

  /* ---------------------------------- code --------------------------------- */
  const locked = codeError === 'locked' && attemptLock > 0
  const expired = codeError === 'expired'
  return (
    <div className="flex flex-col gap-6 pb-8">
      <SheetHeader title="Enter the code" titleId={titleId} onClose={onClose} onHelp={help} onBack={() => setStep('phone')} />
      <div className="flex flex-col gap-6 px-4">
        {locked ? (
          <Notice tone="error" icon="lock" title="Too many incorrect attempts">
            For your security, code entry is paused. Try again in {formatCountdown(attemptLock, true)} or use a different number.
          </Notice>
        ) : (
          <p className="flex flex-wrap items-baseline gap-1 body-m text-text-secondary">
            Sent to +966 {formatMobile(digits)}.
            <button type="button" className="cta-m text-text-primary underline" onClick={() => setStep('phone')}>
              Edit
            </button>
          </p>
        )}

        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault()
            void verify()
          }}
        >
          <div className="flex flex-col gap-2">
            <OtpInput
              value={code}
              onChange={(v) => {
                setCode(v)
                if (codeError === 'incorrect' || codeError === 'expired') setCodeError(null)
              }}
              error={codeError === 'incorrect' || expired}
              disabled={locked}
              autoFocus
              aria-describedby={helperId}
            />
            {(codeError === 'incorrect' || expired) && (
              <p id={helperId} role="alert" className="flex items-start gap-1.5 body-s text-state-error">
                <Icon name="alert" size={16} className="mt-px shrink-0" />
                {expired
                  ? 'This code has expired. Codes last 5 minutes, so request a new one.'
                  : `That code is incorrect. You have ${attemptsLeft} ${attemptsLeft === 1 ? 'attempt' : 'attempts'} left.`}
              </p>
            )}
          </div>

          {!locked && !expired && (
            <div className="flex items-center gap-1.5 body-s text-text-tertiary">
              <Icon name="clock" size={16} className="shrink-0" />
              {resendIn > 0 ? (
                <span>Resend code in {formatCountdown(resendIn)}</span>
              ) : (
                <button type="button" className="cta-m text-text-primary underline disabled:opacity-35" disabled={sending} onClick={resend}>
                  {sending ? 'Sending…' : 'Resend code'}
                </button>
              )}
            </div>
          )}

          {locked ? (
            <div className="flex flex-col gap-3">
              <Button fullWidth variant="secondary" onClick={differentNumber}>
                Use a different number
              </Button>
              <Button fullWidth disabled>
                Verify
              </Button>
            </div>
          ) : expired ? (
            <div className="flex flex-col gap-3">
              <Button fullWidth loading={sending} onClick={resend}>
                Send a new code
              </Button>
              <Button fullWidth disabled>
                Verify
              </Button>
            </div>
          ) : (
            <Button type="submit" fullWidth loading={verifying} disabled={code.length < 6}>
              Verify
            </Button>
          )}
        </form>
      </div>
    </div>
  )
}
