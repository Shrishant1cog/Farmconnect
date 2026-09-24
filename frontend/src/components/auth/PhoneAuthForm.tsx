'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, ArrowRight, Loader2, AlertCircle, CheckCircle2, ShieldCheck, KeyRound } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { auth, setupRecaptcha } from '../../lib/firebase';
import { signInWithPhoneNumber } from 'firebase/auth';

interface PhoneAuthFormProps {
  role: 'CONSUMER' | 'FARMER';
  onSuccess?: () => void;
}

export default function PhoneAuthForm({ role, onSuccess }: PhoneAuthFormProps) {
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [isTestBypass, setIsTestBypass] = useState(false);

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
      setError('Please provide a valid 10-digit mobile number.');
      return;
    }

    const formattedNumber = `+91${cleanPhone.slice(-10)}`;
    setLoading(true);

    try {
      if (!auth) {
        throw new Error('Firebase Auth is not initialized. Using local verification mode.');
      }

      const appVerifier = setupRecaptcha('recaptcha-container');
      const confirmation = await signInWithPhoneNumber(auth, formattedNumber, appVerifier);
      setConfirmationResult(confirmation);
      setStep('OTP');
    } catch (err: any) {
      console.warn('Firebase SMS attempt notice:', err?.code || err?.message);

      // If Firebase blocked India or config was missing, switch cleanly to test mode
      if (
        err?.code === 'auth/operation-not-allowed' ||
        err?.code === 'auth/configuration-not-found' ||
        err?.code === 'auth/invalid-app-credential' ||
        !auth
      ) {
        setIsTestBypass(true);
        setStep('OTP');
        setError(null);
      } else {
        setError(err?.message || 'Unable to dispatch verification SMS.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.length < 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);

    try {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);

      // 1. If using Firebase live confirmation
      if (confirmationResult && !isTestBypass) {
        await confirmationResult.confirm(otp);
      } else if (isTestBypass && otp !== '123456') {
        throw new Error('Invalid test code. Enter 123456 to verify.');
      }

      // 2. Complete session with backend
      const res = await fetchApi('/auth/login-phone', {
        method: 'POST',
        body: JSON.stringify({
          phone: cleanPhone,
          role,
        }),
      });

      const token = res?.data?.token || res?.token;
      const user = res?.data?.user || res?.user;

      if (token && user) {
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
      } else {
        router.push(role === 'FARMER' ? '/farmer/dashboard' : '/consumer/explore');
      }
    } catch (err: any) {
      setError(err?.message || 'Verification code failed. Please try again.');
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

      {/* Test Bypass Notification */}
      {isTestBypass && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-900">
          <KeyRound className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            <strong>Local Dev Mode:</strong> Region SMS is restricted. Use test OTP: <strong>123456</strong>
          </span>
        </div>
      )}

      {step === 'PHONE' ? (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase text-stone-700 block mb-1">
              Mobile Number
            </label>
            <div className="flex gap-2">
              <span className="px-3.5 py-2.5 bg-stone-100 border border-stone-200 rounded-xl text-xs font-bold text-stone-700 flex items-center">
                IN +91
              </span>
              <input
                type="tel"
                maxLength={10}
                required
                placeholder="8073477125"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <p className="text-[11px] text-stone-400 mt-1">An SMS verification code will be sent to your phone.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {loading ? 'Sending OTP Code...' : 'Send Verification Code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase text-stone-700 block mb-1">
              Enter 6-Digit OTP Code
            </label>
            <input
              type="text"
              maxLength={6}
              required
              autoFocus
              placeholder="123456"
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
            {loading ? 'Verifying OTP...' : 'Verify & Enter Workspace'}
          </button>

          <button
            type="button"
            onClick={() => setStep('PHONE')}
            className="w-full text-center text-xs font-bold text-stone-500 hover:text-stone-800"
          >
            Change Mobile Number
          </button>
        </form>
      )}
    </div>
  );
}