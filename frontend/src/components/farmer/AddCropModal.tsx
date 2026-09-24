'use client';

import React, { useState } from 'react';
import { X, Sprout, Loader2, AlertCircle } from 'lucide-react';
import CropImageUpload from '../ui/CropImageUpload';
import { fetchApi } from '../../lib/api';

interface AddCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const INITIAL_FORM_STATE = {
  title: '',
  description: '',
  farmerPrice: '',
  priceUnit: 'PER_KG',
  quantityAvailable: '',
  quantityUnit: 'KG',
  isOrganic: false,
  imageUrl: '',
};

export default function AddCropModal({ isOpen, onClose, onSuccess }: AddCropModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  if (!isOpen) return null;

  const handleClose = () => {
    if (loading) return;
    setError(null);
    setFormData(INITIAL_FORM_STATE);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const priceNum = parseFloat(formData.farmerPrice);
    const quantityNum = parseFloat(formData.quantityAvailable);

    if (!formData.title.trim()) {
      setError('Please provide a crop or produce title.');
      return;
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Please enter a valid price greater than zero.');
      return;
    }

    if (isNaN(quantityNum) || quantityNum <= 0) {
      setError('Please enter a valid available stock quantity.');
      return;
    }

    setLoading(true);

    try {
      // 1. Resolve token safely across both auth schemes
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('farmconnect_token') || localStorage.getItem('fc_token')
          : null;

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        farmerPrice: priceNum,
        priceUnit: formData.priceUnit,
        quantityAvailable: quantityNum,
        quantityUnit: formData.quantityUnit,
        isOrganic: Boolean(formData.isOrganic),
        imageUrl: formData.imageUrl || '',
      };

      // 2. Route through centralized fetchApi with fallback
      let json: any;
      try {
        json = await fetchApi('/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } catch {
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
        const res = await fetch(`${baseUrl}/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        json = await res.json();
      }

      if (json?.success || json?.id || json?.data) {
        setFormData(INITIAL_FORM_STATE);
        onSuccess();
        onClose();
      } else {
        setError(json?.message || 'Failed to list harvest lot. Please try again.');
      }
    } catch (err: any) {
      console.error('Add crop listing failure:', err);
      setError(err?.message || 'Network error while publishing harvest lot.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-stone-200 max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-stone-900">List New Harvest Produce</h2>
              <p className="text-xs text-stone-500">Publish your crop for direct whole-lot wholesale purchasing.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:bg-stone-100 rounded-full text-stone-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Feedback Banner */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-red-700 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Universal Image Uploader Field */}
          <CropImageUpload
            value={formData.imageUrl}
            onChange={(url) => setFormData((prev) => ({ ...prev, imageUrl: url }))}
          />

          {/* Crop Title */}
          <div>
            <label className="text-xs font-bold uppercase text-stone-700 block mb-1">
              Crop / Produce Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Native Robusta Bananas (Yellaki Bale)"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
            />
          </div>

          {/* Harvest Description */}
          <div>
            <label className="text-xs font-bold uppercase text-stone-700 block mb-1">
              Description & Quality Notes
            </label>
            <textarea
              rows={2}
              placeholder="Describe variety, freshness, harvesting date, packaging condition..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none resize-none"
            />
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-stone-700 block mb-1">
                Farmer Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="₹ Rate"
                value={formData.farmerPrice}
                onChange={(e) => setFormData((prev) => ({ ...prev, farmerPrice: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-stone-700 block mb-1">Price Unit</label>
              <select
                value={formData.priceUnit}
                onChange={(e) => setFormData((prev) => ({ ...prev, priceUnit: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none bg-white"
              >
                <option value="PER_KG">Per Kilogram (Kg)</option>
                <option value="PER_QUINTAL">Per Quintal (100 Kg)</option>
                <option value="PER_TON">Per Tonne</option>
                <option value="PER_DOZEN">Per Dozen</option>
              </select>
            </div>
          </div>

          {/* Stock Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-stone-700 block mb-1">
                Stock Available *
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                placeholder="Total Stock"
                value={formData.quantityAvailable}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantityAvailable: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-stone-700 block mb-1">Stock Unit</label>
              <select
                value={formData.quantityUnit}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantityUnit: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold focus:ring-2 focus:ring-emerald-600 outline-none bg-white"
              >
                <option value="KG">Kilograms (Kg)</option>
                <option value="QUINTAL">Quintals</option>
                <option value="TON">Tonnes</option>
                <option value="CRATES">Crates / Boxes</option>
              </select>
            </div>
          </div>

          {/* Organic Produce Toggle */}
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={formData.isOrganic}
              onChange={(e) => setFormData((prev) => ({ ...prev, isOrganic: e.target.checked }))}
              className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500"
            />
            <span className="text-xs font-bold text-stone-700">Certified 100% Organic Produce</span>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-transform active:scale-95 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Publish Crop Harvest
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}