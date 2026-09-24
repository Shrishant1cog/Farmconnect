'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Edit3, AlertCircle } from 'lucide-react';
import CropImageUpload from '../ui/CropImageUpload';
import { fetchApi } from '../../lib/api';

interface EditCropModalProps {
  crop: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: any) => void;
}

export default function EditCropModal({ crop, isOpen, onClose, onSuccess }: EditCropModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    farmerPrice: '',
    priceUnit: 'PER_KG',
    quantityAvailable: '',
    quantityUnit: 'KG',
    isOrganic: false,
    imageUrl: '',
  });

  // Synchronize form values whenever a different crop is selected or the modal is opened
  useEffect(() => {
    if (crop && isOpen) {
      setFormData({
        title: crop.title || '',
        description: crop.description || '',
        farmerPrice: crop.farmerPrice?.toString() || '',
        priceUnit: crop.priceUnit || 'PER_KG',
        quantityAvailable: crop.quantityAvailable?.toString() || '',
        quantityUnit: crop.quantityUnit || 'KG',
        isOrganic: Boolean(crop.isOrganic),
        imageUrl: crop.imageUrl || '',
      });
      setError(null);
    }
  }, [crop, isOpen]);

  if (!isOpen || !crop) return null;

  const handleClose = () => {
    if (loading) return;
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const priceNum = parseFloat(formData.farmerPrice);
    const quantityNum = parseFloat(formData.quantityAvailable);

    if (!formData.title.trim()) {
      setError('Please provide a produce title.');
      return;
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Please enter a valid price greater than zero.');
      return;
    }

    if (isNaN(quantityNum) || quantityNum < 0) {
      setError('Please enter a valid stock quantity (0 or greater).');
      return;
    }

    setLoading(true);

    try {
      // 1. Resolve auth token safely across both storage conventions
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

      // 2. Perform update using fetchApi with resilient fallback
      let json: any;
      try {
        json = await fetchApi(`/products/${crop.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } catch {
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
        const res = await fetch(`${baseUrl}/products/${crop.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        json = await res.json();
      }

      if (json?.success || json?.id || json?.data) {
        const updatedData = json?.data || json?.product || { ...crop, ...payload };
        onSuccess(updatedData);
        onClose();
      } else {
        setError(json?.message || 'Failed to update harvest lot.');
      }
    } catch (err: any) {
      console.error('Update crop failure:', err);
      setError(err?.message || 'Network error updating harvest lot.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-stone-200 max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-stone-900">Edit Crop Harvest Details</h2>
              <p className="text-xs text-stone-500">Update pricing, stock availability, or refresh crop photos.</p>
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

        {/* Error Alert */}
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

          {/* Produce Name */}
          <div>
            <label className="text-xs font-bold uppercase text-stone-700 block mb-1">
              Produce Name *
            </label>
            <input
              type="text"
              required
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
                <option value="PER_KG">Per Kg</option>
                <option value="PER_QUINTAL">Per Quintal (100 Kg)</option>
                <option value="PER_TON">Per Tonne</option>
                <option value="PER_DOZEN">Per Dozen</option>
              </select>
            </div>
          </div>

          {/* Stock Availability Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-stone-700 block mb-1">
                Available Stock *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                required
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
                <option value="KG">Kg</option>
                <option value="QUINTAL">Quintal</option>
                <option value="TON">Tonne</option>
                <option value="CRATES">Crates</option>
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
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}