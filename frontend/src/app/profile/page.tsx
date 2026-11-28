'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut, Save, Loader2, AlertCircle, CheckCircle2, MapPin, Phone, Mail } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../hooks/useI18n';
import { LOCALES, LOCALE_META, Locale } from '../../i18n/types';

/**
 * The account of the signed-in visitor.
 *
 * The shared backend owns the account (`GET /api/users/me`,
 * `PATCH /api/users/me`). The page reads the account from the backend —
 * not from the copy in the browser — and writes the changes back to it.
 * A change that the backend refused is reported as refused.
 */
export default function ProfilePage() {
  const { t, locale, setLocale } = useI18n();
  const { user, logout, refreshUser } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [farmName, setFarmName] = useState('');
  const [language, setLanguage] = useState<Locale>(locale);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');

  const isFarmer = user?.role === 'FARMER';

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res: any = await fetchApi('/users/me');
      const profile = res?.data || res?.user || res;
      if (!profile) {
        throw new Error(t('misc.profile.loadError'));
      }
      setName(profile.name || '');
      setPhone(profile.phone || '');
      setEmail(profile.email || '');
      setRole(profile.role || '');
      setDistrict(
        profile.farmerProfile?.district ||
          profile.consumerProfile?.district ||
          profile.district ||
          ''
      );
      setAddress(
        profile.consumerProfile?.deliveryAddress ||
          profile.farmerProfile?.addressLine ||
          ''
      );
      setFarmName(profile.farmerProfile?.farmName || '');
      const stored = profile.preferredLanguage;
      if (stored === 'en' || stored === 'kn' || stored === 'hi') {
        setLanguage(stored);
      }
    } catch (err: any) {
      console.warn('Failed to load the profile:', err?.message);
      setErrorMessage(err?.message || t('misc.profile.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload: Record<string, string> = {
        name: name.trim(),
        phone: phone.trim(),
        district: district.trim(),
      };
      if (isFarmer) {
        if (farmName.trim()) payload.farmName = farmName.trim();
        if (address.trim()) payload.addressLine = address.trim();
      } else if (address.trim()) {
        payload.deliveryAddress = address.trim();
      }

      const res: any = await fetchApi('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      const saved = res?.data || res?.user || res;
      if (!saved) {
        throw new Error(t('misc.profile.saveError'));
      }

      // The language of the account is written by the language switcher
      // itself — it keeps the interface and the account in step.
      setSuccessMessage(t('misc.profile.saved'));
      refreshUser();
      await loadProfile();
    } catch (err: any) {
      console.warn('Failed to save the profile:', err?.message);
      setErrorMessage(err?.message || t('misc.profile.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageChange = async (next: Locale) => {
    setLanguage(next);
    // The switcher writes the choice to the shared account, so the other
    // client adopts it as well.
    setLocale(next, { sync: true });
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-stone-500 font-bold text-sm">
        <Loader2 className="w-7 h-7 animate-spin mx-auto mb-3" />
        {t('misc.profile.loading')}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight flex items-center gap-3">
            <User className="w-7 h-7 text-emerald-700" />
            {t('misc.profile.title')}
          </h1>
          <p className="text-stone-600 text-sm mt-1">{t('misc.profile.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 self-start px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> {t('nav.signOut')}
        </button>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold">{successMessage}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <section className="bg-white rounded-3xl border border-stone-200 p-6 space-y-4">
          <h2 className="text-base font-black text-stone-900">{t('misc.profile.accountSection')}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-bold text-stone-600">{t('misc.profile.name')}</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={2}
                className="mt-1 w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm font-semibold text-stone-800 focus:outline-none focus:border-emerald-500"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-stone-600">{t('misc.profile.phone')}</span>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
                minLength={10}
                className="mt-1 w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm font-semibold text-stone-800 focus:outline-none focus:border-emerald-500"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-stone-600">{t('misc.profile.district')}</span>
              <input
                type="text"
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm font-semibold text-stone-800 focus:outline-none focus:border-emerald-500"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-stone-600">
                {t('misc.profile.language')}
              </span>
              <select
                value={language}
                onChange={(event) => handleLanguageChange(event.target.value as Locale)}
                className="mt-1 w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm font-semibold text-stone-800 focus:outline-none focus:border-emerald-500 bg-white"
              >
                {LOCALES.map((code) => (
                  <option key={code} value={code}>
                    {LOCALE_META[code].nativeName}
                  </option>
                ))}
              </select>
            </label>

            {isFarmer ? (
              <>
                <label className="block">
                  <span className="text-xs font-bold text-stone-600">
                    {t('misc.profile.farmName')}
                  </span>
                  <input
                    type="text"
                    value={farmName}
                    onChange={(event) => setFarmName(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm font-semibold text-stone-800 focus:outline-none focus:border-emerald-500"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-bold text-stone-600">
                    {t('misc.profile.farmAddress')}
                  </span>
                  <textarea
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm font-semibold text-stone-800 focus:outline-none focus:border-emerald-500"
                  />
                </label>
              </>
            ) : (
              <label className="block sm:col-span-2">
                <span className="text-xs font-bold text-stone-600">
                  {t('misc.profile.deliveryAddress')}
                </span>
                <textarea
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm font-semibold text-stone-800 focus:outline-none focus:border-emerald-500"
                />
              </label>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {t('misc.profile.save')}
          </button>
        </section>

        <section className="bg-stone-50 rounded-3xl border border-stone-200 p-6 space-y-3">
          <h2 className="text-base font-black text-stone-900">{t('misc.profile.readOnlySection')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2 text-stone-600">
              <Mail className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="truncate font-semibold">{email || '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-stone-600">
              <Phone className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="font-semibold">{phone || '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-stone-600">
              <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="font-semibold">{district || '—'}</span>
            </div>
          </div>
          <p className="text-[11px] text-stone-400 font-semibold">
            {t('misc.profile.roleLabel', { role: role || '—' })}
          </p>
        </section>
      </form>
    </div>
  );
}
