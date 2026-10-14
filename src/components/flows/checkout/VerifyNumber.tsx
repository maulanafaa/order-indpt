import { useEffect, useId, useRef, useState } from 'react'
import { completeSignIn } from '../../../lib/login'
import { cn } from '../../../lib/cn'
import {
  ATTEMPT_LOCK_SECONDS,
  MAX_ATTEMPTS,
  REQUEST_LOCK_SECONDS,
  RESEND_SECONDS,
  formatCountdown,
  sendCode,
  verifyCode,
} from '../../../lib/otp'
import { cleanDigits, countryById, formatLocal, isValidMobile, phoneCountries, placeholderFor, type PhoneCountry } from '../../../lib/phone'
import { useCountdown } from '../../../lib/useCountdown'
import { BottomSheet } from '../../ui/BottomSheet'
import { Button } from '../../ui/Button'
import { fieldBox } from '../../ui/fieldStyles'
import { Flag } from '../../ui/Flag'
import { Icon } from '../../ui/Icon'
import { Notice } from '../../ui/Notice'
import { OtpInput } from '../../ui/OtpInput'
import { SheetHeader } from '../../ui/SheetHeader'
import { Spinner } from '../../ui/Spinner'

/** Test settings sheet → phone field: fill this Saudi number (digits) and leave the field. */
export const FILL_EVENT = 'checkout:fill-number'

/** The number looks complete: a short "checking" spinner before the check mark (prototype). */
const CHECK_MS = 600

type PhoneError = null | 'invalid' | 'failed' | 'rateLimited'

/**
 * Figma 4.7 "Verify your number" (773:597 to 780:112040): a phone field with a
 * country picker. While typing, a complete number is checked (spinner, then a check
 * mark). Leaving the field with a valid number sends a code and opens the OTP sheet;
 * an invalid one shows the error under the field. Signed in: the verified number.
 */
