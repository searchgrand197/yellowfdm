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
}

export function getRecaptcha(containerId = 'recaptcha-container') {
  if (window.recaptchaVerifier) {
    return window.recaptchaVerifier
  }
  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
  })
  return window.recaptchaVerifier
}

export async function sendPhoneOtp(phone10: string) {
  const verifier = getRecaptcha()
  const confirmation = await signInWithPhoneNumber(auth, `+91${phone10}`, verifier)
  window.confirmationResult = confirmation
  return confirmation
}

export async function confirmPhoneOtp(otp: string) {
  if (!window.confirmationResult) {
    throw new Error('Request OTP first')
  }
  return window.confirmationResult.confirm(otp)
}

export async function firebaseLogout() {
  await signOut(auth)
  clearRecaptcha()
  window.confirmationResult = undefined
}
