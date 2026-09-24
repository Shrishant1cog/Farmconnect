'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult 
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { fetchApi } from '../../lib/api';
import { 
  Phone, Loader2, ArrowRight, RefreshCw, 
  AlertCircle, CheckCircle2, ShieldCheck, Sprout, ShoppingBag 
} from 'lucide-react';

interface PhoneAuthFormProps {
  onSuccess?: (user: any) => void;
  defaultRole?: 'CONSUMER' | 'FARMER';
}

export default function PhoneAuthForm({ onSuccess, defaultRole = 'CONSUMER' }: PhoneAuthFormProps) {
  const [role, setRole] = useState<'CONSUMER' | 'FARMER'>(defaultRole);
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const getFriendlyErrorMessage = (err: any) => {
    const code = err?.code || '';
    switch (code) {
      case 'auth/invalid-phone-number':
        return 'Please enter a valid 10-digit mobile number.';
      case 'auth/missing-phone-number':
        return 'Mobile number cannot be empty.';
      case 'auth/quota-exceeded':
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait a few minutes and try again.';
      case 'auth/code-expired':
        return 'This OTP has expired. Please click Resend OTP.';
      case 'auth/invalid-verification-code':
        return 'Incorrect OTP. Please check the code sent to your phone.';
      case 'auth/network-request-failed':
        return 'Network connection issue. Please check your internet.';
      default:
        return err?.message || 'Authentication failed. Please try again.';
    }
  };

  const setupRecaptcha = () => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch {
        // ignore
      }
    }

    recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {},
      'expired-callback': () => {
        setError('Security check expired. Please try sending OTP again.');
      },
    });
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanNumber.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    const fullPhoneNumber = `${countryCode}${cleanNumber}`;
    setLoading(true);

    try {
      setupRecaptcha();
      const appVerifier = recaptchaVerifierRef.current!;
      const confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
      
      confirmationResultRef.current = confirmationResult;
      setStep('OTP');
      setResendTimer(60);
      setError(null);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;

    const newOtp = [...otp];
    newOtp[index] = val.slice(-1);
    setOtp(newOtp);

    if (val && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const digits = pastedData.split('');
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (i < 6) newOtp[i] = digit;
      });
      setOtp(newOtp);
      const nextFocus = Math.min(digits.length, 5);
      otpInputsRef.current[nextFocus]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits of the OTP.');
      return;
    }

    if (!confirmationResultRef.current) {
      setError('Verification session expired. Please re-enter your mobile number.');
      setStep('PHONE');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await confirmationResultRef.current.confirm(otpCode);
      const idToken = await userCredential.user.getIdToken();

      const res = await fetchApi('/auth/firebase-phone', {
        method: 'POST',
        body: JSON.stringify({
          idToken,
          role,
        }),
      });

      const token = res?.token || res?.data?.token;
      const user = res?.user || res?.data?.user;

      if (token && user) {
        localStorage.setItem('farmconnect_token', token);
        localStorage.setItem('farmconnect_user', JSON.stringify(user));
        document.cookie = `farmconnect_token=${token}; path=/; max-age=604800; SameSite=Lax`;
        document.cookie = `farmconnect_role=${user.role || role}; path=/; max-age=604800; SameSite=Lax`;
      }

      if (onSuccess) {
        onSuccess(user);
      } else {
        const dest = role === 'FARMER' ? '/farmer/dashboard' : '/consumer/explore';
        window.location.href = dest;
      }
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div id="recaptcha-container" />

      <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-2xl border border-stone-200">
        <button
          type="button"
          onClick={() => setRole('CONSUMER')}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all ${
            role === 'CONSUMER'
              ? 'bg-white text-emerald-900 shadow-xs'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5 text-emerald-700" />
          <span>Buyer (Consumer)</span>
        </button>

        <button
          type="button"
          onClick={() => setRole('FARMER')}
          className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all ${
            role === 'FARMER'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <Sprout className="w-3.5 h-3.5" />
          <span>Cultivator (Farmer)</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-xs text-red-700 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {step === 'PHONE' && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Mobile Number
            </label>
            <div className="flex gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-24 px-2 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-black text-stone-800 outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="+91">🇮🇳 +91</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+971">🇦🇪 +971</option>
              </select>

              <div className="relative flex-1">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  autoFocus
                  placeholder="98765 43210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
                />
              </div>
            </div>
            <p className="text-[11px] text-stone-400 mt-1.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              We will send a 6-digit verification code via SMS
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !phoneNumber.trim()}
            className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-emerald-950/15 transition-all active:scale-95"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Sending OTP...
              </>
            ) : (
              <>
                Send OTP <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {step === 'OTP' && (
        <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in fade-in duration-200">
          <div className="text-center space-y-1">
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Enter 6-Digit Code
            </span>
            <p className="text-xs text-stone-500">
              Sent to <strong className="text-stone-900">{countryCode} {phoneNumber}</strong>{' '}
              <button
                type="button"
                onClick={() => setStep('PHONE')}
                className="text-emerald-800 underline font-bold hover:text-emerald-950 ml-1"
              >
                Change
              </button>
            </p>
          </div>

          <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { otpInputsRef.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(idx, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                className="w-11 h-12 text-center text-lg font-black bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600 outline-none transition-all text-stone-900"
              />
            ))}
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-stone-500">Didn't receive SMS?</span>
            {resendTimer > 0 ? (
              <span className="text-stone-400 font-bold">
                Resend in {resendTimer}s
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleSendOtp()}
                className="text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Resend OTP
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || otp.join('').length !== 6}
            className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-emerald-950/15 transition-all active:scale-95"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying OTP...
              </>
            ) : (
              <>
                Verify & Continue <CheckCircle2 className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}