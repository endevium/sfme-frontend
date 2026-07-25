import React, { useEffect, useState, useRef } from 'react'
import logo from '../assets/navbar-logo.png'
import studentGroupImg from '../assets/group-students.png'
import SafeImg from './SafeImg'
import { saveToken, saveUser, saveTokens } from '../utils/auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

const OTPModal = ({
  isOpen,
  onClose,
  onVerified,
  sendEndpoint = '/otp/send/',
  verifyEndpoint = '/otp/verify/',
  initialPendingToken = null,
  initialEmail = '',
  initialExpiresAt = null,
  initialRole = 'student',
  initialPurpose = 'login',
}) => {
  const [email, setEmail] = useState(initialEmail)
  const [role, setRole] = useState(initialRole)
  const [purpose, setPurpose] = useState(initialPurpose)

  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [pendingToken, setPendingToken] = useState(null)
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [expiresAt, setExpiresAt] = useState(null)
  const [countdown, setCountdown] = useState(null)
  const inputsRef = useRef([])

  // Allow resend only after countdown reaches 00:00
  const canResend = countdown === '00:00'

  useEffect(() => {
    if (!expiresAt) return
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now()
      if (ms <= 0) {
        setCountdown('00:00')
        return
      }
      const mins = Math.floor(ms / 60000).toString().padStart(2, '0')
      const secs = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0')
      setCountdown(`${mins}:${secs}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  useEffect(() => {
    if (!isOpen) {
      // reset on close
      setEmail(initialEmail || '')
      setRole(initialRole || 'student')
      setPurpose(initialPurpose || 'login')
      setPendingToken(null)
      setOtp('')
      setError('')
      setInfo('')
      setExpiresAt(null)
      setCountdown(null)
    } else {
      // when opened, prefill email/role/purpose; if initial pending token provided, show verify form
      setEmail(initialEmail || '')
      setRole(initialRole || 'student')
      setPurpose(initialPurpose || 'login')
      setPendingToken(initialPendingToken || null)
      if (initialPendingToken && initialExpiresAt) setExpiresAt(initialExpiresAt)
    }
  }, [isOpen])

  const sendOtp = async (e) => {
    e && e.preventDefault()
    setError('')
    setInfo('')
    if (!email) return setError('Please enter an email')
    const genericSendError = 'Unable to send verification code. Please try again.'
    setIsSending(true)
    try {
      const res = await fetch(`${API_BASE_URL}${sendEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, purpose }),
      })
      const data = await res.json()
      console.log('sendOtp response', res.status, data)
      if (!res.ok) {
        // Keep details in console but show a single user-friendly message in the modal.
        const debugMsg = data?.detail || data?.error || data?.message || genericSendError
        console.error('sendOtp failed', res.status, debugMsg)
        setError(genericSendError)
        return
      }

      // Expecting at least `pending_token` and optionally `expires_at` in ISO format
      setPendingToken(data.pending_token || data.pendingToken || null)
      if (data.expires_at) setExpiresAt(data.expires_at)
      else setExpiresAt(new Date(Date.now() + (data.ttl_minutes || 5) * 60000).toISOString())
      setInfo('OTP sent. Check your email for the code.')
    } catch  {
      setError(genericSendError)
    } finally {
      setIsSending(false)
    }
  }

  const verifyOtp = async (e) => {
    e && e.preventDefault()
    setError('')
    setIsVerifying(true)
    if (!pendingToken) return setError('No pending verification in progress')
    if (!otp || otp.length < 4) return setError('Enter the code')
    try {
      const res = await fetch(`${API_BASE_URL}${verifyEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pending_token: pendingToken, otp }),
      })
      const data = await res.json()
      console.log('verifyOtp response', res.status, data)

      if (res.status === 403 && data?.password_expired) {
        if (onVerified) onVerified(data)
        setInfo(data?.detail || 'Password expired. Please change your password.')
        onClose && onClose()
        return
      }

      if (!res.ok) {
        const msg = data?.detail || data?.error || data?.message || 'Verification failed. Please check the code and try again.'
        console.error('verifyOtp failed', res.status, msg)
        setError(msg)
        return
      }

      if (onVerified) {
        onVerified(data)
      } else if (data?.access || data?.token) {
        try {
          const userType = data.user_type || data.userType || 'student'

          if (data?.access) {
            saveTokens({ access: data.access, refresh: data.refresh })
          } else {
            // legacy backend response
            saveToken(data.token)
          }

          saveUser(data)

          if (userType === 'student') {
            window.history.pushState({}, '', '/dashboard')
            window.dispatchEvent(new PopStateEvent('popstate'))
            window.location.reload()
          } else if (userType === 'faculty') {
            window.history.pushState({}, '', '/faculty-dashboard')
            window.dispatchEvent(new PopStateEvent('popstate'))
            window.location.reload()
          } else if (userType === 'department_head' || userType === 'depthead') {
            window.history.pushState({}, '', '/depthead-dashboard')
            window.dispatchEvent(new PopStateEvent('popstate'))
            window.location.reload()
          }
        } catch (e) {
          console.error('fallback login failed', e)
        }
      }

      setInfo('OTP verified — logging you in...')
      onClose && onClose()
    } catch  {
      console.error('Network error while verifying OTP')
      setError('Network error while verifying OTP')
    } finally {
      setIsVerifying(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 w-full h-full bg-black/85 flex justify-center items-center z-[9999] backdrop-blur-[5px] p-4"
    >
      <div
        className="font-upang bg-[#23344E] bg-gradient-to-b from-[#28625C] to-[#23344E] w-full max-w-[1100px] max-h-[92vh] rounded-[20px] relative overflow-y-auto text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-5 z-50 text-white text-[32px] hover:text-[#ffcc00] transition-colors"
          onClick={onClose}
          aria-label="close"
        >
          &times;
        </button>

        {/* Use min-h-[420px] and adjust image positioning to match LoginModal */}
        <div className="flex flex-col lg:flex-row lg:min-h-[420px] select-none">
          <div className="hidden lg:flex lg:flex-1 relative bg-transparent items-end justify-start overflow-visible pl-8 pr-4 py-8">
            <SafeImg
              src={studentGroupImg}
              alt="Students"
              className="w-full h-auto z-0 object-contain -translate-x-[-3%] translate-y-[-12%] scale-[1.42]"
            />
          </div>

          <div className="flex-1 lg:flex-[1.2] p-6 sm:p-10 lg:p-12">
            <div className="flex justify-center lg:justify-start items-center mb-6">
              <SafeImg 
                src={logo} 
                alt="Logo" 
                className="w-[220px] sm:w-[300px] lg:w-[400px] h-auto" 
              />
            </div>
            <div className="mb-4">
              <h1 className="text-2xl font-black">Verification Code</h1>
              <p className="opacity-70 text-sm mt-1">Enter the code sent to your email to continue.</p>
            </div>

            <div role="form" aria-label="verify-otp-form">
              {!pendingToken ? (
                <div className="p-6">
                  <p className="mb-3">Request a verification code to the email below.</p>
                  <div className="mb-4">
                    <label className="block mb-2 text-xs font-bold uppercase tracking-wider opacity-80">Email</label>
                    <div className="flex items-center bg-white rounded-xl py-3 px-4">
                      <input
                        type="email"
                        placeholder="name@upang.edu.ph"
                        className="flex-1 border-none outline-none font-medium text-slate-800 bg-transparent placeholder:text-slate-300"
                        value={email}
                        onChange={(e) => setEmail(e.target.value.replace(/[^A-Za-z0-9@._+\-]/g, ''))}
                        autoComplete="email"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={sendOtp} disabled={isSending} className="flex-1 py-3 bg-[#ffcc00] text-[#041c32] rounded-xl font-black disabled:opacity-70 disabled:cursor-not-allowed">{isSending ? 'SENDING...' : 'SEND CODE'}</button>
                    <button type="button" onClick={() => { setEmail(''); setError(''); }} className="py-3 px-4 border rounded-xl bg-white/5 text-white">Clear</button>
                  </div>
                  {error && <div className="mt-3 text-sm text-[#ffcc00] font-semibold">{error}</div>}
                  {info && <div className="mt-3 text-sm text-green-300 font-semibold">{info}</div>}
                </div>
              ) : (
                <div>
                <div className="space-y-4">
                  <p className="text-sm mb-1">We sent a code to <b>{email}</b>. Enter it below.</p>

                  <div>
                    <label className="block mb-2 text-xs font-bold uppercase tracking-wider opacity-80">Code</label>
                    <div className="relative rounded-xl py-6 px-4 flex items-center justify-center">
                      {/* Visual six-box display (keeps single input and handlers unchanged) */}
                      <div className="grid grid-cols-6 gap-4 w-full max-w-sm justify-center">
                        {[0,1,2,3,4,5].map((i) => (
                          <input
                            key={i}
                            ref={(el) => (inputsRef.current[i] = el)}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={otp?.[i] || ''}
                            onChange={(e) => {
                              const ch = (e.target.value || '').replace(/[^0-9]/g, '').slice(0,1)
                              const arr = (otp || '').split('').slice(0,6)
                              while (arr.length < 6) arr.push('')
                              arr[i] = ch
                              const newOtp = arr.join('').replace(/\s+/g, '').slice(0,6)
                              setOtp(newOtp)
                              if (ch && i < 5) {
                                const next = inputsRef.current[i+1]
                                next && next.focus()
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { verifyOtp(); return }
                              if (e.key === 'Backspace') {
                                if ((otp?.[i] || '') === '') {
                                  const prev = inputsRef.current[i-1]
                                  prev && prev.focus()
                                } else {
                                  const arr = (otp || '').split('').slice(0,6)
                                  arr[i] = ''
                                  setOtp(arr.join('').slice(0,6))
                                }
                              } else if (e.key === 'ArrowLeft') {
                                const prev = inputsRef.current[i-1]
                                prev && prev.focus()
                              } else if (e.key === 'ArrowRight') {
                                const next = inputsRef.current[i+1]
                                next && next.focus()
                              }
                            }}
                            onPaste={(e) => {
                              const paste = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '').slice(0,6-i)
                              if (!paste) return
                              e.preventDefault()
                              const arr = (otp || '').split('').slice(0,6)
                              while (arr.length < 6) arr.push('')
                              for (let j = 0; j < paste.length; j++) {
                                arr[i + j] = paste[j]
                              }
                              const newOtp = arr.join('').slice(0,6)
                              setOtp(newOtp)
                              const focusIdx = Math.min(5, i + paste.length)
                              const next = inputsRef.current[focusIdx]
                              next && next.focus()
                            }}
                            className="w-12 
                            sm:w-14 
                            h-14 
                            bg-white
                            rounded-xl 
                            flex items-center 
                            justify-center 
                            border border-white/10 text-center text-slate-800 text-2xl font-black shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ffcc00]"
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-white/80">
                    {/* <div>Token: {pendingToken ? `${pendingToken.slice(0, 8)}...` : '-'}</div> */}
                    <div>Expires: {countdown || '—'}</div>
                  </div>

                  {error && <div className="mt-2 text-sm text-[#ffcc00] font-semibold">{error}</div>}
                </div>

                  <div className="flex gap-2 mt-4">
                  <button type="button" onClick={verifyOtp} disabled={isVerifying} className="flex-1 py-4 bg-[#ffcc00] text-[#041c32] font-black rounded-xl shadow-lg hover:bg-[#e6b800] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                    {isVerifying ? 'VERIFYING...' : 'VERIFY'}
                  </button>
                  <button
                    type="button"
                    className="py-4 px-4 border rounded-xl bg-white/5 text-white disabled:opacity-70 disabled:cursor-not-allowed"
                    onClick={sendOtp}
                    disabled={isSending || !canResend}
                    title={canResend ? 'Resend code' : `Resend available in ${countdown || '—:—'}`}>
                    {isSending ? 'RESENDING...' : (canResend ? 'RESEND' : `RESEND (${countdown || '—:—'})`)}
                  </button>
                </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OTPModal