export function VerifyNumber({ verifiedMobile, newUser }: { verifiedMobile: string | null; newUser: boolean }) {
  const fieldId = useId()
  const helperId = useId()
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [countryId, setCountryId] = useState<PhoneCountry['id']>('SA')
  const country = countryById.get(countryId)!
  const [pickerOpen, setPickerOpen] = useState(false)
  const [digits, setDigits] = useState('')
  /** The last complete number the (fake) check finished for. */
  const [checked, setChecked] = useState('')
  const [error, setError] = useState<PhoneError>(null)
  const [sending, setSending] = useState(false)
  const [requestLockUntil, setRequestLockUntil] = useState<number | null>(null)
  const requestLock = useCountdown(requestLockUntil)
  const [otpOpen, setOtpOpen] = useState(false)
  /** Bumped each time a code is sent, so the sheet starts fresh. */
  const [codeRound, setCodeRound] = useState(0)

  const complete = digits.length === country.length
  const valid = isValidMobile(digits, country)
  const checking = complete && checked !== digits
  // Real time check once the number is complete.
  useEffect(() => {
    if (digits.length !== country.length) return
    const t = window.setTimeout(() => setChecked(digits), CHECK_MS)
    return () => window.clearTimeout(t)
  }, [digits, country.length])

  // Close the country list on a tap outside it.
  useEffect(() => {
    if (!pickerOpen) return
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [pickerOpen])

  const send = async (number = digits) => {
    // Prototype: the 10 minute wait is only shown as a countdown; it never blocks another try.
    setSending(true)
    const result = await sendCode(number)
    setSending(false)
    if (result === 'failed') return setError('failed')
    if (result === 'rateLimited') {
      setError('rateLimited')
      setRequestLockUntil(Date.now() + REQUEST_LOCK_SECONDS * 1000)
      return
    }
    setError(null)
    setCodeRound((n) => n + 1)
    setOtpOpen(true)
  }

  // Test settings sheet (prototype): fill a Saudi number and leave the field, as if typed.
  const [filled, setFilled] = useState<string | null>(null)
  useEffect(() => {
    const onFill = (e: Event) => {
      const d = (e as CustomEvent<string>).detail
      setCountryId('SA')
      setDigits(d)
      setChecked(d)
      setError(null)
      setFilled(d)
    }
    window.addEventListener(FILL_EVENT, onFill)
    return () => window.removeEventListener(FILL_EVENT, onFill)
  }, [])
  useEffect(() => {
    if (filled === null) return
    const t = window.setTimeout(() => {
      setFilled(null)
      if (!isValidMobile(filled, countryById.get('SA')!)) setError('invalid')
      else void send(filled)
    }, 0)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filled])

  /* --------------------------------- verified --------------------------------- */
  // (Hooks above this line only: the verified view returns early.)
  if (verifiedMobile) {
    return (
      <div className={cn(fieldBox({}), 'h-12')}>
        <CountryLabel country={country} />
        <span aria-hidden className="h-6 w-px bg-border-default" />
        <span className="min-w-0 flex-1 truncate input-text text-text-primary">{formatLocal(verifiedMobile, country)}</span>
        <Icon name="check" size={18} className="shrink-0 text-state-success" />
        <span className="sr-only">Verified</span>
      </div>
    )
  }


  /** Leaving the field (a tap anywhere else): send the code, or show what is wrong. */
  const onLeave = () => {
    if (!digits || sending || otpOpen) return
    if (!valid) return setError('invalid')
    void send()
  }


  const differentNumber = () => {
    setOtpOpen(false)
    setDigits('')
    setChecked('')
    setError(null)
    window.setTimeout(() => inputRef.current?.focus(), 350)
  }

  const message =
    error === 'invalid'
      ? 'Enter a valid mobile number'
      : error === 'failed'
        ? 'We couldn’t send the code. Check your connection and try again.'
        : error === 'rateLimited' && requestLock > 0
          ? `Too many code requests. You can request a new code in ${formatCountdown(requestLock, true)}.`
          : null

  return (
    <div
      ref={boxRef}
      className="relative flex flex-col gap-1.5"
      onBlur={(e) => {
        // Focus moving inside (country button, the list) is not leaving the field.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onLeave()
      }}
    >
      <div className={cn(fieldBox({ error: Boolean(message) }), 'h-12')}>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={pickerOpen}
          aria-label={`Country code ${country.dial}, ${country.name}`}
          onClick={() => setPickerOpen((o) => !o)}
          className="-ms-1 flex shrink-0 items-center gap-1.5 rounded-4 ps-1 pe-0.5"
        >
          <CountryLabel country={country} />
          <Icon name="down" size={16} className={cn('transition-transform duration-200 ease-card', pickerOpen && 'rotate-180')} />
        </button>
        <span aria-hidden className="h-6 w-px bg-border-default" />
        <input
          ref={inputRef}
          id={fieldId}
          value={formatLocal(digits, country)}
          onChange={(e) => {
            setDigits(cleanDigits(e.target.value, country))
            if (error) setError(null)
          }}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={placeholderFor(country)}
          aria-label="Mobile number"
          aria-invalid={Boolean(message) || undefined}
          aria-describedby={message ? helperId : undefined}
          className="h-full min-w-0 flex-1 bg-transparent input-text text-text-primary outline-none placeholder:text-text-tertiary"
        />
        {sending || checking ? (
          <Spinner size={18} className="shrink-0 text-text-tertiary" />
        ) : (
          complete &&
          valid && (
            <>
              <Icon name="check" size={18} className="shrink-0 animate-fade-in text-state-success" />
              <span className="sr-only">Valid number</span>
            </>
          )
        )}
      </div>

      {message && (
        <p id={helperId} role="alert" className="flex items-start gap-1.5 body-s text-state-error">
          <Icon name="alert" size={16} className="mt-px shrink-0" />
          {message}
        </p>
      )}

      {/* Figma "Country dropdown". */}
      {pickerOpen && (
        <ul
          role="listbox"
          aria-label="Country code"
          className="absolute start-0 top-[52px] z-30 w-[260px] rounded-4 bg-surface-base py-1.5 inset-ring inset-ring-border-default shadow-[0_8px_24px_rgb(0_0_0/0.12)] animate-fade-in"
        >
          {phoneCountries.map((c) => {
            const selected = c.id === countryId
            return (
              <li key={c.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    setCountryId(c.id)
                    setDigits((d) => cleanDigits(d, c))
                    setError(null)
                    setPickerOpen(false)
                    inputRef.current?.focus()
                  }}
                  className={cn('flex w-full items-center gap-2 px-3.5 py-3 text-start', selected ? 'bg-surface-muted' : 'active:bg-surface-muted')}
                >
                  <Flag country={c.id} />
                  <span className={cn('flex-1 text-text-primary', selected ? 'label-m' : 'body-m')}>{c.name}</span>
                  <span className={cn('text-text-secondary', selected ? 'label-m' : 'body-m')}>{c.dial}</span>
                  <Icon name="check" size={18} className={cn('shrink-0 text-state-success', !selected && 'opacity-0')} />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <OtpSheet
        key={codeRound}
        open={otpOpen}
        digits={digits}
        country={country}
        newUser={newUser}
        // Closing without verifying starts the number over (after a pass it is replaced by the verified view anyway).
        onClose={() => {
          setOtpOpen(false)
          setDigits('')
          setChecked('')
          setError(null)
        }}
        onDifferentNumber={differentNumber}
      />
    </div>
  )
}

function CountryLabel({ country }: { country: PhoneCountry }) {
  return (
    <span className="flex items-center gap-1.5">
      <Flag country={country.id} />
      <span className="input-text text-text-primary">{country.dial}</span>
    </span>
  )
}

/* ------------------------------------------------------------------------ */

type CodeError = null | 'incorrect' | 'expired' | 'locked'

/**
 * Figma "Enter the code" sheet: six boxes, checked as soon as the last digit is typed.
 * Incorrect (attempts left), expired (send a new code) and too many attempts (paused).
 * No back or help buttons; close keeps the number.
 */
function OtpSheet({
  open,
  digits,
  country,
  newUser,
  onClose,
  onDifferentNumber,
}: {
  open: boolean
  digits: string
  country: PhoneCountry
  newUser: boolean
  onClose: () => void
  onDifferentNumber: () => void
}) {
  const titleId = useId()
  const helperId = useId()
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [codeError, setCodeError] = useState<CodeError>(null)
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS)
  const [resendAt, setResendAt] = useState(() => Date.now() + RESEND_SECONDS * 1000)
  const [lockUntil, setLockUntil] = useState<number | null>(null)
  const [sending, setSending] = useState(false)
  const resendIn = useCountdown(resendAt)
  const lock = useCountdown(lockUntil)
  const locked = codeError === 'locked' && lock > 0
  const expired = codeError === 'expired'
  // The sheet focuses its panel when it opens; move focus into the code boxes right after.
  const boxesRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => boxesRef.current?.querySelector('input')?.focus(), 60)
    return () => window.clearTimeout(t)
  }, [open])

  const verify = async (value: string) => {
    setVerifying(true)
    const result = await verifyCode(value)
    if (result === 'ok') {
      // Signs in: the checkout picks up the verified number, name, payment and button.
      await completeSignIn(digits, value, newUser ? 'new' : 'existing')
      setVerifying(false)
      onClose()
      return
    }
    setVerifying(false)
    // Keep typing in the boxes (focus can drop while the check runs).
    boxesRef.current?.querySelector('input')?.focus()
    if (result === 'expired') return setCodeError('expired')
    const left = attemptsLeft - 1
    setAttemptsLeft(left)
    if (left <= 0) {
      // Prototype: the 15 minute pause is only shown as a countdown; the boxes stay open
      // and the attempts start again.
      setCodeError('locked')
      setCode('')
      setAttemptsLeft(MAX_ATTEMPTS)
      setLockUntil(Date.now() + ATTEMPT_LOCK_SECONDS * 1000)
    } else {
      // Clear the boxes so the next try starts fresh; the error stays until typing starts.
      setCode('')
      setCodeError('incorrect')
    }
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

  return (
    <BottomSheet open={open} onClose={onClose} bare ariaLabel="Enter the code">
      <div className="flex flex-col gap-6 pb-[max(32px,env(safe-area-inset-bottom))]">
        <SheetHeader title="Enter the code" titleId={titleId} onClose={onClose} />
        <div className="flex flex-col gap-4 px-4">
          {locked && (
            <Notice tone="error" icon="lock" title="Too many incorrect attempts">
              For your security, code entry is paused. Try again in {formatCountdown(lock, true)} or use a different number.
            </Notice>
          )}
          <div ref={boxesRef} className="flex flex-col gap-2">
            <OtpInput
              value={code}
              onChange={(v) => {
                if (verifying) return
                setCode(v)
                if (codeError === 'incorrect' || codeError === 'expired') setCodeError(null)
              }}
              onComplete={(v) => void verify(v)}
              error={codeError === 'incorrect' || expired}
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

          {locked ? (
            <Button fullWidth variant="secondary" onClick={onDifferentNumber}>
              Use a different number
            </Button>
          ) : expired ? (
            <Button fullWidth loading={sending} onClick={() => void resend()}>
              Send a new code
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 body-s text-text-tertiary">
              {verifying ? (
                <>
                  <Spinner size={16} className="shrink-0" />
                  <span>Checking the code…</span>
                </>
              ) : (
                <>
                  <Icon name="clock" size={16} className="shrink-0" />
                  {resendIn > 0 ? (
                    <span>Resend code in {formatCountdown(resendIn)}</span>
                  ) : (
                    <button type="button" className="cta-m text-text-primary underline underline-offset-4 disabled:opacity-35" disabled={sending} onClick={() => void resend()}>
                      {sending ? 'Sending…' : `Resend code to ${country.dial} ${formatLocal(digits, country)}`}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}
