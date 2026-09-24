'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Sprout, 
  ShoppingBag, 
  User, 
  Phone, 
  Mail, 
  Lock, 
  MapPin, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  Navigation, 
  CheckCircle2, 
  HelpCircle, 
  Eye, 
  EyeOff, 
  Info, 
  Check,
  Building2
} from 'lucide-react';
import { fetchApi } from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';

// All 28 States and 8 Union Territories of India
const ALL_INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

export default function RegisterPage() {
  const auth = useAuth() as any;

  // Account Type
  const [role, setRole] = useState<'CONSUMER' | 'FARMER'>('FARMER');

  // Identity Credentials
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [farmName, setFarmName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Location & Address States
  const [pincode, setPincode] = useState('');
  const [stateName, setStateName] = useState('Karnataka');
  const [district, setDistrict] = useState('Mandya');
  const [taluk, setTaluk] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>({
    lat: 12.5218,
    lng: 76.8951,
  });

  // Dynamic Suggestion Lists
  const [talukSuggestions, setTalukSuggestions] = useState<string[]>([]);
  const [districtSuggestions, setDistrictSuggestions] = useState<string[]>([
    'Mandya', 'Mysuru', 'Hassan', 'Bengaluru Urban', 'Bengaluru Rural', 
    'Kolar', 'Tumakuru', 'Chikkamagaluru', 'Shivamogga', 'Belagavi'
  ]);

  // Dropdown Visibility Toggles
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const [showTalukDropdown, setShowTalukDropdown] = useState(false);

  // Map Publishing Consent & Benefits Accordion
  const [allowMapPublishing, setAllowMapPublishing] = useState(true);
  const [showMapBenefits, setShowMapBenefits] = useState(false);

  // Operational & Transition States
  const [fetchingPincode, setFetchingPincode] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('Setting up your verified agricultural profile...');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filtered State Suggestions
  const filteredStates = useMemo(() => {
    if (!stateName.trim()) return ALL_INDIA_STATES.slice(0, 8);
    return ALL_INDIA_STATES.filter((s) =>
      s.toLowerCase().includes(stateName.toLowerCase())
    );
  }, [stateName]);

  // Filtered District Suggestions
  const filteredDistricts = useMemo(() => {
    if (!district.trim()) return districtSuggestions;
    return districtSuggestions.filter((d) =>
      d.toLowerCase().includes(district.toLowerCase())
    );
  }, [district, districtSuggestions]);

  // Filtered Taluk Suggestions
  const filteredTaluks = useMemo(() => {
    if (!taluk.trim()) return talukSuggestions;
    return talukSuggestions.filter((t) =>
      t.toLowerCase().includes(taluk.toLowerCase())
    );
  }, [taluk, talukSuggestions]);

  // 1. Auto-fill from 6-digit PIN Code lookup
  const handlePincodeChange = async (value: string) => {
    const sanitized = value.replace(/\D/g, '').slice(0, 6);
    setPincode(sanitized);

    if (sanitized.length === 6) {
      setFetchingPincode(true);
      setError(null);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${sanitized}`);
        const data = await res.json();

        if (data && data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
          const offices = data[0].PostOffice;
          const primary = offices[0];

          if (primary.State) setStateName(primary.State);
          if (primary.District) setDistrict(primary.District);

          const primaryTaluk = 
            (primary.Taluk && primary.Taluk !== 'NA' ? primary.Taluk : '') ||
            (primary.Block && primary.Block !== 'NA' ? primary.Block : '') ||
            primary.Name || '';
          setTaluk(primaryTaluk);

          const uniqueTaluks = Array.from(
            new Set(
              offices
                .map((o: any) => (o.Taluk !== 'NA' ? o.Taluk : o.Block !== 'NA' ? o.Block : o.Name))
                .filter(Boolean)
            )
          ) as string[];
          setTalukSuggestions(uniqueTaluks);

          const uniqueDistricts = Array.from(
            new Set(offices.map((o: any) => o.District).filter(Boolean))
          ) as string[];
          setDistrictSuggestions(uniqueDistricts);
        } else {
          setError('PIN code details not found automatically. Please enter your State and District manually.');
        }
      } catch {
        // Fallback for offline or throttled postal API
      } finally {
        setFetchingPincode(false);
      }
    }
  };

  // 2. GPS Reverse Geocoding via OpenStreetMap Nominatim
  const handleDetectLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    setDetectingGps(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoordinates({ lat, lng });

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
          );
          const data = await res.json();

          if (data && data.address) {
            const addr = data.address;

            if (addr.postcode) {
              const cleanedPin = addr.postcode.replace(/\D/g, '').slice(0, 6);
              if (cleanedPin.length === 6) {
                setPincode(cleanedPin);
              }
            }

            if (addr.state) {
              setStateName(addr.state);
            }

            const detectedDistrict = 
              addr.state_district || addr.district || addr.county || '';
            if (detectedDistrict) {
              const cleanDist = detectedDistrict.replace(/ District/i, '').trim();
              setDistrict(cleanDist);
              setDistrictSuggestions((prev) => Array.from(new Set([cleanDist, ...prev])));
            }

            const detectedTaluk = 
              addr.subdistrict || addr.county || addr.town || addr.city_district || addr.tehsil || addr.taluk || '';
            if (detectedTaluk) {
              const cleanTaluk = detectedTaluk.replace(/ Taluk| Tehsil| Sub-District/i, '').trim();
              setTaluk(cleanTaluk);
              setTalukSuggestions((prev) => Array.from(new Set([cleanTaluk, ...prev])));
            }

            const detectedVillage = [
              addr.road || addr.suburb || addr.neighbourhood,
              addr.village || addr.hamlet || addr.town || addr.city
            ].filter(Boolean).join(', ');

            if (detectedVillage) {
              setAddressLine(detectedVillage);
            }
          }
        } catch {
          // Keep coordinates intact if reverse lookup fails
        } finally {
          setDetectingGps(false);
        }
      },
      () => {
        setDetectingGps(false);
        setError('Location permission was denied. You can enter your details manually.');
      },
      { timeout: 15000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please provide a valid 10-digit mobile number.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    if (!pincode || !stateName || !district) {
      setError('Please provide your PIN code, State, and District.');
      return;
    }

    if (role === 'FARMER' && !farmName.trim()) {
      setError('Please provide your Farm or Estate name.');
      return;
    }

    setLoading(true);
    setLoadingStep('Configuring your direct agricultural exchange profile...');

    const cleanEmail = email.trim().toLowerCase();

    const payload: Record<string, any> = {
      name: name.trim(),
      phone: cleanPhone.slice(-10),
      email: cleanEmail || undefined,
      password: password.trim(),
      role,
      pincode: pincode.trim(),
      state: stateName.trim(),
      district: district.trim(),
      taluk: taluk.trim() || district.trim(),
      addressLine: addressLine.trim() || `${district.trim()}, ${stateName.trim()}`,
      latitude: coordinates?.lat ?? 12.5218,
      longitude: coordinates?.lng ?? 76.8951,
      showOnMap: Boolean(allowMapPublishing),
    };

    if (role === 'FARMER') {
      payload.farmName = farmName.trim() || `${name.trim()}'s Farm`;
    }

    try {
      const res = await fetchApi('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const token = res?.token || res?.data?.token;
      const user = res?.user || res?.data?.user;

      if (token) {
        const assignedRole = (user?.role || role).toUpperCase();

        // 1. Synchronize Cookies for Next.js Middleware
        if (typeof document !== 'undefined') {
          const cookieOpts = '; path=/; max-age=604800; SameSite=Lax';
          document.cookie = `token=${token}${cookieOpts}`;
          document.cookie = `fc_token=${token}${cookieOpts}`;
          document.cookie = `farmconnect_token=${token}${cookieOpts}`;
          document.cookie = `farmconnect_role=${assignedRole}${cookieOpts}`;
          document.cookie = `role=${assignedRole}${cookieOpts}`;
        }

        // 2. Synchronize LocalStorage for Client-Side Hydration
        const finalUser = user || {
          id: `usr_${Date.now()}`,
          email: cleanEmail,
          name: name.trim(),
          phone: cleanPhone,
          role: assignedRole,
          district: district.trim(),
          state: stateName.trim(),
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem('farmconnect_token', token);
          localStorage.setItem('fc_token', token);
          localStorage.setItem('farmconnect_role', assignedRole);
          localStorage.setItem('fc_user', JSON.stringify(finalUser));
          localStorage.setItem('farmconnect_user', JSON.stringify(finalUser));
        }

        if (typeof auth?.login === 'function') {
          try {
            auth.login(token, finalUser);
          } catch {
            // Optional auth context synchronization
          }
        }

        setLoadingStep('Launching portal workspace...');
        setSuccessMessage('Account registered successfully! Redirecting...');

        setTimeout(() => {
          window.location.href = assignedRole === 'FARMER' ? '/farmer/dashboard' : '/consumer/explore';
        }, 800);
      } else {
        setSuccessMessage('Registration completed! Redirecting to sign in...');
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      }
    } catch (err: any) {
      console.error('Registration failed:', err);
      const rawMsg = err?.data?.message || err?.message || '';

      if (rawMsg.includes('Failed to fetch') || err?.name === 'TypeError') {
        setError('Unable to reach the server. Please verify your backend server is running on port 5000 (`npm run dev` in the backend directory).');
      } else {
        setError(rawMsg || 'Registration failed. Please check your entries and try again.');
      }
      setLoading(false);
    }
  };

  return (
    <>
      {/* Full-Screen Loading Barrier with Animated Circular Indicators */}
      {loading && (
        <div className="fixed inset-0 z-[100] bg-stone-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 transition-all duration-300 animate-in fade-in">
          <div className="relative flex items-center justify-center mb-6">
            <div className="w-24 h-24 rounded-3xl bg-emerald-500/20 animate-ping absolute" />
            <div className="w-20 h-20 rounded-2xl bg-emerald-800 border border-emerald-500/40 flex items-center justify-center shadow-2xl relative z-10 transition-transform duration-300">
              <Loader2 className="w-10 h-10 text-emerald-300 animate-spin" />
            </div>
          </div>
          <div className="text-center space-y-2 max-w-sm">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700 text-emerald-400 text-[11px] font-black uppercase tracking-wider">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {role === 'FARMER' ? 'Cultivator Node Provisioning' : 'Buyer Setup'}
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              {loadingStep}
            </h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              Configuring your direct exchange credentials and map permissions.
            </p>
          </div>
        </div>
      )}

      {/* Main Registration Form Shell */}
      <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 transition-all duration-300">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-stone-200/90 shadow-2xl max-w-xl w-full p-6 sm:p-10 space-y-6 transition-all duration-300">
          
          {/* Header */}
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-950/20 transition-transform duration-300 hover:scale-105">
              <Sprout className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight pt-2">
              Create Your Account
            </h1>
            <p className="text-xs text-stone-500 font-medium">
              Direct all-India cultivator and wholesale exchange.
            </p>
          </div>

          {/* Role Switcher */}
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-stone-100 rounded-2xl border border-stone-200">
            <button
              type="button"
              onClick={() => { setRole('FARMER'); setError(null); }}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all duration-200 ${
                role === 'FARMER'
                  ? 'bg-emerald-800 text-white shadow-md scale-[1.02]'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <Sprout className={`w-4 h-4 ${role === 'FARMER' ? 'text-white' : 'text-stone-400'}`} />
              <span>Cultivator / Farmer</span>
            </button>

            <button
              type="button"
              onClick={() => { setRole('CONSUMER'); setError(null); }}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black transition-all duration-200 ${
                role === 'CONSUMER'
                  ? 'bg-emerald-800 text-white shadow-md scale-[1.02]'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <ShoppingBag className={`w-4 h-4 ${role === 'CONSUMER' ? 'text-white' : 'text-stone-400'}`} />
              <span>Buyer / Consumer</span>
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-xs text-red-700 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span className="font-semibold leading-relaxed">{error}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-800 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold leading-relaxed">{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Full Legal Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder={role === 'FARMER' ? 'e.g. Ramesh Kumar' : 'e.g. Priya Sharma'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600 transition-all duration-200"
                />
              </div>
            </div>

            {/* Farm or Estate Name (Cultivator Only) */}
            {role === 'FARMER' && (
              <div className="animate-in fade-in duration-200">
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Farm or Estate Name *
                </label>
                <div className="relative">
                  <Sprout className="w-4 h-4 text-emerald-700 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mandya Green Valley Organic Farm"
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-emerald-50/40 border border-emerald-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600 transition-all duration-200"
                  />
                </div>
              </div>
            )}

            {/* Mobile (Mandatory) & Email (Optional) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Mobile Number *
                </label>
                <div className="relative flex">
                  <span className="px-3 py-2.5 bg-stone-100 border border-stone-200 border-r-0 rounded-l-xl text-xs font-bold text-stone-600 flex items-center">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-r-xl text-xs font-semibold text-stone-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600 transition-all duration-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Email Address <span className="text-stone-400 text-[10px] lowercase font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="optional@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600 transition-all duration-200"
                  />
                </div>
              </div>
            </div>

            {/* Location, Pincode & Predictive Region Module */}
            <div className="p-4 bg-stone-50/90 rounded-2xl border border-stone-200 space-y-3 transition-all duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700" /> Location Details
                </span>
                
                {/* GPS Trigger Button */}
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={detectingGps}
                  className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-xs transition-all duration-150 active:scale-95"
                  title="Detect and auto-fill address from GPS coordinates"
                >
                  {detectingGps ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                  ) : (
                    <Navigation className="w-3.5 h-3.5 text-emerald-700" />
                  )}
                  <span>{coordinates ? 'GPS Attached' : 'Detect via GPS'}</span>
                </button>
              </div>

              {/* Row 1: PIN Code & State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* PIN Code */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    PIN Code *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="e.g. 571401"
                      value={pincode}
                      maxLength={6}
                      onChange={(e) => handlePincodeChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-black text-stone-900 outline-none focus:ring-2 focus:ring-emerald-600 transition-all duration-150"
                    />
                    {fetchingPincode && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700 absolute right-2.5 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                </div>

                {/* State with predictive autocomplete */}
                <div className="relative">
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Type state..."
                    value={stateName}
                    onFocus={() => setShowStateDropdown(true)}
                    onChange={(e) => {
                      setStateName(e.target.value);
                      setShowStateDropdown(true);
                    }}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-600 transition-all duration-150"
                  />
                  {showStateDropdown && filteredStates.length > 0 && (
                    <div 
                      className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-xl max-h-44 overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
                      onMouseLeave={() => setShowStateDropdown(false)}
                    >
                      {filteredStates.map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            setStateName(st);
                            setShowStateDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-stone-800 hover:bg-emerald-50 hover:text-emerald-900 flex items-center justify-between transition-colors"
                        >
                          <span>{st}</span>
                          {stateName === st && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: District & Taluk with predictive autocomplete */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* District */}
                <div className="relative">
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    District *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mandya"
                    value={district}
                    onFocus={() => setShowDistrictDropdown(true)}
                    onChange={(e) => {
                      setDistrict(e.target.value);
                      setShowDistrictDropdown(true);
                    }}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-600 transition-all duration-150"
                  />
                  {showDistrictDropdown && filteredDistricts.length > 0 && (
                    <div 
                      className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-xl max-h-36 overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
                      onMouseLeave={() => setShowDistrictDropdown(false)}
                    >
                      {filteredDistricts.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setDistrict(d);
                            setShowDistrictDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-stone-800 hover:bg-emerald-50 hover:text-emerald-900 flex items-center justify-between transition-colors"
                        >
                          <span>{d}</span>
                          {district === d && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Taluk / Tehsil */}
                <div className="relative">
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Taluk / Tehsil
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pandavapura"
                    value={taluk}
                    onFocus={() => setShowTalukDropdown(true)}
                    onChange={(e) => {
                      setTaluk(e.target.value);
                      setShowTalukDropdown(true);
                    }}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-600 transition-all duration-150"
                  />
                  {showTalukDropdown && filteredTaluks.length > 0 && (
                    <div 
                      className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-xl max-h-36 overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
                      onMouseLeave={() => setShowTalukDropdown(false)}
                    >
                      {filteredTaluks.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setTaluk(t);
                            setShowTalukDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-medium text-stone-800 hover:bg-emerald-50 hover:text-emerald-900 flex items-center justify-between transition-colors"
                        >
                          <span>{t}</span>
                          {taluk === t && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3: Street Address / Village */}
              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                  Street / Village / Landmark
                </label>
                <input
                  type="text"
                  placeholder="Plot/Door No, Village or Landmark"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-600 transition-all duration-150"
                />
              </div>
            </div>

            {/* Map Consent & Transparency Card */}
            <div className="p-4 bg-emerald-950 text-white rounded-2xl space-y-2 border border-emerald-900 shadow-sm transition-all duration-200">
              <div className="flex items-start justify-between gap-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowMapPublishing}
                    onChange={(e) => setAllowMapPublishing(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-emerald-500 rounded border-emerald-700 bg-emerald-900 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-xs font-black text-white block">
                      {role === 'FARMER'
                        ? 'Show my farm location on the Public Farm Map'
                        : 'Enable regional location discovery on the Delivery Map'}
                    </span>
                    <span className="text-[10px] text-stone-300 block mt-0.5">
                      Your location will only appear on the map with your explicit consent.
                    </span>
                  </div>
                </label>

                <button
                  type="button"
                  onClick={() => setShowMapBenefits(!showMapBenefits)}
                  className="p-1 rounded-lg text-emerald-400 hover:text-white transition-colors"
                  title="View benefits"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>

              {/* Benefits Disclosure Accordion */}
              {showMapBenefits && (
                <div className="pt-2.5 border-t border-emerald-800/80 text-[11px] text-stone-200 space-y-1.5 animate-in fade-in duration-150">
                  <p className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" /> Why show your location on the map?
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-stone-300">
                    <li><strong>Direct Farm Gate Pickups:</strong> Verified institutional buyers and local families can route directly to you for fresh produce.</li>
                    <li><strong>Zero Middleman Transport Fees:</strong> Accurate road distance eliminates speculative freight markup.</li>
                    <li><strong>Full Privacy Control:</strong> Exact door numbers or residential rooms are never displayed; map visibility can be modified anytime in settings.</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600 transition-all duration-200"
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

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/15 transition-all duration-200 active:scale-[0.98] pt-3"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  Create {role === 'FARMER' ? 'Cultivator' : 'Buyer'} Account <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Existing Member Redirection */}
          <div className="text-center pt-2 border-t border-stone-100">
            <p className="text-xs text-stone-500 font-medium">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-emerald-800 hover:text-emerald-900 font-bold underline decoration-emerald-800/40"
              >
                Sign In here
              </Link>
            </p>
          </div>

        </div>
      </div>
    </>
  );
}