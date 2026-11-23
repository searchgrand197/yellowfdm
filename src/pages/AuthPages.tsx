import { ArrowLeft } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { MorphingText, type MorphSlide } from '../components/MorphingText'
import { useAuth } from '../context/AuthContext'
import { useWallet } from '../context/WalletContext'

const LOGIN_FOOD_IMAGES = [
  { src: '/media/images/corn_1_1-removebg-preview.png', alt: 'Corn pizza' },
  { src: '/media/images/co_VTiKC12.png', alt: 'Pizza' },
  { src: '/media/images/allo-tikki-burger-removebg-preview.png', alt: 'Aloo tikki burger' },
  { src: '/media/images/aaloo.png', alt: 'Burger' },
  { src: '/media/categoryimg/klipartz.com.png', alt: 'Paneer pizza' },
  { src: '/media/categoryimg/p.png', alt: 'Veg pizza' },
  { src: '/media/categoryimg/pastaa.png', alt: 'Pasta' },
]

const LOGIN_MORPH_SLIDES: MorphSlide[] = [
  { type: 'text', value: 'Beat' },
  { type: 'text', value: 'the' },
  { type: 'text', value: 'hunger' },
  { type: 'random-image', pool: LOGIN_FOOD_IMAGES },
]

function PhoneLoginForm() {
  const { refresh } = useAuth()
  const { setPhone: setWalletPhone, refresh: refreshWallet } = useWallet()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [devOtpHint, setDevOtpHint] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    if (seconds <= 0) return
    const t = window.setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [seconds])

  const sendOtp = async () => {
    const cleaned = phone.replace(/\D/g, '').slice(-10)
    if (cleaned.length !== 10) {
      setError('Enter a valid 10-digit mobile number')
      return
    }
    setLoading(true)
    setError('')
    setDevOtpHint('')
    try {
      const res = await api.sendOtp(cleaned)
      setPhone(cleaned)
      setOtpSent(true)
      setSeconds(60)
      if (res.dev_otp) {
        setDevOtpHint(`Dev OTP: ${res.dev_otp}`)
        setOtp(res.dev_otp)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send OTP')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    const cleaned = phone.replace(/\D/g, '').slice(-10)
    if (otp.trim().length < 4) {
      setError('Enter the OTP')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await api.verifyOtp(cleaned, otp.trim())
      const loggedPhone = data.phone || cleaned
      setWalletPhone(loggedPhone)
      await refresh()
      await refreshWallet(loggedPhone)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (e?: FormEvent) => {
    e?.preventDefault()
    if (loading) return
    if (otpSent) void verifyOtp()
    else void sendOtp()
  }

  return (
    <div className="onboard-page">
      <div className="onboard-frame">
        <section className="onboard-yellow onboard-yellow--login">
          <div className="onboard-pattern" aria-hidden />

          <button
            type="button"
            className="login-back"
            aria-label="Back to website"
            onClick={() => navigate('/')}
          >
            <ArrowLeft size={20} />
          </button>

          <div className="onboard-content onboard-content--login">
            <p className="onboard-brand">Foodporium</p>
            <h1>Login with your phone</h1>
            <p>
              {otpSent
                ? `Enter the OTP sent to +91 ${phone}`
                : 'Enter your mobile number to get a one-time password and start ordering.'}
            </p>

            <form className="onboard-login-form" onSubmit={onSubmit} id="phone-login-form">
              {!otpSent ? (
                <label>
                  Mobile number
                  <div className="phone-field">
                    <span>+91</span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      inputMode="numeric"
                      placeholder="10-digit number"
                      required
                      autoFocus
                    />
                  </div>
                </label>
              ) : (
                <label>
                  Enter OTP
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    placeholder="6-digit OTP"
                    required
                    autoFocus
                  />
                </label>
              )}
              {devOtpHint ? <p className="form-hint">{devOtpHint}</p> : null}
              {error && <p className="form-error">{error}</p>}
              {otpSent && (
                <button
                  type="button"
                  className="onboard-change-num"
                  disabled={seconds > 0 || loading}
                  onClick={() => {
                    setOtpSent(false)
                    setOtp('')
                    setDevOtpHint('')
                    setError('')
                  }}
                >
                  {seconds > 0 ? `Change number (${seconds}s)` : 'Change number'}
                </button>
              )}
            </form>
          </div>

          <MorphingText
            slides={LOGIN_MORPH_SLIDES}
            nextLabel={loading ? (otpSent ? 'Verifying…' : 'Sending…') : otpSent ? 'Verify' : 'Next'}
            nextDisabled={loading}
            onNext={() => onSubmit()}
          />
        </section>
      </div>
    </div>
  )
}

export function LoginPage() {
  return <PhoneLoginForm />
}

export function SignupPage() {
  return <PhoneLoginForm />
}
