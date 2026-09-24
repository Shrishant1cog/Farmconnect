'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Sprout, Mail, Lock, Phone, Eye, EyeOff, AlertCircle, 
  Loader2, ArrowRight, UserCheck, ShieldCheck, RefreshCw, CheckCircle2 
} from 'lucide-react';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult 
} from 'firebase/auth';
import { auth as firebaseAuth } from '../../../lib/firebase';
import { fetchApi } from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect');
  const auth = useAuth() as any;

  // Active Login Method
  const [authMethod, setAuthMethod] = useState<'PHONE' | 'PASSWORD'>('PASSWORD');

  // Password Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Phone OTP Form State
  const [role, setRole] = useState<'CONSUMER' | 'FARMER'>('CONSUMER');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpStep, setOtpStep] = useState<'PHONE_ENTRY' | 'OTP_ENTRY'>('PHONE_ENTRY');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);

  // Operational State
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Authenticating credentials...');
  const [error, setError] = useState<string | null>(null);

  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
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

  const initRecaptcha = () => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch {
        // ignore
      }
    }
    recaptchaVerifierRef.current = new RecaptchaVerifier(firebaseAuth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {},
      'expired-callback': () => {
        setError('Security verification expired. Please request OTP again.');
      },
    });
  };

  const persistSession = (token: string, user: any) => {
    localStorage.setItem('farmconnect_token', token);
    localStorage.setItem('farmconnect_user', JSON.stringify(user));
    document.cookie = `farmconnect_token=${token}; path=/; max-age=604800; SameSite=Lax`;
    document.cookie = `farmconnect_role=${user.role}; path=/; max-age=604800; SameSite=Lax`;
  };

  // Determine correct destination based on role and sanity check redirectPath
  const resolveTargetDestination = (resolvedRole: string): string => {
    const isFarmer = resolvedRole.toUpperCase() === 'FARMER';
    const defaultDestination = isFarmer ? '/farmer/dashboard' : '/consumer/explore';

    if (redirectPath) {
      // Only honor redirectPath if it belongs to the user's role
      if (isFarmer && redirectPath.startsWith('/farmer')) {
        return redirectPath;
      }
      if (!isFarmer && (redirectPath.startsWith('/consumer') || redirectPath.startsWith('/checkout'))) {
        return redirectPath;
      }
    }

    return defaultDestination;
  };

  // ----------------------------------------------------
  // EMAIL & PASSWORD LOGIN
  // ----------------------------------------------------
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setLoadingMessage('Verifying credentials...');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      const res = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
        }),
      });

      const token = res?.token || res?.data?.token;
      let user = res?.user || res?.data?.user;

      if (!token || !user) {
        throw new Error('Authentication response is missing session credentials.');
      }

      // Hard-bind role for seed accounts
      let resolvedRole = (user.role || '').toUpperCase();
      if (cleanEmail === 'farmer@farmconnect.com') {
        resolvedRole = 'FARMER';
        user = { ...user, role: 'FARMER' };
      } else if (cleanEmail === 'consumer@farmconnect.com') {
        resolvedRole = 'CONSUMER';
        user = { ...user, role: 'CONSUMER' };
      }

      persistSession(token, user);

      setLoadingMessage('Preparing your workspace...');
      const targetDestination = resolveTargetDestination(resolvedRole);
      window.location.href = targetDestination;
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // MOBILE OTP LOGIN
  // ----------------------------------------------------
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    setLoadingMessage('Sending verification code...');

    try {
      initRecaptcha();
      const appVerifier = recaptchaVerifierRef.current!;
      const fullPhoneNumber = `${countryCode}${cleanPhone}`;
      
      const confirmationResult = await signInWithPhoneNumber(firebaseAuth, fullPhoneNumber, appVerifier);
      confirmationResultRef.current = confirmationResult;

      setOtpStep('OTP_ENTRY');
      setResendTimer(60);
      setLoading(false);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/invalid-phone-number') {
        setError('Invalid mobile number format.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a few minutes.');
      } else {
        setError(err.message || 'Failed to dispatch OTP SMS.');
      }
      setLoading(false);
    }
  };

  const handleOtpInput = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;

    const nextDigits = [...otpDigits];
    nextDigits[index] = val.slice(-1);
    setOtpDigits(nextDigits);

    if (val && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const nextDigits = [...otpDigits];
    pasted.split('').forEach((char, idx) => {
      if (idx < 6) nextDigits[idx] = char;
    });
    setOtpDigits(nextDigits);
    const targetIdx = Math.min(pasted.length, 5);
    otpInputsRef.current[targetIdx]?.focus();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fullCode = otpDigits.join('');
    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits of the OTP.');
      return;
    }

    if (!confirmationResultRef.current) {
      setError('Verification session expired. Please re-enter your mobile number.');
      setOtpStep('PHONE_ENTRY');
      return;
    }

    setLoading(true);
    setLoadingMessage('Verifying OTP & securing session...');

    try {
      const userCredential = await confirmationResultRef.current.confirm(fullCode);
      const idToken = await userCredential.user.getIdToken();

      const res = await fetchApi('/auth/firebase-phone', {
        method: 'POST',
        body: JSON.stringify({
          idToken,
          role,
        }),
      });

      const token = res?.token || res?.data?.token;
      let user = res?.user || res?.data?.user;

      if (!token || !user) {
        throw new Error('Authentication response is missing session credentials.');
      }

      const resolvedRole = (role || user.role || 'CONSUMER').toUpperCase();
      user = { ...user, role: resolvedRole };

      persistSession(token, user);

      setLoadingMessage('Entering workspace...');
      const targetDestination = resolveTargetDestination(resolvedRole);
      window.location.href = targetDestination;
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/invalid-verification-code') {
        setError('Incorrect OTP. Please check the code received.');
      } else if (code === 'auth/code-expired') {
        setError('OTP has expired. Please request a new code.');
      } else {
        setError(err.message || 'OTP verification failed.');
      }
      setLoading(false);
    }
  };

  return (
    <>
      <div id="recaptcha-container" />

      {/* Full-Screen Transition Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[100] bg-stone-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="relative flex items-center justify-center mb-6">
            <div className="w-24 h-24 rounded-3xl bg-emerald-500/20 animate-ping absolute" />
            <div className="w-20 h-20 rounded-2xl bg-emerald-800 border border-emerald-500/40 flex items-center justify-center shadow-2xl relative z-10">
              <Sprout className="w-10 h-10 text-emerald-300 animate-bounce" />
            </div>
          </div>

          <div className="text-center space-y-2 max-w-sm">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700 text-emerald-400 text-[11px] font-black uppercase tracking-wider">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Secure Authentication
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              {loadingMessage}
            </h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              Please wait while FarmConnect prepares your session and workspace.
            </p>
          </div>
        </div>
      )}

      {/* Login Card */}
      <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-stone-200/90 shadow-2xl max-w-md w-full p-6 sm:p-10 space-y-6 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-950/20">
              <Sprout className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight pt-2">
              Welcome to FarmConnect
            </h1>
            <p className="text-xs text-stone-500 font-medium">
              Direct Karnataka farm-to-door agricultural exchange.
            </p>
          </div>

          {/* Authentication Mode Switcher */}
          <div className="flex border-b border-stone-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setAuthMethod('PHONE'); setError(null); }}
              className={`flex-1 pb-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                authMethod === 'PHONE'
                  ? 'border-emerald-800 text-emerald-900 font-black'
                  : 'border-transparent text-stone-400 hover:text-stone-700'
              }`}
            >
              <Phone className="w-3.5 h-3.5" /> Mobile OTP
            </button>
            <button
              type="button"
              onClick={() => { setAuthMethod('PASSWORD'); setError(null); }}
              className={`flex-1 pb-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                authMethod === 'PASSWORD'
                  ? 'border-emerald-800 text-emerald-900 font-black'
                  : 'border-transparent text-stone-400 hover:text-stone-700'
              }`}
            >
              <Mail className="w-3.5 h-3.5" /> Email & Password
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-red-700 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* TAB 1: PHONE OTP */}
          {authMethod === 'PHONE' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-2xl border border-stone-200">
                <button
                  type="button"
                  onClick={() => setRole('CONSUMER')}
                  className={`py-2 rounded-xl text-xs font-black transition-all ${
                    role === 'CONSUMER'
                      ? 'bg-white text-emerald-900 shadow-xs'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  Buyer (Consumer)
                </button>
                <button
                  type="button"
                  onClick={() => setRole('FARMER')}
                  className={`py-2 rounded-xl text-xs font-black transition-all ${
                    role === 'FARMER'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  Cultivator (Farmer)
                </button>
              </div>

              {otpStep === 'PHONE_ENTRY' ? (
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
                          placeholder="98765 43210"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-stone-400 mt-1.5 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      An SMS verification code will be sent to your phone
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !phoneNumber.trim()}
                    className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/15 transition-all active:scale-95"
                  >
                    Send Verification Code <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in fade-in duration-150">
                  <div className="text-center space-y-1">
                    <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Enter 6-Digit OTP
                    </span>
                    <p className="text-xs text-stone-500">
                      Sent to <strong className="text-stone-900">{countryCode} {phoneNumber}</strong>{' '}
                      <button
                        type="button"
                        onClick={() => setOtpStep('PHONE_ENTRY')}
                        className="text-emerald-800 underline font-bold hover:text-emerald-950 ml-1"
                      >
                        Change
                      </button>
                    </p>
                  </div>

                  <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { otpInputsRef.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpInput(idx, e.target.value)}
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
                        <RefreshCw className="w-3 h-3" /> Resend Code
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otpDigits.join('').length !== 6}
                    className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/15 transition-all active:scale-95"
                  >
                    Verify & Access Account <CheckCircle2 className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* TAB 2: EMAIL & PASSWORD */
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="you@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Your account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/15 transition-all active:scale-95 pt-3"
              >
                Sign In <ArrowRight className="w-4 h-4" />
              </button>

              {/* Seed Credentials Bar */}
              <div className="pt-3 border-t border-stone-100 space-y-2">
                <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider block text-center">
                  Quick-Fill Test Credentials
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('farmer@farmconnect.com');
                      setPassword('password123');
                    }}
                    className="p-2 rounded-xl bg-stone-50 hover:bg-emerald-50 border border-stone-200 text-[11px] font-bold text-stone-700 text-left transition-colors flex items-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-700" /> Cultivator Seed
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('consumer@farmconnect.com');
                      setPassword('password123');
                    }}
                    className="p-2 rounded-xl bg-stone-50 hover:bg-emerald-50 border border-stone-200 text-[11px] font-bold text-stone-700 text-left transition-colors flex items-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-700" /> Buyer Seed
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="text-center pt-2 border-t border-stone-100">
            <p className="text-xs text-stone-500 font-medium">
              Don't have an account yet?{' '}
              <Link
                href="/register"
                className="text-emerald-800 hover:text-emerald-900 font-bold underline decoration-emerald-800/40"
              >
                Register here
              </Link>
            </p>
          </div>

        </div>
      </div>
    </>
  );
}