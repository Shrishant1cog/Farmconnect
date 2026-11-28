'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, ArrowRight, Loader2, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import {
  auth,
  setupRecaptcha,
  isFirebasePhoneAuthConfigured,
  SMS_UNAVAILABLE_CODES,
} from '../../lib/firebase';
import { useI18n } from '../../hooks/useI18n';
import { signInWithPhoneNumber } from 'firebase/auth';

interface PhoneAuthFormProps {
  role: 'CONSUMER' | 'FARMER';
  onSuccess?: () => void;
}

export default function PhoneAuthForm({ role, onSuccess }: PhoneAuthFormProps) {
  const { t } = useI18n();
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  useEffect(() => {
    // Reset reCAPTCHA container on unmount
    return () => {
      if (typeof window !== 'undefined' && (window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
          (window as any).recaptchaVerifier = null;
        } catch {
          // Ignore cleanup issues
        }
      }
    };
  }, []);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError(t('auth.phone.errorInvalidPhone'));
      return;
    }

    const formattedNumber = `+91${cleanPhone.slice(-10)}`;
    setLoading(true);

    try {
      if (!isFirebasePhoneAuthConfigured) {
        // The message service is not configured. There is **no** test
        // code: a sign-in without a real code would open the account of
        // whoever owns the number.
        throw new Error(t('auth.phone.errorSmsUnavailable'));
      }

      const appVerifier = setupRecaptcha('recaptcha-container');
      const confirmation = await signInWithPhoneNumber(auth, formattedNumber, appVerifier);
      setConfirmationResult(confirmation);
      setStep('OTP');
    } catch (err: any) {
      console.warn('Firebase SMS attempt notice:', err?.code || err?.message);

      if (
        SMS_UNAVAILABLE_CODES.includes(err?.code) ||
        !isFirebasePhoneAuthConfigured
      ) {
        setError(t('auth.phone.errorSmsUnavailable'));
      } else {
        setError(err?.message || t('auth.phone.errorUnableDispatch'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.length < 6) {
      setError(t('auth.phone.errorInvalidOtpLength'));
      return;
    }

    setLoading(true);

    try {
      if (!confirmationResult) {
        // No code was ever sent — there is nothing to confirm.
        throw new Error(t('auth.phone.errorSmsUnavailable'));
      }

      // The code is confirmed by the message service. The backend then
      // verifies the **ID token** of that confirmation, so the session is
      // only issued for a number whose owner really received the code.
      const confirmation = await confirmationResult.confirm(otp);
      const idToken = await confirmation.user.getIdToken();

      const res = await fetchApi('/auth/firebase-phone', {
        method: 'POST',
        body: JSON.stringify({ idToken, role }),
      });

      const token = res?.data?.token || res?.token;
      const user = res?.data?.user || res?.user;

      if (!token || !user) {
        throw new Error(t('auth.phone.errorVerificationFailed'));
      }

      localStorage.setItem('farmconnect_token', token);
      localStorage.setItem('fc_token', token);
      localStorage.setItem('farmconnect_role', user.role || role);
      localStorage.setItem('farmconnect_user', JSON.stringify(user));
      localStorage.setItem('fc_user', JSON.stringify(user));

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(role === 'FARMER' ? '/farmer/dashboard' : '/consumer/explore');
      }
    } catch (err: any) {
      setError(err?.message || t('auth.phone.errorVerificationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Invisible reCAPTCHA Anchor */}
      <div id="recaptcha-container" />

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {step === 'PHONE' ? (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase text-stone-700 block mb-1">
              {t('auth.phone.mobileNumber')}
            </label>
            <div className="flex gap-2">
              <span className="px-3.5 py-2.5 bg-stone-100 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 flex items-center">
                {t('auth.phone.countryCode')}
              </span>
              <input
                type="tel"
                maxLength={10}
                required
                placeholder={t('auth.phone.phonePlaceholder')}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              {t('auth.phone.smsHelper')}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {loading ? t('auth.phone.sendingOtp') : t('auth.phone.sendCode')}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase text-stone-700 block mb-1">
              {t('auth.phone.otpLabel')}
            </label>
            <input
              type="text"
              maxLength={6}
              required
              autoFocus
              placeholder={t('auth.phone.otpPlaceholder')}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center tracking-widest text-lg font-black py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {loading ? t('auth.phone.verifyingOtp') : t('auth.phone.verifyWorkspace')}
          </button>

          <button
            type="button"
            onClick={() => setStep('PHONE')}
            className="w-full text-center text-xs font-bold text-stone-500 hover:text-stone-800"
          >
            {t('auth.phone.changeMobile')}
          </button>
        </form>
      )}
    </div>
  );
}