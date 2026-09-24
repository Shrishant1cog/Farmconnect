'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sprout, ShoppingBag, ArrowRight, Loader2, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { fetchApi } from '../../../lib/api';

export default function RegisterPage() {
  const router = useRouter();

  const [role, setRole] = useState<'CONSUMER' | 'FARMER'>('FARMER');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    farmName: '',
    district: 'Mandya',
    state: 'Karnataka',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (role === 'FARMER' && !formData.farmName.trim()) {
      setErrorMessage('Please provide your Farm or Orchard name.');
      return;
    }

    setLoading(true);

    try {
      const payload: Record<string, any> = {
        name: formData.name.trim(),
        phone: cleanPhone.slice(-10),
        email: formData.email.trim() ? formData.email.trim().toLowerCase() : undefined,
        password: formData.password,
        role,
      };

      if (role === 'FARMER') {
        payload.farmName = formData.farmName.trim();
        payload.district = formData.district;
        payload.state = formData.state;
      }

      const res = await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const token = res?.data?.token || res?.token;
      const user = res?.data?.user || res?.user;

      if (token && user) {
        // Sync both token and user key formats
        localStorage.setItem('farmconnect_token', token);
        localStorage.setItem('fc_token', token);
        localStorage.setItem('farmconnect_role', user.role || role);
        localStorage.setItem('farmconnect_user', JSON.stringify(user));
        localStorage.setItem('fc_user', JSON.stringify(user));

        setSuccessMessage('Account registered successfully! Redirecting to workspace...');

        setTimeout(() => {
          if (role === 'FARMER') {
            router.push('/farmer/dashboard');
          } else {
            router.push('/consumer/explore');
          }
        }, 1000);
      } else {
        setSuccessMessage('Registration completed! Please sign in.');
        setTimeout(() => {
          router.push('/login');
        }, 1200);
      }
    } catch (err: any) {
      // Handles duplicate account 400 response cleanly without throwing uncaught exceptions
      const msg = err?.data?.message || err?.message || 'Registration failed. Please verify your details.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-3xl border border-stone-200 max-w-lg w-full p-6 sm:p-10 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-2">
            <Sprout className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">
            Create FarmConnect Account
          </h1>
          <p className="text-xs text-stone-500">
            Join Karnataka's direct farmer-to-consumer agricultural network.
          </p>
        </div>

        {/* Role Picker */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-stone-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setRole('FARMER')}
            className={`py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              role === 'FARMER'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Sprout className="w-4 h-4" /> Cultivator (Farmer)
          </button>
          <button
            type="button"
            onClick={() => setRole('CONSUMER')}
            className={`py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              role === 'CONSUMER'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> Buyer (Consumer)
          </button>
        </div>

        {/* Inline Alerts */}
        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-red-700 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase text-stone-700 block mb-1">
              Full Legal Name *
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Ramesh Kumar"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase text-stone-700 block mb-1">
                Mobile Number *
              </label>
              <input
                type="tel"
                name="phone"
                required
                maxLength={10}
                placeholder="10-digit number"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-stone-700 block mb-1">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                placeholder="Optional"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase text-stone-700 block mb-1">
              Account Password *
            </label>
            <input
              type="password"
              name="password"
              required
              placeholder="Minimum 6 characters"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Cultivator-Specific Fields */}
          {role === 'FARMER' && (
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Cultivator Farm Profile
              </span>

              <div>
                <label className="text-[11px] font-bold uppercase text-stone-700 block mb-1">
                  Farm or Estate Name *
                </label>
                <input
                  type="text"
                  name="farmName"
                  required={role === 'FARMER'}
                  placeholder="e.g. Mandya Green Valley Farm"
                  value={formData.farmName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold uppercase text-stone-700 block mb-1">District</label>
                  <select
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="Mandya">Mandya</option>
                    <option value="Mysuru">Mysuru</option>
                    <option value="Hassan">Hassan</option>
                    <option value="Bengaluru Urban">Bengaluru Urban</option>
                    <option value="Bengaluru Rural">Bengaluru Rural</option>
                    <option value="Kolar">Kolar</option>
                    <option value="Tumakuru">Tumakuru</option>
                    <option value="Chikkamagaluru">Chikkamagaluru</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-stone-700 block mb-1">State</label>
                  <input
                    type="text"
                    disabled
                    value="Karnataka"
                    className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-xl text-xs font-semibold text-stone-500"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>

        <p className="text-center text-xs text-stone-500 font-medium">
          Already registered?{' '}
          <Link href="/login" className="text-emerald-800 font-bold hover:underline">
            Sign In here
          </Link>
        </p>

      </div>
    </div>
  );
}