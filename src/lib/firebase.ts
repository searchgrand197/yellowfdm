import { initializeApp } from 'firebase/app'
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyAvRobkSXCsNFOdogIFwKuN95nLOQIkXoI',
  authDomain: 'kushnath-19401.firebaseapp.com',
  projectId: 'kushnath-19401',
  storageBucket: 'kushnath-19401.firebasestorage.app',
  messagingSenderId: '704991416939',
  appId: '1:704991416939:web:ccf9033058042dadf4d72e',
  measurementId: 'G-VYRLCTDEKM',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier
    confirmationResult?: ConfirmationResult
  }
}

export function clearRecaptcha() {
  try {
    window.recaptchaVerifier?.clear()
  } catch {
    /* ignore */
  }
  window.recaptchaVerifier = undefined
  const el = document.getElementById('recaptcha-container')
  if (el) el.replaceChildren()
}

function otpErrorMessage(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : ''
  const raw = err instanceof Error ? err.message : 'Could not send OTP'
  if (code === 'auth/invalid-phone-number') return 'Enter a valid 10-digit mobile number'
  if (code === 'auth/too-many-requests') return 'Too many attempts. Wait a bit and try again'
  if (code === 'auth/captcha-check-failed' || code === 'auth/invalid-app-credential') {
    return 'Captcha failed. Refresh the page and try again'
  }
  if (code === 'auth/quota-exceeded') return 'SMS quota exceeded. Try again later'
  if (code === 'auth/operation-not-allowed') {
    return 'Phone login is not enabled in Firebase. Enable Phone Authentication in the console.'
  }
  if (code === 'auth/code-expired') return 'OTP expired. Request a new one'
  if (code === 'auth/invalid-verification-code') return 'Invalid OTP. Check the code and try again'
  if (raw.includes('reCAPTCHA')) return 'Captcha failed. Refresh the page and try again'
  return raw.replace(/^Firebase:\s*/i, '').replace(/\s*\(.*\)\s*$/, '') || 'Could not send OTP'
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      (v) => {
        window.clearTimeout(t)
        resolve(v)
      },
      (e) => {
        window.clearTimeout(t)
        reject(e)
      },
    )
  })
}

export function getRecaptcha(containerId = 'recaptcha-container') {
  if (window.recaptchaVerifier) {
    return window.recaptchaVerifier
  }
  const el = document.getElementById(containerId)
  if (!el) {
    throw new Error('Login captcha container missing — refresh and try again')
  }
  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      /* solved */
    },
    'expired-callback': () => {
      clearRecaptcha()
    },
  })
  return window.recaptchaVerifier
}

export async function sendPhoneOtp(phone10: string) {
  clearRecaptcha()
  const verifier = getRecaptcha()
  try {
    const confirmation = await withTimeout(
      signInWithPhoneNumber(auth, `+91${phone10}`, verifier),
      25000,
      'OTP request timed out. Check your connection, refresh, and try again.',
    )
    window.confirmationResult = confirmation
    return confirmation
  } catch (err) {
    clearRecaptcha()
    throw new Error(otpErrorMessage(err))
  }
}

export async function confirmPhoneOtp(otp: string) {
  if (!window.confirmationResult) {
    throw new Error('Request OTP first')
  }
  try {
    return await window.confirmationResult.confirm(otp)
  } catch (err) {
    throw new Error(otpErrorMessage(err))
  }
}

export async function firebaseLogout() {
  await signOut(auth)
  clearRecaptcha()
  window.confirmationResult = undefined
}
